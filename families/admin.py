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
    FamilyPatient,
    FamilyInvitation,
    InvitationDelivery,
    FamilyAuditLog,
    FamilyReport,
    FamilyPrescription,
    FamilyLabResult,
    FamilyHistoryEntry,
)


# ---------------------------------------------------------------------------
# Inlines
# ---------------------------------------------------------------------------

class FamilyMemberInline(admin.TabularInline):
    model = FamilyMember
    extra = 0
    fields = (
        "full_name",
        "relationship",
        "date_of_birth",
        "phone",
        "city",
    )
    show_change_link = True


class FamilyPatientInline(admin.TabularInline):
    model = FamilyPatient
    extra = 0
    autocomplete_fields = ("patient",)
    fields = ("patient", "relationship", "is_primary", "created_at")
    readonly_fields = ("created_at",)
    show_change_link = True


class FamilyCareTeamMemberInline(admin.TabularInline):
    model = FamilyCareTeamMember
    extra = 0
    fields = ("role", "full_name", "phone", "available_now", "on_visit")


class FamilyAttentionFlagInline(admin.TabularInline):
    model = FamilyAttentionFlag
    extra = 0
    fields = ("label", "title", "tone", "resolved", "created_at")
    readonly_fields = ("created_at",)


class CarePlanItemInline(admin.TabularInline):
    model = CarePlanItem
    extra = 0
    fields = ("title", "scheduled_time", "done", "order")


class FamilyReadingInline(admin.TabularInline):
    model = FamilyReading
    extra = 0
    fields = ("kind", "value", "status", "tone", "recorded_at")
    readonly_fields = ("recorded_at",)


# ---------------------------------------------------------------------------
# FamilyProfile
# ---------------------------------------------------------------------------

@admin.register(FamilyProfile)
class FamilyProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "display_name",
        "user_email",
        "created_by",
        "member_count",
        "patient_count",
        "created_at",
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
        FamilyPatientInline,
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
        return obj.name or obj.user_service.user.full_name or obj.user_service.user.username

    @admin.display(description="Email", ordering="user_service__user__email")
    def user_email(self, obj):
        return obj.user_service.user.email

    @admin.display(description="Members")
    def member_count(self, obj):
        return obj.members.count()

    @admin.display(description="Patients")
    def patient_count(self, obj):
        return obj.patients.count()


# ---------------------------------------------------------------------------
# FamilyMember
# ---------------------------------------------------------------------------

@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "full_name",
        "relationship",
        "family",
        "date_of_birth",
        "phone",
        "created_at",
    )
    list_filter = ("relationship", "created_at")
    search_fields = (
        "full_name",
        "phone",
        "city",
        "family_profile__name",
        "family_profile__user_service__user__email",
    )
    autocomplete_fields = ("family_profile",)
    list_select_related = ("family_profile",)
    readonly_fields = ("created_at",)
    ordering = ("family_profile", "full_name")

    inlines = (
        CarePlanItemInline,
        FamilyReadingInline,
    )

    fieldsets = (
        ("Membership", {
            "fields": ("family_profile", "relationship"),
        }),
        ("Personal details", {
            "fields": (
                "full_name",
                "date_of_birth",
                "phone",
                "city",
                "address",
                "emergency_phone",
            ),
        }),
        ("Notes", {
            "fields": ("notes",),
        }),
        ("Timestamps", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )

    # `family` is a friendly column header for `family_profile`
    @admin.display(description="Family", ordering="family_profile__name")
    def family(self, obj):
        return obj.family_profile.name or obj.family_profile.user_service.user.username


# ---------------------------------------------------------------------------
# FamilyPatient
# ---------------------------------------------------------------------------

@admin.register(FamilyPatient)
class FamilyPatientAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "patient",
        "family",
        "relationship",
        "is_primary",
        "created_at",
    )
    list_filter = ("relationship", "is_primary", "created_at")
    search_fields = (
        "patient__full_name",
        "patient__user__email",
        "family__name",
        "family__user_service__user__email",
    )
    autocomplete_fields = ("patient", "family")
    list_select_related = ("patient", "family", "family__user_service__user")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("family", "-is_primary", "relationship")

    @admin.display(description="Family", ordering="family__name")
    def family(self, obj):
        return obj.family.name or obj.family.user_service.user.username


# ---------------------------------------------------------------------------
# Readings / Care plan / Visits
# ---------------------------------------------------------------------------

