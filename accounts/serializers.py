from rest_framework import serializers
from roles.models import Role
from roles.serializers import RoleSerializer
from django.contrib.auth.password_validation import validate_password
from .models import User, PasswordHistory
from roles.models import Role
import re
import uuid
from services.models import UserService
from executive.models import ExecutiveProfile  # safe — no circular import
from datetime import datetime, date as date_cls
from django.utils.dateparse import parse_date
from django.db import transaction
from services.models import Service, UserService
from services.serializers import UserServiceSerializer

try:
    from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
except Exception:
    from rest_framework_simplejwt.tokens import RefreshToken

    class TokenObtainPairSerializer:
        @classmethod
        def get_token(cls, user):
            return RefreshToken.for_user(user)


GENDER_BACK_TO_FRONT = {
    "male": "male",
    "female": "female",
    "other": "other",
    "preferNot": "prefer_not",
    "prefer_not": "prefer_not",
}

class FlexibleDateField(serializers.DateField):
    """
    Accepts ISO (YYYY-MM-DD) plus common human formats and returns a date.
    - 1990-05-12
    - 1990/05/12
    - 12/05/1990  (DD/MM/YYYY — assumed day-first, see note)
    - 05/12/1990  (ambiguous)
    - May 12, 1990
    - 12 May 1990
    """
    INPUT_FORMATS = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%m/%d/%Y",     # fallback if day-first fails
        "%d.%m.%Y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%d %b %Y",
        "%d %B %Y",
        "%Y%m%d",
    ]

    def to_internal_value(self, data):
        if data in ("", None):
            return None
        if isinstance(data, date_cls):
            return data

        value = str(data).strip()
        if value == "":
            return None

        # Fast path: ISO
        iso = parse_date(value)
        if iso is not None:
            return iso

        # Try known formats
        for fmt in self.INPUT_FORMATS:
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue

        raise serializers.ValidationError(
            "Date must be in YYYY-MM-DD format (e.g. 1990-05-12)."
        )


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    status = serializers.ReadOnlyField()
    profile_picture_url = serializers.ReadOnlyField()
    role = RoleSerializer(read_only=True)
    phone = serializers.CharField(source="phone_number", read_only=True)
    role_name = serializers.CharField(source="role.role_name", read_only=True)

    services = UserServiceSerializer(
        source="user_services", many=True, read_only=True
    )

    dateOfBirth = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    heightCm = serializers.SerializerMethodField()
    weightKg = serializers.SerializerMethodField()
    monitoring = serializers.SerializerMethodField()
    frequency = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email",
            "first_name", "last_name",
            "phone", "phone_number",
            "date_of_birth", "dateOfBirth",
            "date_joined", "account_status", "is_superuser",
            "full_name", "status", "role", "role_name",
            "profile_picture_url",
            "gender",
            "height", "heightCm",
            "weight", "weightKg",
            "monitoring", "frequency",
            "services",
        ]

    # -- helpers -----------------------------------------------------------
    def _exec_ws(self, obj):
        return obj.user_services.filter(service__code="executive").first()

    def _exec_profile(self, obj):
        us = self._exec_ws(obj)
        if us is None:
            return None
        return ExecutiveProfile.objects.filter(user_service=us).first()

    # -- executive field projections --------------------------------------
    def get_dateOfBirth(self, obj):
        return obj.date_of_birth.isoformat() if obj.date_of_birth else ""

    def get_gender(self, obj):
        return GENDER_BACK_TO_FRONT.get(obj.gender, obj.gender) if obj.gender else None

    def get_heightCm(self, obj):
        return str(obj.height) if obj.height is not None else ""

    def get_weightKg(self, obj):
        return str(obj.weight) if obj.weight is not None else ""

    def get_monitoring(self, obj):
        profile = self._exec_profile(obj)
        return list(profile.monitoring) if profile and profile.monitoring else []

    def get_frequency(self, obj):
        profile = self._exec_profile(obj)
        return profile.frequency if profile else "managed"

    
class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    service = serializers.SlugField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "password",
            "name", "phone", "service",
            "first_name", "last_name", "phone_number",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return value.lower() if value else value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_service(self, value):
        if not Service.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError(
                f"Service '{value}' is not available."
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        name = validated_data.pop("name", "").strip()
        phone = validated_data.pop("phone", "").strip()
        service_code = validated_data.pop("service")

        if name and not validated_data.get("first_name"):
            first, _, last = name.partition(" ")
            validated_data["first_name"] = first
            validated_data["last_name"] = last

        if phone and not validated_data.get("phone_number"):
            validated_data["phone_number"] = phone

        if not validated_data.get("username"):
            base = (validated_data.get("email") or "").split("@")[0] or "user"
            validated_data["username"] = f"{base}-{uuid.uuid4().hex[:8]}"

        base_role, _ = Role.objects.get_or_create(role_name="owner")

        user = User.objects.create(
            role=base_role,
            **validated_data,
        )
        user.set_password(password)

        user.save()
        PasswordHistory.objects.create(user=user, password=user.password)
        service = Service.objects.get(code=service_code)
        user_service = UserService.objects.create(
            user=user, 
            service=service,
            onboarded=True
        )
        _bootstrap_profile(user_service, user)

        return user


def _bootstrap_profile(user_service: UserService, user):
    code = user_service.service.code
    if code == "family":
        from families.services.family import bootstrap_family_owner
        bootstrap_family_owner(user, user_service)
    elif code == "executive":
        from executive.models import ExecutiveProfile
        ExecutiveProfile.objects.get_or_create(user_service=user_service, created_by=user)
    elif code == "consultation":
        from consultations.models import ConsultationProfile
        ConsultationProfile.objects.get_or_create(
            user_service=user_service, 
            user_service__onboarded=True,
            created_by=user,
            )


class UserUpdateSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "profile_picture",
            "username",
            "email",
            "role",
            "date_of_birth",
            "phone_number",
            "address",
            "postal_code",
            "city",
        ]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['is_superuser'] = user.is_superuser
        token['role'] = user.role.role_name if user.role else None

        return token


class EnhancedChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        required=True, 
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True, 
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="Password must be at least 8 characters long and contain uppercase, lowercase, number and special character"
    )
    confirm_password = serializers.CharField(
        required=True, 
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_new_password(self, value):
        # Use Django's built-in password validation
        validate_password(value)
        
        # Additional custom validation
        if not any(char.isupper() for char in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        
        if not any(char.islower() for char in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        
        # Check for common patterns
        common_patterns = ['123456', 'password', 'qwerty', 'abc123']
        if value.lower() in common_patterns:
            raise serializers.ValidationError("Password is too common. Please choose a stronger password.")
        user = self.context["request"].user
        for entry in user.password_history.order_by("-created_at")[:5]:
            if entry.check_password(value):
                raise serializers.ValidationError(
                    "Password was used recently. Choose a different one."
                )
        return value
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'New passwords do not match.'
            })
        
        user = self.context['request'].user
        
        # Check if new password is different from current password
        if user.check_password(data['new_password']):
            raise serializers.ValidationError({
                'new_password': 'New password must be different from current password.'
            })
        
        return data

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        PasswordHistory.objects.create(user=user, password=user.password)
        return user