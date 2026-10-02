# accounts/backends.py
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()


class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, email=None, **kwargs):
        lookup = email or username
        if not lookup or not password:
            return None
        try:
            user = User.objects.get(email__iexact=lookup.strip())
        except User.DoesNotExist:
            User().set_password(password)   # constant-time-ish
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
    