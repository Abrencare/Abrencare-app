from django.contrib import admin
from django.utils.html import format_html

from .models import (
    FamilyProfile,
    FamilyMember,
    FamilyReading,
    CarePlanItem,
    CareVisit,
    FamilyCareTeamMember,
    FamilyAttentionFlag,
    FamilyInvitation,
    InvitationDelivery,
    FamilyAuditLog,
    FamilyReport,
    FamilyReportRead,
    FamilyPrescription,
    FamilyLabResult,
    FamilyHistoryEntry,
)


# ---------------------------------------------------------------------------
# Shared badge helper
# ---------------------------------------------------------------------------

_TONE_COLORS = {
    "good": "#5D9C59",
    "info": "#556CD6",
    "flag": "#D64545",
    # legacy aliases in case of imported data
    "warn": "#E0A800",
    "bad":  "#D64545",
}


def _badge(value: str, label: str | None = None) -> str:
    color = _TONE_COLORS.get(value, "#999")
    return format_html(
        '<span style="display:inline-block;padding:2px 8px;'
        'border-radius:10px;background:{};color:#fff;'
        'font-size:11px;font-weight:600;">{}</span>',
        color,
        label or value,
    )


# ---------------------------------------------------------------------------
# Inlines
# ---------------------------------------------------------------------------

class FamilyMemberInline(admin.TabularInline):
    model = FamilyMember
    extra = 0
    fields = (
        "full_name", "relationship", "is_primary",
        "date_of_birth", "phone", "city",
    )
    show_change_link = True


class FamilyCareTeamMemberInline(admin.TabularInline):
    model = FamilyCareTeamMember
    extra = 0
    fields = (
        "role", "full_name", "phone", "is_primary",
        "available_now", "on_visit", "ended_at",
    )


class FamilyAttentionFlagInline(admin.TabularInline):
    model = FamilyAttentionFlag
    extra = 0
    fields = ("label", "title", "severity", "tone", "resolved", "created_at")
    readonly_fields = ("created_at",)
    show_change_link = True


class CarePlanItemInline(admin.TabularInline):
    model = CarePlanItem
    extra = 0
    fields = ("title", "scheduled_time", "status", "done", "order")
    ordering = ("order", "scheduled_time")


class FamilyReadingInline(admin.TabularInline):
    model = FamilyReading
    extra = 0
    fields = ("kind", "value", "unit", "status", "tone", "recorded_at")
    readonly_fields = ("recorded_at",)
    ordering = ("-recorded_at",)


class CareVisitInline(admin.TabularInline):
    model = CareVisit
    extra = 0
    fields = (
        "clinician", "nurse_name", "state",
        "scheduled_at", "started_at", "ended_at",
    )
    readonly_fields = ("created_at",)
    show_change_link = True


class FamilyReportInline(admin.TabularInline):
    model = FamilyReport
    extra = 0
    fields = ("title", "kind", "tone", "published_at", "summary")
    ordering = ("-published_at",)
    show_change_link = True


class FamilyPrescriptionInline(admin.TabularInline):
    model = FamilyPrescription
    extra = 0
    fields = (
        "name", "dose", "prescribed_by",
        "status", "tone", "refill_note", "started_at",
    )
    ordering = ("-created_at",)
    show_change_link = True


class FamilyLabResultInline(admin.TabularInline):
    model = FamilyLabResult
    extra = 0
    fields = ("name", "value", "collected_at", "status", "tone", "file_url")
    ordering = ("-collected_at",)
    show_change_link = True


class FamilyHistoryEntryInline(admin.TabularInline):
    model = FamilyHistoryEntry
    extra = 0
    fields = ("title", "detail", "year", "tone", "icon")
    ordering = ("-year",)
    show_change_link = True


class InvitationDeliveryInline(admin.TabularInline):
    model = InvitationDelivery
    extra = 0
    fields = ("channel", "destination", "status", "sent_at", "created_at")
    readonly_fields = ("created_at",)


