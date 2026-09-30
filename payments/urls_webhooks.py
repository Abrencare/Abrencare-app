from django.urls import path

from .views_webhooks import telebirr_notify, telebirr_return

urlpatterns = [
    path("telebirr/notify/", telebirr_notify, name="telebirr-notify"),
    path("telebirr/return/", telebirr_return, name="telebirr-return"),
]