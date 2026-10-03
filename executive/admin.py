from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html

from .models import (
    CareTeamMember,
    EmergencyEvent,
    EmergencyTimelineStep,
    ExecutiveProfile,
    HealthAlert,
    HealthProgrammeItem,
    HealthScoreSnapshot,
    LabResult,
    Medication,
    MedicationAlert,
    MedicationSchedule,
    MonitorFrequency,
    MonitorMetric,
    Reading,
    UpcomingCare,
    WeeklyReport,
)


# ============================================================================
# SHARED ADMIN MIXINS
# ============================================================================

class AlertAdminMixin:
    """Consistent rendering for anything with resolved / resolved_at."""

    @admin.action(description="Mark selected as resolved")
    def mark_resolved(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(resolved=False).update(
            resolved=True, resolved_at=timezone.now(),
        )
        self.message_user(request, f"{updated} alert(s) resolved.")

    @admin.action(description="Mark selected as unresolved")
    def mark_unresolved(self, request, queryset):
        updated = queryset.filter(resolved=True).update(
            resolved=False, resolved_at=None,
        )
        self.message_user(request, f"{updated} alert(s) reopened.")

    actions = ("mark_resolved", "mark_unresolved")

    @admin.display(boolean=True, description="Resolved")
    def resolved_flag(self, obj):
        return obj.resolved


class SoftDeleteAdminMixin:
    """Filter active/deleted rows without cluttering default views."""

    @admin.action(description="Soft-delete selected")
    def soft_delete(self, request, queryset):
        count = 0
        for obj in queryset.filter(deleted_at__isnull=True):
            obj.soft_delete()
            count += 1
        self.message_user(request, f"{count} record(s) soft-deleted.")

    @admin.action(description="Restore selected")
    def restore(self, request, queryset):
        updated = queryset.filter(deleted_at__isnull=False).update(
            deleted_at=None,
        )
        self.message_user(request, f"{updated} record(s) restored.")

    def get_queryset(self, request):
        return self.model.objects.all()  # include deleted for admins

    def get_list_filter(self, request):
        base = super().get_list_filter(request)
        return (*base, "deleted_at") if base else ("deleted_at",)


# ============================================================================
# EXECUTIVE PROFILE
# ============================================================================

@admin.register(ExecutiveProfile)
class ExecutiveProfileAdmin(SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = (
        "id", "display_name", "user_email",
        "frequency", "metrics_count",
        "created_by", "created_at", "is_deleted",
    )
    list_filter = ("frequency", "created_at", "deleted_at")
    search_fields = (
        "name",
        "user_service__user__email",
        "user_service__user__first_name",
        "user_service__user__last_name",
    )
    readonly_fields = (
        "created_at", "updated_at", "deleted_at", "metrics_preview",
    )
    autocomplete_fields = ("user_service", "created_by")
    list_select_related = ("user_service__user", "created_by")
    ordering = ("-created_at",)

    fieldsets = (
        ("Ownership", {
            "fields": ("user_service", "created_by", "name"),
        }),
        ("Monitoring", {
            "fields": ("monitoring", "metrics_preview", "frequency"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at", "deleted_at"),
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
        return format_html(
            "{}",
            " • ".join(label_map.get(m, m) for m in obj.monitoring),
        )

    @admin.display(boolean=True, description="Deleted")
    def is_deleted(self, obj):
        return obj.deleted_at is not None


# ============================================================================
# READINGS / SCORES / HEALTH ALERTS
# ============================================================================

@admin.register(Reading)
class ReadingAdmin(admin.ModelAdmin):
    list_display = (
        "id", "executive_profile", "metric",
        "display_value", "status", "recorded_at",
    )
    list_filter = ("metric", "status", "recorded_at")
    search_fields = (
        "executive_profile__name",
        "executive_profile__user_service__user__email",
        "display_value",
    )
    autocomplete_fields = ("executive_profile",)
    list_select_related = ("executive_profile",)
    date_hierarchy = "recorded_at"
    ordering = ("-recorded_at",)

    fieldsets = (
        (None, {
            "fields": ("executive_profile", "metric", "status"),
        }),
        ("Value", {
            "fields": (
                "value_numeric", "value_secondary",
                "unit", "display_value",
            ),
            "description": "Leave display_value blank to auto-build it.",
        }),
        ("Timing", {"fields": ("recorded_at",)}),
    )


@admin.register(HealthScoreSnapshot)
class HealthScoreSnapshotAdmin(admin.ModelAdmin):
    list_display = ("id", "executive_profile", "score", "caption", "recorded_at")
    list_filter = ("score", "recorded_at")
    autocomplete_fields = ("executive_profile",)
    list_select_related = ("executive_profile",)
    ordering = ("-recorded_at",)


@admin.register(HealthAlert)
class HealthAlertAdmin(AlertAdminMixin, SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = (
        "id", "executive_profile", "severity", "title",
        "resolved_flag", "created_at",
    )
    list_filter = ("severity", "resolved", "created_at", "deleted_at")
    search_fields = ("title", "body", "executive_profile__name")
    autocomplete_fields = ("executive_profile",)
    list_select_related = ("executive_profile",)
    readonly_fields = ("created_at", "updated_at", "resolved_at", "deleted_at")
    ordering = ("-created_at",)


# ============================================================================
# CARE TEAM / UPCOMING CARE
# ============================================================================

@admin.register(CareTeamMember)
class CareTeamMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "executive_profile", "role", "full_name",
                    "title", "available", "created_at")
    list_filter = ("role", "available")
    search_fields = ("full_name", "title", "executive_profile__name")
    autocomplete_fields = ("executive_profile",)
    list_select_related = ("executive_profile",)


@admin.register(UpcomingCare)
class UpcomingCareAdmin(admin.ModelAdmin):
    list_display = ("id", "executive_profile", "title",
                    "scheduled_for", "provided_by")
    list_filter = ("scheduled_for",)
    search_fields = ("title", "provided_by", "executive_profile__name")
    autocomplete_fields = ("executive_profile",)
    list_select_related = ("executive_profile",)
    date_hierarchy = "scheduled_for"


# ============================================================================
# EMERGENCY
# ============================================================================

class EmergencyTimelineStepInline(admin.TabularInline):
    model = EmergencyTimelineStep
    extra = 0
    ordering = ("order", "id")
    fields = ("order", "label", "status", "happened_at")
    autocomplete_fields = ()


@admin.register(EmergencyEvent)
class EmergencyEventAdmin(admin.ModelAdmin):
    list_display = (
        "id", "response_id", "executive_profile",
        "status", "eta_minutes", "activated_at", "resolved_at",
    )
    list_filter = ("status", "activated_at")
    search_fields = ("response_id", "executive_profile__name")
    autocomplete_fields = ("executive_profile",)
    list_select_related = ("executive_profile",)
    readonly_fields = ("activated_at",)
    date_hierarchy = "activated_at"
    inlines = (EmergencyTimelineStepInline,)

    fieldsets = (
        (None, {
            "fields": ("executive_profile", "response_id", "status"),
        }),
        ("Response", {
            "fields": ("eta_minutes", "activated_at", "resolved_at"),
        }),
    )


# ============================================================================
# MEDICATIONS
# ============================================================================

class MedicationScheduleInline(admin.TabularInline):
    model = MedicationSchedule
    extra = 0
    fields = ("scheduled_for", "status", "taken_at")
    ordering = ("scheduled_for",)


@admin.register(Medication)
class MedicationAdmin(SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = (
        "id", "name", "executive_profile",
        "purpose", "dosage", "active", "created_at",
    )
    list_filter = ("active", "deleted_at")
    search_fields = ("name", "purpose", "executive_profile__name")
    autocomplete_fields = ("executive_profile",)
    list_select_related = ("executive_profile",)
    inlines = (MedicationScheduleInline,)


@admin.register(MedicationSchedule)
class MedicationScheduleAdmin(admin.ModelAdmin):
    list_display = (
        "id", "medication", "scheduled_for",
        "time_label", "status", "taken_at",
    )
    list_filter = ("status", "scheduled_for")
    search_fields = ("medication__name", "medication__executive_profile__name")
    autocomplete_fields = ("medication",)
    list_select_related = ("medication",)
    date_hierarchy = "scheduled_for"

    @admin.display(description="Time")
    def time_label(self, obj):
        return obj.time_label


@admin.register(MedicationAlert)
class MedicationAlertAdmin(AlertAdminMixin, SoftDeleteAdminMixin, admin.ModelAdmin):
    list_display = (
        "id", "executive_profile", "priority",
        "message_short", "resolved_flag", "created_at",
    )
    list_filter = ("priority", "resolved", "created_at", "deleted_at")
    search_fields = ("message", "medication__name", "executive_profile__name")
    autocomplete_fields = ("executive_profile", "medication")
    list_select_related = ("executive_profile", "medication")
    readonly_fields = ("created_at", "updated_at", "resolved_at", "deleted_at")

    @admin.display(description="Message")
    def message_short(self, obj):
        return (obj.message[:60] + "…") if len(obj.message) > 60 else obj.message


# ============================================================================
# HEALTH PROGRAMME
# ============================================================================

@admin.register(HealthProgrammeItem)
class HealthProgrammeItemAdmin(admin.ModelAdmin):
    list_display = (
        "id", "executive_profile", "title",
        "status", "icon_key", "order", "next_due",
    )
    list_filter = ("status", "next_due")
    search_fields = ("title", "subtitle", "executive_profile__name")
    autocomplete_fields = ("executive_profile",)
    list_select_related = ("executive_profile",)
    ordering = ("executive_profile", "order", "title")


# ============================================================================
# REPORTS
# ============================================================================

@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = (
        "id", "executive_profile", "category", "name",
        "value", "tone", "recorded_at",
    )
    list_filter = ("category", "tone", "recorded_at")
    search_fields = ("name", "category", "executive_profile__name")
    autocomplete_fields = ("executive_profile",)
    list_select_related = ("executive_profile",)
    date_hierarchy = "recorded_at"
    ordering = ("-recorded_at",)


@admin.register(WeeklyReport)
class WeeklyReportAdmin(admin.ModelAdmin):
    list_display = (
        "id", "executive_profile", "period",
        "range_label", "physician_name",
        "generated_at",
    )
    list_filter = ("period", "generated_at")
    search_fields = ("label", "range_label", "executive_profile__name")
    autocomplete_fields = ("executive_profile",)
    list_select_related = ("executive_profile",)
    readonly_fields = ("generated_at",)
    date_hierarchy = "generated_at"
    ordering = ("-generated_at",)

    fieldsets = (
        (None, {
            "fields": (
                "executive_profile", "period",
                "period_start", "period_end",
            ),
        }),
        ("Display", {
            "fields": ("label", "range_label"),
        }),
        ("Care team snapshot", {
            "fields": ("physician_name", "nurse_name", "last_reviewed"),
        }),
        ("Status", {
            "fields": ("status_title", "status_summary"),
        }),
        ("Snapshot data (JSON)", {
            "fields": ("vitals", "trends", "highlights", "next_steps"),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": ("generated_at",),
            "classes": ("collapse",),
        }),
    )