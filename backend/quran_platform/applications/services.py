"""
Everything that must happen when an application changes status.

Both the API and the Django admin go through here, so approving in one place
can never do less than approving in the other. Approving through the admin
used to just save the row: no student account, no teacher check, no email -
leaving an application marked `approved` that nobody could log in to.
"""

import logging
import secrets

from django.contrib.auth import get_user_model

from accounts.emails import (
    send_application_approved,
    send_application_rejected,
)

logger = logging.getLogger(__name__)

User = get_user_model()


class ApprovalError(Exception):
    """The application is not in a state where it can be approved."""


def ensure_student_account(application):
    """
    Create, or link, the login the approved applicant will use.

    Returns (user, created). Idempotent: approving twice must not produce a
    second account, and must not reset the password of an existing one.
    """
    if application.student_id:
        return application.student, False

    user, created = User.objects.get_or_create(
        email=application.parent_email,
        defaults={
            'username': application.parent_email,
            'first_name': application.student_name,
            'role': 'student',
            'timezone': application.preferred_timezone or 'UTC',
        },
    )

    if created:
        # Nobody ever learns this password - the welcome email carries a
        # set-password link instead. It exists only so the account is not left
        # with an unusable password, which the reset flow would have to
        # special-case.
        user.set_password(secrets.token_urlsafe(32))
        user.save(update_fields=['password'])

    application.student = user
    application.save(update_fields=['student', 'updated_at'])
    return user, created


def approve(application, notify=True):
    """
    Finish an approval: create the login, then tell the parent how to use it.

    Raises ApprovalError if the application cannot be approved yet, so the
    caller can turn that into a 400 or an admin message rather than leaving a
    half-approved record behind.
    """
    if not application.assigned_teacher_id:
        raise ApprovalError('Assign a teacher before approving this application.')

    user, created = ensure_student_account(application)

    if notify:
        # A failed email must not undo the approval - the admin can resend.
        try:
            send_application_approved(user, application, set_password=created)
        except Exception:  # noqa: BLE001
            logger.exception('Approval email failed for application %s', application.id)

    return user, created


def reject(application, notify=True):
    if notify:
        try:
            send_application_rejected(application)
        except Exception:  # noqa: BLE001
            logger.exception('Rejection email failed for application %s', application.id)


def handle_status_change(application, new_status, notify=True):
    """
    Run whatever the new status requires. Unknown or unchanged statuses are a
    no-op, so callers can pass a status through without checking it first.
    """
    if new_status == 'approved':
        return approve(application, notify=notify)
    if new_status == 'rejected':
        reject(application, notify=notify)
    return None, False