@admin.register(FamilyReading)
class FamilyReadingAdmin(admin.ModelAdmin):
    list_display = ("id", "kind", "value", "status", "tone", "member", "recorded_at")
    list_filter = ("kind", "tone", "recorded_at")
    search_fields = (
        "value",
        "status",
        "member__full_name",
        "member__family_profile__name",
    )
    autocomplete_fields = ("member",)
    list_select_related = ("member",)
    readonly_fields = ("recorded_at",)
    ordering = ("-recorded_at",)


@admin.register(CarePlanItem)
class CarePlanItemAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "member", "scheduled_time", "done", "order")
    list_filter = ("done", "scheduled_time")
    search_fields = ("title", "member__full_name")
    autocomplete_fields = ("member",)
    list_select_related = ("member",)
    ordering = ("member", "order", "scheduled_time")


@admin.register(CareVisit)
class CareVisitAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "member",
        "nurse_name",
        "state",
        "started_at",
        "ended_at",
        "created_at",
    )
    list_filter = ("state", "created_at")
    search_fields = ("nurse_name", "member__full_name")
    autocomplete_fields = ("member",)
    list_select_related = ("member",)
    readonly_fields = ("created_at",)
    ordering = ("-started_at",)


@admin.register(FamilyCareTeamMember)
class FamilyCareTeamMemberAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "full_name",
        "role",
        "family_profile",
        "available_now",
        "on_visit",
    )
    list_filter = ("role", "available_now", "on_visit")
    search_fields = (
        "full_name",
        "phone",
        "family_profile__name",
    )
    autocomplete_fields = ("family_profile",)
    list_select_related = ("family_profile",)
    ordering = ("family_profile", "role", "full_name")


@admin.register(FamilyAttentionFlag)
class FamilyAttentionFlagAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "label",
        "title",
        "tone",
        "family_profile",
        "resolved",
        "created_at",
    )
    list_filter = ("tone", "resolved", "created_at")
    search_fields = ("label", "title", "body", "family_profile__name")
    autocomplete_fields = ("family_profile",)
    list_select_related = ("family_profile",)
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------

class InvitationDeliveryInline(admin.TabularInline):
    model = InvitationDelivery
    extra = 0
    fields = ("channel", "destination", "status", "sent_at", "created_at")
    readonly_fields = ("created_at",)


@admin.register(FamilyInvitation)
class FamilyInvitationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "email",
        "phone_number",
        "family",
        "invitation_type",
        "status",
        "expires_at",
        "created_at",
    )
    list_filter = ("invitation_type", "status", "created_at")
    search_fields = (
        "name",
        "email",
        "phone_number",
        "family__name",
    )
    autocomplete_fields = ("family", "invited_by", "patient", "accepted_by")
    list_select_related = ("family", "invited_by", "patient", "accepted_by")
    readonly_fields = (
        "token_hash",
        "otp_hash",
        "created_at",
        "updated_at",
        "accepted_at",
        "otp_expires_at",
        "otp_sent_at",
        "contact_verified_at",
        "otp_locked_at",
    )
    ordering = ("-created_at",)

    inlines = (InvitationDeliveryInline,)

    fieldsets = (
        ("Invitation", {
            "fields": (
                "family",
                "invitation_type",
                "invited_by",
                "name",
                "email",
                "phone_number",
                "role",
                "patient",
            ),
        }),
        ("Status", {
            "fields": ("status", "expires_at", "accepted_by", "accepted_at"),
        }),
        ("OTP", {
            "fields": (
                "otp_hash",
                "otp_expires_at",
                "otp_sent_at",
                "otp_attempts",
                "otp_locked_at",
                "contact_verified_at",
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
        "id",
        "invitation",
        "channel",
        "destination",
        "status",
        "sent_at",
        "created_at",
    )
    list_filter = ("channel", "status", "created_at")
    search_fields = ("destination", "invitation__name", "invitation__email")
    autocomplete_fields = ("invitation",)
    list_select_related = ("invitation",)
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

@admin.register(FamilyAuditLog)
class FamilyAuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "family",
        "action",
        "actor",
        "invitation",
        "patient",
        "created_at",
    )
    list_filter = ("action", "created_at")
    search_fields = (
        "family__name",
        "actor__email",
        "invitation__email",
        "invitation__phone_number",
        "patient__full_name",
    )
    autocomplete_fields = ("family", "actor", "invitation", "patient")
    list_select_related = ("family", "actor", "invitation", "patient")
    readonly_fields = (
        "family",
        "actor",
        "action",
        "invitation",
        "patient",
        "metadata",
        "ip_address",
        "user_agent",
        "created_at",
    )
    ordering = ("-created_at",)

    # Audit logs are immutable: block add + change
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Metadata")
    def metadata_preview(self, obj):
        return format_html("<code>{}</code>", obj.metadata)


class FamilyReportInline(admin.TabularInline):
    model = FamilyReport
    extra = 0
    fields = (
        "title", "kind", "status", "is_new",
        "published_at", "summary",
    )
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
    fields = (
        "name", "value", "collected_at",
        "status", "tone", "file_url",
    )
    ordering = ("-collected_at",)
    show_change_link = True


class FamilyHistoryEntryInline(admin.TabularInline):
    model = FamilyHistoryEntry
    extra = 0
    fields = ("title", "detail", "year", "tone", "icon")
    ordering = ("-year",)
    show_change_link = True


# ============================================================
# TOP-LEVEL ADMIN CLASSES
# ============================================================


@admin.register(FamilyReport)
class FamilyReportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "member",
        "kind",
        "status_badge",
        "is_new",
        "published_at",
    )
    list_filter = ("kind", "status", "is_new", "published_at")
    search_fields = ("title", "summary", "member__full_name")
    autocomplete_fields = ("member",)
    date_hierarchy = "published_at"
    ordering = ("-published_at",)

    fieldsets = (
        (None, {
            "fields": ("member", "kind", "title"),
        }),
        ("Content", {
            "fields": ("summary",),
        }),
        ("Status", {
            "fields": ("status", "is_new", "published_at"),
        }),
    )

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        colors = {
            "good": "#5D9C59",
            "info": "#556CD6",
            "flag": "#D64545",
        }
        color = colors.get(obj.status, "#999")
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            'border-radius:10px;background:{};color:#fff;'
            'font-size:11px;font-weight:600;">{}</span>',
            color,
            obj.get_status_display(),
        )


