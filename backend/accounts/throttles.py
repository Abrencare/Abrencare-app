from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginThrottle(AnonRateThrottle):
    scope = "login"


class ServiceEnrollThrottle(UserRateThrottle):
    """Per-account limit on adding care services to an existing account."""

    scope = "service_enroll"


class RegistrationThrottle(AnonRateThrottle):
    scope = "registration"


class PasswordResetRequestThrottle(AnonRateThrottle):
    scope = "password_reset_request"


class PasswordResetVerifyThrottle(AnonRateThrottle):
    scope = "password_reset_verify"


class PasswordResetCompleteThrottle(AnonRateThrottle):
    scope = "password_reset_complete"