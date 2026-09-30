from django.contrib import admin
from .models import Service, Feature, UserService

@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'description', 'created_at']
    search_fields = ['name']
    list_filter = ['created_at']
    ordering = ['id']

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'service_for', 'description', 'created_at']
    search_fields = ['name', 'service_for']
    list_filter = ['created_at']
    ordering = ['id']

@admin.register(UserService)
class UserServiceAdmin(admin.ModelAdmin):
    list_display = ["service",
                "onboarded",
                "joined_at",
                "onboarded_at",]
    list_filter = ['joined_at']
    search_fields = (
        "user__email",
        "user__username",
        "user__first_name",
        "user__last_name",
        "service__name",
    )
    ordering = ['id']