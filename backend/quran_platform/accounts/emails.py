"""Transactional emails for the auth flows.

Every helper is best-effort: a broken SMTP configuration must never turn a
successful registration or password-reset request into a 500.
"""

import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .tokens import email_verification_token

logger = logging.getLogger(__name__)


def build_frontend_url(path, **params):
    """Build an absolute URL into the SPA, e.g. /reset-password?uid=..&token=.."""
    base = getattr(settings, 'FRONTEND_URL', '').rstrip('/')
    url = f'{base}{path}'
    if params:
        query = '&'.join(f'{key}={value}' for key, value in params.items())
        url = f'{url}?{query}'
    return url


def make_uid(user):
    return urlsafe_base64_encode(force_bytes(user.pk))


SITE_NAME = 'Quran Tutor Platform'


def _send(subject, recipient, heading, paragraphs,
          facts=None, button_url=None, button_label=None, closing=None):
    """
    Render one email as both HTML and plain text, and send it.

    Both parts are always sent: some clients and some people block HTML, and a
    set-password link that only exists in the HTML part would strand them.
    The raw URL is printed under the button for the same reason.
    """
    context = {
        'subject': subject,
        'recipient': recipient,
        'site_name': SITE_NAME,
        'heading': heading,
        'paragraphs': paragraphs,
        'facts': facts or [],
        'button_url': button_url,
        'button_label': button_label or 'Open',
        'closing': closing or ['Jazak Allah khair.'],
    }

    try:
        text_body = render_to_string('emails/message.txt', context)
        html_body = render_to_string('emails/message.html', context)

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            to=[recipient],
        )
        email.attach_alternative(html_body, 'text/html')
        email.send(fail_silently=False)
        return True
    except Exception:  # noqa: BLE001 - never fail the request over email delivery
        logger.exception('Failed to send %r to %s', subject, recipient)
        return False


def set_password_link(user, new_account=True):
    """
    The link that lets someone choose their password.

    `new=1` tells the frontend this person has never had a password, so the
    page says "Create your password" rather than "Reset" - which is confusing
    wording for an account that was just made for you.
    """
    params = {'uid': make_uid(user), 'token': default_token_generator.make_token(user)}
    if new_account:
        params['new'] = '1'
    return build_frontend_url('/reset-password', **params)


def send_email_verification(user):
    """Email the user a link that confirms their address."""
    uid = make_uid(user)
    token = email_verification_token.make_token(user)
    link = build_frontend_url('/verify-email', uid=uid, token=token)
    name = user.get_full_name() or user.username

    return _send(
        subject='Verify your email address',
        recipient=user.email,
        heading='Confirm your email address',
        paragraphs=[
            f'Assalamu alaikum {name},',
            'Please confirm your email address so we know we can reach you.',
        ],
        button_url=link,
        button_label='Confirm my email',
        closing=['If you did not create this account you can safely ignore this email.'],
    )


def send_password_reset(user):
    """Email the user a link that lets them choose a new password."""
    name = user.get_full_name() or user.username

    return _send(
        subject='Reset your password',
        recipient=user.email,
        heading='Reset your password',
        paragraphs=[
            f'Assalamu alaikum {name},',
            'We received a request to reset your password. Use the button below to '
            'choose a new one. The link is valid for 24 hours.',
        ],
        button_url=set_password_link(user, new_account=False),
        button_label='Choose a new password',
        closing=[
            'If you did not request this, no action is needed - your password stays '
            'as it is.',
        ],
    )


def send_password_changed_notice(user):
    """Let the user know their password changed, so a hijack is noticed early."""
    name = user.get_full_name() or user.username

    return _send(
        subject='Your password was changed',
        recipient=user.email,
        heading='Your password was changed',
        paragraphs=[
            f'Assalamu alaikum {name},',
            'The password on your account was just changed.',
        ],
        closing=[
            'If this was not you, reset your password immediately and contact '
            'support@qurantutor.com.',
        ],
    )


def send_account_created(user, created_by_staff=True):
    """
    Someone - usually a teacher - has had an account made for them.

    They never chose a password, so the link is the only way in. The wording
    says "create", not "reset", because there is nothing to reset.
    """
    name = user.get_full_name() or user.username
    role = user.get_role_display()

    return _send(
        subject=f'Your {SITE_NAME} account is ready',
        recipient=user.email,
        heading='Your account is ready',
        paragraphs=[
            f'Assalamu alaikum {name},',
            f'An account has been created for you as a {role.lower()}. '
            'Choose a password below and you can sign in straight away.',
        ],
        facts=[('Email', user.email), ('Role', role)],
        button_url=set_password_link(user, new_account=True),
        button_label='Create my password',
        closing=[
            'If you were not expecting this, please contact us before using the link.',
        ],
    )


# ---------------------------------------------------------------------------
# Application lifecycle
# ---------------------------------------------------------------------------

def send_application_received(application):
    """Confirm to the parent that their application arrived."""
    return _send(
        subject='We received your application',
        recipient=application.parent_email,
        heading='We have your application',
        paragraphs=[
            f'Assalamu alaikum {application.parent_name},',
            f'Thank you for applying for {application.course.title} for '
            f'{application.student_name}. We will be in touch within 24 hours.',
        ],
        facts=[
            ('Student', application.student_name),
            ('Course', application.course.title),
            ('Reference', str(application.id)),
        ],
        closing=['Keep your reference in case you need to ask us about it.'],
    )


def send_application_approved(user, application, set_password=True):
    """
    Welcome the approved applicant and give them a way in.

    A new account is created with a random password nobody ever sees, so the
    link below is the only route to a usable login. Someone who already had an
    account keeps their existing password and is simply told to sign in.
    """
    teacher = application.assigned_teacher
    facts = [
        ('Student', application.student_name),
        ('Course', application.course.title),
    ]
    if teacher:
        facts.append(('Teacher', teacher.get_full_name() or teacher.username))
    if application.assigned_time_slot:
        facts.append(('Time slot', application.assigned_time_slot))
    facts.append(('Sign in with', user.email))

    if set_password:
        paragraphs = [
            f'Assalamu alaikum {application.parent_name},',
            f'Good news - {application.student_name} has been accepted onto '
            f'{application.course.title}.',
            'Create a password below to see the timetable and join classes.',
        ]
        button_url = set_password_link(user, new_account=True)
        button_label = 'Create my password'
    else:
        paragraphs = [
            f'Assalamu alaikum {application.parent_name},',
            f'Good news - {application.student_name} has been accepted onto '
            f'{application.course.title}.',
            'Sign in with your existing account to see the timetable and join classes.',
        ]
        button_url = build_frontend_url('/login')
        button_label = 'Sign in'

    return _send(
        subject=f'{application.student_name} has been accepted',
        recipient=application.parent_email,
        heading=f'{application.student_name} has a place',
        paragraphs=paragraphs,
        facts=facts,
        button_url=button_url,
        button_label=button_label,
    )


def send_application_rejected(application):
    """Tell the parent, and leave the door open."""
    return _send(
        subject='About your application',
        recipient=application.parent_email,
        heading='About your application',
        paragraphs=[
            f'Assalamu alaikum {application.parent_name},',
            f'Thank you for your interest in {application.course.title}. On this '
            'occasion we are not able to offer a place for '
            f'{application.student_name}.',
            'You are very welcome to apply again, or for one of our other courses. '
            'If you would like to talk it through, just reply to this email.',
        ],
    )
