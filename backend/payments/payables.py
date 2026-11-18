# payments/payables.py
"""Registry of payable types.

Each payable type declares:
  - model:         the Django model to look up by pk
  - amount_of:     callable(obj) -> Decimal, the amount owed for this obj
  - description_of: callable(obj) -> str, receipt description
  - authorize:     callable(payer, obj) -> bool, may this user pay this obj?
  - payable_id_of: optional callable to accept non-pk identifiers

Adding a new payable is a one-line registration here. Nothing else in the
payments module changes.
"""
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Callable

from django.apps import apps


@dataclass(frozen=True)
class PayableSpec:
    model: Any
    amount_of: Callable[[Any], Decimal]
    description_of: Callable[[Any], str]
    authorize: Callable[[Any, Any], bool]
    payable_id_of: Callable[[Any], Any] = lambda obj: obj.pk


_REGISTRY: dict[str, PayableSpec] = {}


def register(name: str, spec: PayableSpec) -> None:
    if name in _REGISTRY:
        raise ValueError(f"Payable {name!r} is already registered.")
    _REGISTRY[name] = spec


def resolve(name: str, raw_id: Any) -> Any:
    """Look up the payable by registered name and id.

    Raises LookupError for any failure: unknown type, missing object,
    or an id that can't be coerced to the model's pk type.
    """
    try:
        spec = _REGISTRY[name]
    except KeyError as exc:
        raise LookupError(f"Unknown payable type {name!r}.") from exc

    field_name = _id_field(spec)
    try:
        return spec.model.objects.get(**{field_name: raw_id})
    except spec.model.DoesNotExist as exc:
        raise LookupError(f"No {name} with id {raw_id!r}.") from exc
    except (ValueError, TypeError) as exc:
        # e.g. an integer pk given a non-numeric string.
        raise LookupError(
            f"Invalid id {raw_id!r} for {name}: {exc}"
        ) from exc
    except Exception as exc:
        # Anything else (ValidationError, etc.) also becomes a LookupError
        # so the serializer shows a clean message rather than a 500.
        raise LookupError(
            f"Could not resolve {name} with id {raw_id!r}: {exc}"
        ) from exc

def spec_for(name: str) -> PayableSpec:
    try:
        return _REGISTRY[name]
    except KeyError as exc:
        raise LookupError(f"Unknown payable type {name!r}.") from exc


def _id_field(spec: PayableSpec) -> str:
    # By default we look up by pk. If the spec provides a custom
    # payable_id_of that isn't pk-based, the field name should match.
    return "pk"


# ── Register your payables here ─────────────────────────────
#
# Example (adapt to your app):
#
# from appointments.models import Appointment
#
# def _appt_amount(appt):
#     return appt.fee_amount
#
# def _appt_desc(appt):
#     return f"Appointment {appt.reference}"
#
# def _appt_authorize(payer, appt):
#     # Payer must be the patient or the patient's guardian.
#     return payer == appt.patient or payer in appt.guardians.all()
#
# register("appointment", PayableSpec(
#     model=Appointment,
#     amount_of=_appt_amount,
#     description_of=_appt_desc,
#     authorize=_appt_authorize,
# ))