# ---------------------------------------------------------------------------
# FamilyProfile
# ---------------------------------------------------------------------------

@admin.register(FamilyProfile)
class FamilyProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id", "display_name", "user_email",
        "created_by", "member_count", "created_at",
    )
    search_fields = (
        "name",
        "user_service__user__email",
        "user_service__user__username",
        "user_service__user__first_name",
        "user_service__user__last_name",
        "created_by__email",
        "created_by__username",
    )
    list_filter = ("created_at",)
    readonly_fields = ("created_at", "updated_at")
    autocomplete_fields = ("user_service", "created_by")
    list_select_related = ("user_service__user", "created_by")
    ordering = ("-created_at",)

    inlines = (
        FamilyMemberInline,
        FamilyCareTeamMemberInline,
        FamilyAttentionFlagInline,
    )

    fieldsets = (
        ("Ownership", {
            "fields": ("name", "user_service", "created_by"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Name", ordering="name")
    def display_name(self, obj):
        user = obj.user_service.user
        return obj.name or user.get_full_name() or user.get_username()

    @admin.display(description="Email", ordering="user_service__user__email")
    def user_email(self, obj):
        return obj.user_service.user.email

    @admin.display(description="Members")
    def member_count(self, obj):
        return obj.members.count()


# ---------------------------------------------------------------------------
# FamilyMember
# ---------------------------------------------------------------------------

@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = (
        "id", "full_name", "relationship", "family",
        "is_primary", "date_of_birth", "phone", "created_at",
    )
    list_filter = ("relationship", "is_primary", "created_at")
    search_fields = (
        "full_name", "phone", "city",
        "family__name",
        "family__user_service__user__email",
    )
    autocomplete_fields = ("family",)
    list_select_related = ("family", "family__user_service__user")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("family", "-is_primary", "full_name")

    inlines = (
        CarePlanItemInline,
        FamilyReadingInline,
        CareVisitInline,
        FamilyReportInline,
        FamilyPrescriptionInline,
        FamilyLabResultInline,
        FamilyHistoryEntryInline,
        FamilyAttentionFlagInline,
    )

    fieldsets = (
        ("Membership", {
            "fields": ("family", "relationship", "is_primary"),
        }),
        ("Personal details", {
            "fields": (
                "full_name", "date_of_birth", "phone",
                "city", "address", "emergency_phone",
            ),
        }),
        ("Notes", {"fields": ("notes",)}),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Family", ordering="family__name")
    def family(self, obj):
        user = obj.family.user_service.user
        return obj.family.name or user.get_username()


# ---------------------------------------------------------------------------
# Readings / Care plan / Visits
# ---------------------------------------------------------------------------

@admin.register(FamilyReading)
class FamilyReadingAdmin(admin.ModelAdmin):
    list_display = (
        "id", "kind", "value", "unit", "status",
        "tone_badge", "member", "recorded_at",
    )
    list_filter = ("kind", "tone", "recorded_at")
    search_fields = (
        "value", "status",
        "member__full_name",
        "member__family__name",
    )
    autocomplete_fields = ("member", "recorded_by")
    list_select_related = ("member",)
    readonly_fields = ("created_at",)
    ordering = ("-recorded_at",)
    date_hierarchy = "recorded_at"

    @admin.display(description="Tone", ordering="tone")
    def tone_badge(self, obj):
        return _badge(obj.tone)


@admin.register(CarePlanItem)
class CarePlanItemAdmin(admin.ModelAdmin):
    list_display = (
        "id", "title", "member", "scheduled_time",
        "status", "done", "order",
    )
    list_filter = ("status", "done", "scheduled_time")
    search_fields = ("title", "member__full_name")
    autocomplete_fields = ("member", "completed_by")
    list_select_related = ("member",)
    ordering = ("member", "order", "scheduled_time")


@admin.register(CareVisit)
class CareVisitAdmin(admin.ModelAdmin):
    list_display = (
        "id", "member", "clinician", "nurse_name",
        "state", "scheduled_at", "started_at", "ended_at",
    )
    list_filter = ("state", "created_at")
    search_fields = ("nurse_name", "member__full_name", "clinician__email")
    autocomplete_fields = ("member", "clinician")
    list_select_related = ("member", "clinician")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    date_hierarchy = "started_at"


@admin.register(FamilyCareTeamMember)
class FamilyCareTeamMemberAdmin(admin.ModelAdmin):
    list_display = (
        "id", "full_name", "role", "family",
        "is_primary", "is_active", "available_now", "on_visit",
    )
    list_filter = ("role", "is_primary", "available_now", "on_visit")
    search_fields = ("full_name", "phone", "family__name")
    autocomplete_fields = ("family", "staff")
    list_select_related = ("family", "staff")
    readonly_fields = ("created_at",)
    ordering = ("family", "-is_primary", "role", "full_name")

    @admin.display(boolean=True, description="Active")
    def is_active(self, obj):
        return obj.is_active


@admin.register(FamilyAttentionFlag)
class FamilyAttentionFlagAdmin(admin.ModelAdmin):
    list_display = (
        "id", "label", "title", "severity", "tone_badge",
        "family", "member", "resolved", "created_at",
    )
    list_filter = ("severity", "tone", "resolved", "created_at")
    search_fields = (
        "label", "title", "body",
        "family__name", "member__full_name",
    )
    autocomplete_fields = ("family", "member")
    list_select_related = ("family", "member")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    @admin.display(description="Tone", ordering="tone")
    def tone_badge(self, obj):
        return _badge(obj.tone)


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------

@admin.register(FamilyInvitation)
class FamilyInvitationAdmin(admin.ModelAdmin):
    list_display = (
        "id", "name", "email", "phone_number", "family",
        "invitation_type", "status", "expires_at", "created_at",
    )
    list_filter = ("invitation_type", "status", "created_at")
    search_fields = ("name", "email", "phone_number", "family__name")
    autocomplete_fields = ("family", "invited_by", "accepted_by")
    list_select_related = ("family", "invited_by", "accepted_by")
    readonly_fields = (
        "token_hash", "otp_hash", "created_at", "updated_at",
        "accepted_at", "otp_expires_at", "otp_sent_at",
        "contact_verified_at", "otp_locked_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    inlines = (InvitationDeliveryInline,)

    fieldsets = (
        ("Invitation", {
            "fields": (
                "family", "invitation_type", "invited_by",
                "name", "email", "phone_number", "role", 
            ),
        }),
        ("Status", {
            "fields": ("status", "expires_at", "accepted_by", "accepted_at"),
        }),
        ("OTP", {
            "fields": (
                "otp_hash", "otp_expires_at", "otp_sent_at",
                "otp_attempts", "otp_locked_at", "contact_verified_at",
            ),
            "classes": ("collapse",),
        }),
        ("Tokens", {
            "fields": ("token_hash",),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )


@admin.register(InvitationDelivery)
class InvitationDeliveryAdmin(admin.ModelAdmin):
    list_display = (
        "id", "invitation", "channel", "destination",
        "status", "sent_at", "created_at",
    )
    list_filter = ("channel", "status", "created_at")
    search_fields = ("destination", "invitation__name", "invitation__email")
    autocomplete_fields = ("invitation",)
    list_select_related = ("invitation",)
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)


# ---------------------------------------------------------------------------
# Reports / Prescriptions / Labs / History
# ---------------------------------------------------------------------------

@admin.register(FamilyReport)
class FamilyReportAdmin(admin.ModelAdmin):
    list_display = (
        "id", "title", "member", "kind",
        "tone_badge", "published_at",
    )
    list_filter = ("kind", "tone", "published_at")
    search_fields = ("title", "summary", "member__full_name")
    autocomplete_fields = ("member",)
    list_select_related = ("member",)
    date_hierarchy = "published_at"
    ordering = ("-published_at",)

    fieldsets = (
        (None, {"fields": ("member", "kind", "title")}),
        ("Content", {"fields": ("summary",)}),
        ("Status", {"fields": ("tone", "published_at")}),
    )

    @admin.display(description="Tone", ordering="tone")
    def tone_badge(self, obj):
        return _badge(obj.tone)


@admin.register(FamilyReportRead)
class FamilyReportReadAdmin(admin.ModelAdmin):
    list_display = ("id", "report", "user", "read_at")
    list_filter = ("read_at",)
    search_fields = ("report__title", "user__email")
    autocomplete_fields = ("report", "user")
    list_select_related = ("report", "user")
    readonly_fields = ("read_at",)
    ordering = ("-read_at",)


@admin.register(FamilyPrescription)
class FamilyPrescriptionAdmin(admin.ModelAdmin):
    list_display = (
        "id", "name", "member", "dose", "prescribed_by",
        "status", "tone_badge", "started_at", "ended_at",
    )
    list_filter = ("status", "tone", "started_at")
    search_fields = ("name", "prescribed_by", "member__full_name")
    autocomplete_fields = ("member",)
    list_select_related = ("member",)
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("member", "name", "dose", "prescribed_by")}),
        ("Course", {"fields": ("refill_note", "started_at", "ended_at")}),
        ("Status", {"fields": ("status", "tone")}),
    )

    @admin.display(description="Tone", ordering="tone")
    def tone_badge(self, obj):
        return _badge(obj.tone)


@admin.register(FamilyLabResult)
class FamilyLabResultAdmin(admin.ModelAdmin):
    list_display = (
        "id", "name", "member", "value",
        "collected_at", "status", "tone_badge", "has_file",
    )
    list_filter = ("status", "tone", "collected_at")
    search_fields = ("name", "value", "member__full_name")
    autocomplete_fields = ("member",)
    list_select_related = ("member",)
    date_hierarchy = "collected_at"
    ordering = ("-collected_at",)

    fieldsets = (
        (None, {"fields": ("member", "name", "value", "collected_at")}),
        ("Report", {"fields": ("status", "tone", "file_url")}),
    )

    @admin.display(description="Tone", ordering="tone")
    def tone_badge(self, obj):
        return _badge(obj.tone)

    @admin.display(boolean=True, description="File")
    def has_file(self, obj):
        return bool(obj.file_url)


@admin.register(FamilyHistoryEntry)
class FamilyHistoryEntryAdmin(admin.ModelAdmin):
    list_display = (
        "id", "title", "member", "detail",
        "year", "icon_preview", "tone_badge",
    )
    list_filter = ("tone", "year")
    search_fields = ("title", "detail", "member__full_name")
    autocomplete_fields = ("member",)
    list_select_related = ("member",)
    ordering = ("-year", "-created_at")

    fieldsets = (
        (None, {"fields": ("member", "title", "detail", "year")}),
        ("Display", {
            "fields": ("icon", "tone"),
            "description": (
                "'icon' is an Ionicons glyph name (e.g. 'heart-outline', "
                "'water-outline'). Leave blank to fall back to a neutral dot."
            ),
        }),
    )

    @admin.display(description="Icon")
    def icon_preview(self, obj):
        return obj.icon or "—"

    @admin.display(description="Tone", ordering="tone")
    def tone_badge(self, obj):
        return _badge(obj.tone)


# ---------------------------------------------------------------------------
# Audit log — immutable
# ---------------------------------------------------------------------------

@admin.register(FamilyAuditLog)
class FamilyAuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id", "family", "action", "actor",
        "invitation",  "created_at",
    )
    list_filter = ("action", "created_at")
    search_fields = (
        "family__name",
        "actor__email",
        "invitation__email",
        "invitation__phone_number",
    )
    autocomplete_fields = ("family", "actor", "invitation", )
    list_select_related = ("family", "actor", "invitation", )
    readonly_fields = (
        "family", "actor", "action", "invitation",
        "metadata", "ip_address", "user_agent", "created_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
    