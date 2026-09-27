from django.contrib import admin
from django.utils.html import format_html

from .models import (
    ExecutiveProfile, HealthScoreSnapshot, HealthAlert, Reading,
    CareTeamMember, UpcomingCare, MonitorFrequency, MonitorMetric
)
for m in (HealthScoreSnapshot, HealthAlert, Reading,
          CareTeamMember, UpcomingCare):
    admin.site.register(m)


@admin.register(ExecutiveProfile)
class ExecutiveProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "display_name",
        "user_email",
        "frequency",
        "metrics_count",
        "created_by",
        "created_at",
    )
    list_filter = ("frequency", "created_at")
    search_fields = (
        "name",
        "user_service__user__email",
        "user_service__user__first_name",
        "user_service__user__last_name",
    )
    readonly_fields = ("created_at", "updated_at", "metrics_preview")
    autocomplete_fields = ("user_service", "created_by")
    list_select_related = ("user_service__user", "created_by")
    ordering = ("-created_at",)

    fieldsets = (
        ("Ownership", {
            "fields": ("user_service", "created_by", "name")
        }),
        ("Monitoring", {
            "fields": ("monitoring", "metrics_preview", "frequency")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Name")
    def display_name(self, obj):
        return obj.name or obj.user_service.user.full_name

    @admin.display(description="Email")
    def user_email(self, obj):
        return obj.user_service.user.email

    @admin.display(description="# metrics")
    def metrics_count(self, obj):
        return len(obj.monitoring or [])

    @admin.display(description="Selected metrics")
    def metrics_preview(self, obj):
        if not obj.monitoring:
            return "—"
        label_map = dict(MonitorMetric.choices)
        items = [label_map.get(m, m) for m in obj.monitoring]
        return format_html(
            "{}", " • ".join(items)
        )

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        if db_field.name == "frequency":
            kwargs["choices"] = MonitorFrequency.choices
        return super().formfield_for_choice_field(db_field, request, **kwargs)
    