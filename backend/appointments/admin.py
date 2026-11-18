from django.contrib import admin

from .models import Appointment, AppointmentCheckIn


class AppointmentCheckInInline(admin.StackedInline):
    model = AppointmentCheckIn
    extra = 0
    can_delete = False


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "patient",
        "doctor",
        "appointment_date",
        "appointment_time",
        "duration_minutes",
        "status",
        "appointment_type",
    )
    list_filter = ("status", "appointment_type", "appointment_date")
    search_fields = (
        "patient__email",
        "patient__full_name",
        "doctor__user__email",
        "provider_name",
    )
    date_hierarchy = "appointment_date"
    inlines = [AppointmentCheckInInline]
    autocomplete_fields = ("patient", "doctor", "cancelled_by")
    readonly_fields = (
        "confirmed_at",
        "completed_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    )


@admin.register(AppointmentCheckIn)
class AppointmentCheckInAdmin(admin.ModelAdmin):
    list_display = ("appointment", "checked_in_at", "gps_verified")
    list_filter = ("gps_verified",)
    readonly_fields = ("created_at",)
    