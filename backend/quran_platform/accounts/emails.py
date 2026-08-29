"""Transactional emails for the auth flows.

Every helper is best-effort: a broken SMTP configuration must never turn a
successful registration or password-reset request into a 500.
"""

import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
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


def _send(subject, message, recipient):
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=[recipient],
            fail_silently=False,
        )
        return True
    except Exception:  # noqa: BLE001 - never fail the request over email delivery
        logger.exception('Failed to send %r to %s', subject, recipient)
        return False


def send_email_verification(user):
    """Email the user a link that confirms their address."""
    uid = make_uid(user)
    token = email_verification_token.make_token(user)
    link = build_frontend_url('/verify-email', uid=uid, token=token)

    return _send(
        subject='Verify your email address',
        message=(
            f'Assalamu alaikum {user.get_full_name() or user.username},\n\n'
            'Welcome to the Quran Tutor Platform. Please confirm your email address '
            f'by opening the link below:\n\n{link}\n\n'
            'If you did not create this account you can safely ignore this email.'
        ),
        recipient=user.email,
    )


def send_password_reset(user):
    """Email the user a link that lets them choose a new password."""
    uid = make_uid(user)
    token = default_token_generator.make_token(user)
    link = build_frontend_url('/reset-password', uid=uid, token=token)

    return _send(
        subject='Reset your password',
        message=(
            f'Assalamu alaikum {user.get_full_name() or user.username},\n\n'
            'We received a request to reset your password. Open the link below to '
            f'choose a new one:\n\n{link}\n\n'
            'If you did not request a reset, no action is needed - your password '
            'stays unchanged.'
        ),
        recipient=user.email,
    )


def send_password_changed_notice(user):
    """Let the user know their password changed, so a hijack is noticed early."""
    return _send(
        subject='Your password was changed',
        message=(
            f'Assalamu alaikum {user.get_full_name() or user.username},\n\n'
            'The password on your Quran Tutor Platform account was just changed.\n\n'
            'If this was not you, please reset your password immediately and contact '
            'support@qurantutor.com.'
        ),
        recipient=user.email,
    )
