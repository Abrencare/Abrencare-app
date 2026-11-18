from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        # Importing registers the @receiver hooks. Do not remove.
        from . import receivers  # noqa: F401