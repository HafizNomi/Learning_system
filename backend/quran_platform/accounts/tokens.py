from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """
    Signed, single-use token for confirming ownership of an email address.

    `is_verified` is part of the hash, so a token stops working the moment the
    address it was issued for has been confirmed.
    """

    key_salt = 'accounts.EmailVerificationTokenGenerator'

    def _make_hash_value(self, user, timestamp):
        return f'{user.pk}{user.email}{user.is_verified}{timestamp}'


email_verification_token = EmailVerificationTokenGenerator()
