from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    """Manager for the custom User model, which logs in with an email address."""

    use_in_migrations = True

    def _create_user(self, email, username, password, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address.')
        if not username:
            raise ValueError('Users must have a username.')

        email = self.normalize_email(email)
        username = self.model.normalize_username(username)

        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, username=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        # Fall back to the local part of the email so callers may omit a username.
        username = username or self.normalize_email(email).split('@')[0]
        return self._create_user(email, username, password, **extra_fields)

    def create_superuser(self, email, username=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_verified', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        username = username or self.normalize_email(email).split('@')[0]
        return self._create_user(email, username, password, **extra_fields)

    def get_by_natural_key(self, email):
        """Make email lookups case-insensitive so logins are not case-sensitive."""
        return self.get(**{f'{self.model.USERNAME_FIELD}__iexact': email})
