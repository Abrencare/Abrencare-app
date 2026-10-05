"""Domain exceptions for the executive service layer."""


class ExecutiveServiceError(Exception):
    """Raised by services for any domain-level failure."""

    def __init__(self, message: str, *, code: str = "executive_error"):
        super().__init__(message)
        self.code = code


class ExecutiveNotEnrolled(ExecutiveServiceError):
    def __init__(self, message="User is not enrolled in the executive service."):
        super().__init__(message, code="not_enrolled")


class ExecutiveProfileMissing(ExecutiveServiceError):
    def __init__(self, message="Executive profile not found."):
        super().__init__(message, code="profile_missing")


class ExecutiveProfileExists(ExecutiveServiceError):
    def __init__(self, message="Executive profile already exists."):
        super().__init__(message, code="profile_exists")