class AppointmentError(Exception):
    """Base for appointment domain errors."""

    def __init__(self, message: str = "", *, errors: dict | None = None):
        self.message = message
        self.errors = errors or {}
        super().__init__(message or str(self.errors))


class AppointmentNotBookable(AppointmentError):
    """The requested slot cannot be booked (validation / conflict)."""


class AppointmentSlotTaken(AppointmentError):
    """Lost a race for the slot (DB IntegrityError)."""


class InvalidAppointmentTransition(AppointmentError):
    """Status transition is not allowed from the current state."""


class AppointmentPermissionDenied(AppointmentError):
    """The user is not allowed to perform this action."""
    