@admin.register(FamilyPrescription)
class FamilyPrescriptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "member",
        "dose",
        "prescribed_by",
        "status_badge",
        "tone_badge",
        "started_at",
    )
    list_filter = ("status", "tone", "started_at")
    search_fields = ("name", "prescribed_by", "member__full_name")
    autocomplete_fields = ("member",)
    ordering = ("-created_at",)

    fieldsets = (
        (None, {
            "fields": ("member", "name", "dose", "prescribed_by"),
        }),
        ("Refill", {
            "fields": ("refill_note", "started_at"),
        }),
        ("Status", {
            "fields": ("status", "tone"),
        }),
    )

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        return obj.get_status_display()

    @admin.display(description="Tone", ordering="tone")
    def tone_badge(self, obj):
        colors = {
            "good": "#5D9C59",
            "info": "#556CD6",
            "flag": "#D64545",
        }
        color = colors.get(obj.tone, "#999")
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            'border-radius:10px;background:{};color:#fff;'
            'font-size:11px;font-weight:600;">{}</span>',
            color,
            obj.tone,
        )


@admin.register(FamilyLabResult)
class FamilyLabResultAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "member",
        "value",
        "collected_at",
        "status_badge",
        "has_file",
    )
    list_filter = ("status", "tone", "collected_at")
    search_fields = ("name", "value", "member__full_name")
    autocomplete_fields = ("member",)
    date_hierarchy = "collected_at"
    ordering = ("-collected_at",)

    fieldsets = (
        (None, {
            "fields": ("member", "name", "value", "collected_at"),
        }),
        ("Report", {
            "fields": ("status", "tone", "file_url"),
        }),
    )

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        return obj.get_status_display()

    @admin.display(boolean=True, description="File")
    def has_file(self, obj):
        return bool(obj.file_url)


@admin.register(FamilyHistoryEntry)
class FamilyHistoryEntryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "member",
        "detail",
        "year",
        "icon_preview",
        "tone_badge",
    )
    list_filter = ("tone", "year")
    search_fields = ("title", "detail", "member__full_name")
    autocomplete_fields = ("member",)
    ordering = ("-year", "-created_at")

    fieldsets = (
        (None, {
            "fields": ("member", "title", "detail", "year"),
        }),
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
        if not obj.icon:
            return "—"
        return obj.icon

    @admin.display(description="Tone", ordering="tone")
    def tone_badge(self, obj):
        colors = {
            "good": "#5D9C59",
            "info": "#556CD6",
            "flag": "#D64545",
        }
        color = colors.get(obj.tone, "#999")
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            'border-radius:10px;background:{};color:#fff;'
            'font-size:11px;font-weight:600;">{}</span>',
            color,
            obj.tone,
        )
    