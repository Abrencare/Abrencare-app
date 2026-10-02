# Payments Module
A production-grade payments module for Django 5.1+ supporting Chapa, Telebirr, CBE Birr, and manual/cash payments. Covers the full lifecycle: checkout creation, provider webhooks, refunds (partial and full), manual settlement, an append-only audit log, and scheduled reconciliation.

# Table of contents
Overview

Installation

Configuration

Architecture

Frontend integration guide

Concepts

Payment status lifecycle

Endpoints

Idempotency

Error handling

Field reference

Permissions

Integration checklist

Backend concerns

Data model

State machine

Services layer

Webhook handling

Provider clients

Reconciliation

Signals

Known issues

Testing

Operational runbook

Contributing

# Overview
The payments app models a single money movement as a Payment row, with:

A state machine as the single source of truth for legal status changes.

An append-only audit log (PaymentEvent) that can never be updated or deleted at the Python level, and (optionally) at the DB level.

Refunds modelled as their own rows, reserving funds against a payment so concurrent requests can't over-refund.

Provider clients behind a stable interface so the app never knows which PSP is in use.

Webhook ingestion with signature verification, raw-body logging, and idempotent settlement.

Scheduled reconciliation for payments and refunds stuck in non-terminal states.

The app deliberately does not send emails, push notifications, or WebSocket messages. It publishes signals; other apps subscribe.

# Installation
bash
pip install -r requirements.txt   # Django >= 5.1, cryptography, requests, djangorestframework
Add to INSTALLED_APPS:

python
INSTALLED_APPS = [
    # ...
    "django.contrib.contenttypes",
    "rest_framework",
    "payments",
]
Include the URLs:

python
# project/urls.py
urlpatterns = [
    path("api/payments/", include("payments.urls")),
    path("webhooks/", include("payments.urls_webhooks")),
]
Run migrations:

bash
python manage.py migrate payments
Configuration
All settings live under the TELEBIRR_* prefix for the Telebirr provider. Other providers are stubbed out and raise ProviderError when called.

python
# settings.py

# ── Telebirr ────────────────────────────────────────────
TELEBIRR_MERCHANT_APP_ID = env("TELEBIRR_MERCHANT_APP_ID")
TELEBIRR_APP_SECRET      = env("TELEBIRR_APP_SECRET")
TELEBIRR_PRIVATE_KEY     = env("TELEBIRR_PRIVATE_KEY")   # PEM string
TELEBIRR_PUBLIC_KEY      = env("TELEBIRR_PUBLIC_KEY")    # PEM string, for webhook verification
TELEBIRR_SHORT_CODE      = env("TELEBIRR_SHORT_CODE")
TELEBIRR_NOTIFY_URL      = "https://your-host/webhooks/telebirr/notify/"
TELEBIRR_RETURN_URL      = "https://your-host/webhooks/telebirr/return/"
TELEBIRR_RETURN_REDIRECT_URL = "/payments/status/"       # frontend redirect target
TELEBIRR_BASE_URL        = "https://api.telebirr.example"
TELEBIRR_MODE            = "live"                        # anything else = mock
The app is safe to run with TELEBIRR_MODE != "live" — the client runs in mock mode, returns a fake checkout URL, and can sign webhook payloads for tests.

# Architecture
text
┌──────────────┐    ┌───────────────┐    ┌────────────────┐
│  views.py    │───▶│  services.py  │───▶│ providers/*    │
│  views_      │    │  create/      │    │ Chapa, Telebirr│
│  webhooks.py │    │  refund/settle│    │ CBE, Manual    │
└──────┬───────┘    └───────┬───────┘    └────────────────┘
       │                    │
       ▼                    ▼
┌─────────────────────────────────────┐
│  models.py  (Payment, Refund,       │
│  PaymentEvent, ProviderWebhookLog)  │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  signals.py  (payment_status_changed,│
│  refund_failed)                     │
└─────────────────────────────────────┘
       │
       ▼
   tasks.py / management command (reconciliation)
Layering rules (enforced by convention, not by the type system):

Views never touch Payment.status directly. They call the service layer or a model method.

Services orchestrate — create reservation, call provider, apply transitions. No hand-written SQL.

Providers are the only place PSP network I/O happens.

Models own the state machine and invariants.

Signals are emitted inside the transition transaction. Receivers wrap their own I/O in transaction.on_commit.

# Frontend integration guide
Base URL: https://<your-host>/api/payments/
Auth: every endpoint requires an authenticated user.

# Concepts
Term	Meaning
Payment	A single money movement. Identified by a UUID reference.
Payable	The thing being paid for (appointment, invoice, etc.). The client never sends the amount; the server derives it.
Refund	A partial or full reversal of a succeeded payment.
Provider	chapa, telebirr, cbe_birr, or manual (staff-recorded cash).
Payment status lifecycle
text
pending ──▶ processing ──▶ succeeded ──▶ partially_refunded ──▶ refunded
   │            │              ▲              │
   │            │              │              └──▶ partially_refunded (again)
   ├──▶ failed  │              │
   ├──▶ cancelled              │
   └──▶ succeeded ◀────────────┘  (some providers settle directly from pending)
Terminal states (no further movement): failed, cancelled, refunded.

The API exposes is_terminal and is_paid as booleans so clients don't have to reimplement the rules.

Endpoints
Create a payment
text
POST /api/payments/payments/
field	type	required	notes
provider	string	yes	chapa, telebirr, cbe_birr, manual
payable_type	string	yes	registered payable name, e.g. appointment
payable_id	string	yes	id of the payable object
currency	string	no	default ETB
patient	int	no	user id of the person receiving care
idempotency_key	string	no	see Idempotency
expires_at	ISO datetime	no	
metadata	object	no	non-secret extras only
Do not send amount. It is derived server-side from the payable and rejected if supplied.

Response (201):

json
{
  "reference": "3f1c...",
  "provider": "telebirr",
  "amount": "250.00",
  "currency": "ETB",
  "amount_refunded": "0.00",
  "status": "processing",
  "failure_code": "",
  "created_at": "2025-01-01T10:00:00Z",
  "paid_at": null,
  "expires_at": null,
  "description": "Appointment APT-1042",
  "checkout_url": "https://checkout.telebirr/pay?outTradeNo=...",
  "payer": 42
}
What to do next:

checkout_url non-empty → redirect the user there.

provider == "manual" → no redirect; show the "cash recorded, awaiting settlement" screen. Only staff can create manual payments.

status == "failed" immediately → provider initiation failed; surface failure_code.

Errors:

status	when
400	unknown payable, unauthorized payer, non-positive amount, non-staff tried manual
502	upstream provider unreachable or rejected checkout
List / retrieve payments
text
GET /api/payments/payments/                 # list
GET /api/payments/payments/{reference}/     # one
Staff see all payments. Non-staff see only payments where they are payer, patient, or recorded_by.

Staff responses include the full Payment (refunds, events, provider refs, failure reasons). Non-staff responses use the slimmer PaymentPublic — no raw provider errors, no event log.

Poll payment status
text
GET /api/payments/payments/{reference}/status/
Use this after the user returns from the provider's checkout page. It is deliberately cheap and safe to poll every 2–3 seconds.

json
{
  "reference": "3f1c...",
  "status": "succeeded",
  "is_paid": true,
  "is_terminal": false,
  "amount": "250.00",
  "amount_refunded": "0.00",
  "currency": "ETB",
  "checkout_url": "",
  "paid_at": "2025-01-01T10:02:11Z"
}
Suggested polling logic:

js
while (!is_paid && !is_terminal && elapsed < 120_000) {
  await sleep(2000);
  ({ is_paid, is_terminal, status } = await refetch());
}
Stop when is_paid === true (show success) or is_terminal === true (show failure/cancel).

Request a refund
text
POST /api/payments/payments/{reference}/refund/
Staff only. Non-staff callers receive 403.

json
{ "amount": "50.00", "reason": "customer request" }
amount may be partial or the full remaining refundable balance. The server rejects over-refunds, including across concurrent requests.

Response (201) is a Refund with status: "pending". Refunds may later move to succeeded or failed; observe via the refund list or by polling the parent payment.

status	when
400	amount > available, payment not in a refundable state
403	caller is not staff
Settle a manual payment
text
POST /api/payments/payments/{reference}/settle_manual/
Staff or the recorded_by user only. Flips a cash payment from pending/processing to succeeded.

json
{
  "provider_reference": "receipt-123",
  "paid_at": "2025-01-01T10:00:00Z",
  "metadata": {}
}
Response is the full Payment object.

List refunds
text
GET /api/payments/refunds/                 # refunds on your payments
GET /api/payments/refunds/{reference}/     # one
Non-staff see refunds only for payments they can already see.

Idempotency
Send an idempotency_key (max 64 chars) on payment creation if your UI could submit twice — network retries, double taps, re-renders.

The key is scoped per payer: (payer, idempotency_key) is unique. Submitting the same key twice returns the existing payment instead of creating a second one.

js
const idem = crypto.randomUUID();
const res = await api.post("/payments/", { ..., idempotency_key: idem });
// On retry, reuse the SAME idem — you'll get the same payment, not a duplicate.
Do not generate a new key on retry, or you will create a duplicate payment.

Error handling
DRF default shape:

json
{ "field_or_detail": ["message", "..."] }
Messages you may need to localize:

message	meaning
"You are not authorized to pay for this."	payable-level authorization failed
"Payable has no amount due."	amount resolved to ≤ 0
"Only staff can record manual payments."	non-staff tried provider: "manual"
"No {type} with id {id}."	unknown payable id
"Unknown payable type '{name}'."	typo in payable_type
"Only {n} {CUR} is available."	over-refund attempt
Provider failures come back as HTTP 502 with {"detail": "..."}. Do not show detail raw to end users — it can contain provider text.

Field reference
PaymentPublic

field	notes
reference	UUID; use this everywhere, not id
provider	enum
amount, amount_refunded, currency	strings, 2-decimal
status	enum
failure_code	machine-readable, safe to display-map
created_at, paid_at, expires_at	ISO 8601, null when unset
description	receipt text, already denormalized
checkout_url	present only while processing; empty otherwise
payer	user id
Never present to clients: raw failure_reason, provider request/response payloads, PaymentEvent.payload, webhook bodies. These are staff-only and may contain PII or secrets.

Refund (client view)

field	notes
reference	UUID
amount	string
status	pending / succeeded / failed
reason	staff-supplied
created_at, updated_at, completed_at	ISO
Permissions
action	who
create payment	any authenticated user, for a payable they're authorized on
create manual payment	staff only
view payment	payer, patient, recorded_by, or staff
request refund	staff only
settle manual	staff, or the recorded_by user
view refund	anyone who can see the parent payment
Integration checklist
□ Generate an idempotency key per checkout attempt and persist it across retries.
□ Redirect to checkout_url on 201 when non-empty.
□ On return, hit /status/ and poll until is_paid or is_terminal.
□ Treat failure_code as the only failure string safe to show users.
□ Never trust query-string values from the provider's return URL.
□ Handle 502 on create by showing a retryable error, not by silently retrying with a new idempotency key.
□ For refunds, refetch the payment afterwards to see the updated amount_refunded.
Backend concerns
Data model
Payment
Key invariants enforced at the DB level:

constraint	purpose
amount > 0	
0 ≤ amount_refunded ≤ amount	cannot over-refund even if app code has a bug
(provider, provider_reference) unique when non-empty	duplicate provider refs blocked
(payer, idempotency_key) unique when key is not null	idempotency
content_type and object_id both null or both set	no orphan payables
provider = 'manual' ⇒ recorded_by IS NOT NULL	cash always attributable
PaymentEvent — append-only
Enforced in three places:

AppendOnlyQuerySet blocks update(), delete(), bulk_update().

PaymentEvent.save() raises ImmutableRecordError if self._state.adding is false.

PaymentEvent.delete() always raises.

This is a Python-level guarantee only. For a real append-only log, add a Postgres trigger:

sql
CREATE OR REPLACE FUNCTION paymentsevent_immutable()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'PaymentEvent rows are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER paymentsevent_no_update
  BEFORE UPDATE OR DELETE ON payments_paymentevent
  FOR EACH ROW EXECUTE FUNCTION paymentsevent_immutable();
Also revoke UPDATE/DELETE on that table from the app's DB role.

ProviderWebhookLog
Stores the raw body verbatim (needed for signature re-verification and dispute defense).

SENSITIVE_HEADER_MARKERS scrubs authorization, cookie, *token*, *secret*, *api-key*. Signature headers are intentionally preserved — they are the proof of validity.

Retention is unset. Bodies contain phone numbers and possibly health context. Decide a retention window and purge on a schedule. A reasonable start:

sql
DELETE FROM payments_providerwebhooklog
 WHERE processed = true
   AND received_at < now() - interval '90 days';
State machine
Defined once, in Payment.ALLOWED_TRANSITIONS. Everything else defers to it.

Notable design choices:

PARTIALLY_REFUNDED → PARTIALLY_REFUNDED is allowed on purpose so each additional partial refund writes a PaymentEvent.

SUCCEEDED → REFUNDED and SUCCEEDED → PARTIALLY_REFUNDED are the only outgoing edges from SUCCEEDED.

FAILED, CANCELLED, REFUNDED are fully terminal.

transition_to semantics
python
payment.transition_to(
    new_status,
    event_type="...",         # defaults to f"status.{new_status}"
    payload={...},            # stored on PaymentEvent
    actor=user_or_None,
    **updates,                # subset of _TRANSITION_FIELDS
)
Runs inside transaction.atomic().

Takes SELECT ... FOR UPDATE on the row and calls refresh_from_db(), so any unsaved changes on the caller's instance are discarded. Do not mutate a Payment instance and then call transition_to — pass changes as **updates.

Returns True on status change, False if the payment was already in the target status (used for duplicate-webhook safety).

Raises InvalidTransition for disallowed moves.

_TRANSITION_FIELDS whitelists which fields may be set alongside a transition. Adding a field means editing that frozenset.

Auto-sets paid_at on the first SUCCEEDED transition if it was null.

Writes a PaymentEvent and then emits payment_status_changed inside the transaction, so receivers that do I/O must use transaction.on_commit.

Services layer
create_payment
If idempotency_key is set and a matching (payer, key) exists → return it.

Insert a Payment in pending.

Write a payment.created event.

If provider == manual → return without calling anything.

Otherwise call client.initiate():

On ProviderError: transition to failed and re-raise.

On success: transition to processing with provider_reference, checkout_url, and metadata.out_trade_no.

IntegrityError on insert is treated as a lost race and resolved by re-selecting the existing row (only valid when idempotency_key is set).

settle_manual_payment
Only valid for provider == manual and status in {pending, processing}. Otherwise raises InvalidTransition.

request_refund
Calls Payment.request_refund(), which locks the row, checks status and available balance, inserts a pending Refund, and writes refund.requested.

Calls client.execute_refund().

On ProviderError → refund.mark_failed(...) and raise RefundError.

If the provider settles synchronously (result.succeeded) → refund.mark_succeeded(...).

Refund.mark_succeeded
Locks the payment, recomputes amount_refunded, and rejects if the new total would exceed payment.amount (defense-in-depth against the DB check).

Transitions the payment to partially_refunded or refunded depending on whether the new total equals the full amount.

Idempotent: returns False if already succeeded (duplicate webhook).

Refund.mark_failed
Idempotent: returns False if already failed.

Writes a refund.failed PaymentEvent and emits refund_failed.

Webhook handling
Worked example: views_webhooks.telebirr_notify.

Read raw body and headers.

Parse JSON; on failure log to ProviderWebhookLog and return 400.

Unwrap the optional data envelope.

Verify signature. On failure: log, alert, return 401 so the provider retries.

Always log the delivery to ProviderWebhookLog — even invalid ones — before any state change.

Resolve the Payment by transId → provider_reference, then fall back to outTradeNo, then metadata.out_trade_no.

If no payment → log, return 200 (stop retries; needs manual reconciliation).

If already succeeded/partially_refunded/refunded → mark log processed, return 200.

On a succeeded event, verify amount and currency before transitioning:

Mismatch → write a payment.telebirr.notify.amount_mismatch event, log, return 200 (retrying won't help; a human must intervene).

Transition; on InvalidTransition write a payment.telebirr.notify.conflict event, alert, return 200.

On unexpected exception, save the error to log_row.processing_error and return 500 so the provider retries.

Signature verification quirks (providers/telebirr.py)
Payload may be wrapped in data.

Trade-status vocabulary differs per leg: Completed for notify, PAY_SUCCESS for query/return, plus Failure, Expired.

Signing uses trans_id, but the field is sent as transId. The verifier tries both spellings.

Base64 + may arrive as a space after form decoding. _repair_base64 tries multiple repairs.

Both PSS and PKCS1v15 paddings are accepted.

Timestamps are epoch milliseconds; parse_notify_time normalizes.

Return leg
telebirr_return logs and redirects to TELEBIRR_RETURN_REDIRECT_URL (with ?reference= if resolvable). It never settles. This is a hard rule; do not weaken it.

Provider clients
BaseProvider / BaseProviderClient defines:

initiate(payment) → CheckoutResult

execute_refund(refund) → RefundResult

query(payment) → QueryResult

(The base also documents verify, refund, parse_webhook; current service code uses initiate, execute_refund, query.)

get_provider_client(provider) is lru_cached. When you add a provider, register it in _PROVIDER_CLIENTS and ensure the client is thread-safe (fresh HTTP session per call or proper connection pooling).

Known inconsistency to fix: services.providers.base defines InitiateResult, but services.py and telebirr_client.py use CheckoutResult. Pick one and delete the other.

Reconciliation
tasks.reconcile_stuck_payments and tasks.reconcile_stuck_refunds run the same logic exposed as a management command.

Thresholds (hard-coded):

PAYMENT_STUCK_AFTER = 30 min — payments in processing

REFUND_STUCK_AFTER = 30 min — refunds in pending

BATCH_SIZE = 100

Payment reconciliation queries the provider and transitions on succeeded/failed, leaves pending/unknown alone, and counts each outcome. InvalidTransition is caught and counted as an error, not raised.

Refund reconciliation currently just calls mark_failed on stuck refunds. The docstring claims it queries the provider first, but the code does not. Either implement the query or fix the docstring — the current behavior releases the reserved amount without confirming the provider didn't actually complete the refund. This is a real risk: if the provider succeeded but the app crashed before recording it, this job marks the refund failed and the money is refunded twice.

Recommended fix:

python
result = client.query_refund(refund)   # add this to BaseProvider
if result.status == "succeeded":
    refund.mark_succeeded(provider_reference=result.provider_reference)
elif result.status == "failed":
    refund.mark_failed(reason="reconciliation: provider confirms failure")
else:
    # still pending at provider — leave it, try again next run
    pass
Celery wiring is optional; the plain functions are importable for cron or a management command. The module swallows ImportError on celery deliberately.

Idempotency: both jobs are safe to run repeatedly. The mark_* methods and transition_to short-circuit on already-applied states.

Signals
signal	sent from	kwargs
payment_status_changed	Payment.transition_to	payment, event, old_status, new_status, actor
refund_failed	Refund.mark_failed	refund, reason, actor
Both are sent inside the transaction. Receivers that send emails, push notifications, or WebSocket messages must wrap their work in transaction.on_commit(...):

python
@receiver(payment_status_changed)
def notify_payer(sender, payment, new_status, **kwargs):
    if new_status != Payment.Status.SUCCEEDED:
        return
    transaction.on_commit(lambda: send_receipt.delay(payment.pk))
Known issues
Ordered by risk.

RefundRequestSerializer.validate_amount_against_payment is never called. The view calls request_refund directly, which does its own check, so the double-check is dead code. Either wire it into the serializer or delete it.

Refund reconciliation doesn't query the provider — risk of double refunds. See Reconciliation.

InitiateResult vs CheckoutResult — two dataclasses for the same shape. See Provider clients.

No retention policy on ProviderWebhookLog. See Data model.

Append-only enforcement is Python-only — add the Postgres trigger. See Data model.

_find_payment does a metadata__out_trade_no JSON lookup, which won't use a standard index on most databases. If webhook volume grows, add a GIN index or store out_trade_no in its own column.

telebirr_notify catches AmountMismatch twice — once inside the with transaction.atomic() block and once outside. The inner handler returns before the outer ever sees it; the outer is dead code for the success branch. The _check_notified_amount(payment, normalized_for_log) call is also duplicated. Clean up.

_post helper in telebirr_client.py is defined but unused. Remove or wire in.

parse_notify_time is imported by the webhook view but never used. Remove the import or start using it to normalize timestamps.

Payment.available_for_refund() queries refunds without locking — the caller (request_refund) does lock the payment row, so concurrent refunds serialize correctly, but the method itself is not safe to call standalone in a race.

StubProviderClient for MANUAL is instantiated without a name argument, but __init__ requires one. Payment.Provider.MANUAL: StubProviderClient() will raise TypeError at import if that dict is ever evaluated. Pass "MANUAL".

services.py imports TelebirrClient from .providers.telebirr_client, but the webhook module imports helpers from .services.providers.telebirr. Two different paths for Telebirr code. Consolidate.

Testing
TestPayable exists only for the payments test suite. It must never be referenced by production code; a test that imports it from a non-test module is a bug.

Mock provider clients return a deterministic pending from query(), so reconciliation tests can drive states explicitly.

Webhook tests should build payloads with TelebirrClient.sign() so the same verifier path is exercised end-to-end.

For the append-only guarantee, add a test that calls PaymentEvent.objects.filter(...).update(...) and asserts ImmutableRecordError.

bash
python manage.py test payments
Operational runbook
symptom	action
payment stuck in processing > 30 min	reconciliation job queries the provider on its next run; if the provider is down, check ProviderWebhookLog for unprocessed deliveries
webhook signature failures spiking	check key rotation; verify TELEBIRR_PUBLIC_KEY matches the provider's current key; inspect ProviderWebhookLog rows with signature_valid=False
amount-mismatch events	a client is sending the wrong amount, or the payable changed after checkout began; inspect the event payload
terminal-state conflict events	a success webhook arrived for a cancelled/failed payment; a human must decide whether to refund or re-open
refund stuck in pending	run reconcile_stuck_refunds; if the provider says succeeded but the row is pending, manually call mark_succeeded with the provider ref
Manual reconciliation:

bash
python manage.py reconcile_payments
Contributing
Preserve the layering. Views do not write to Payment.status. Services orchestrate. Providers are the only place network I/O happens.

Add invariants to the DB, not just to Python. If you can express a rule as a CheckConstraint or a unique index, do it.

Every state change writes a PaymentEvent. If you add a new transition, add it to ALLOWED_TRANSITIONS and make sure it emits an event.

New provider checklist:

Implement BaseProvider (or BaseProviderClient) with initiate, execute_refund, query.
Add to _PROVIDER_CLIENTS in services.py.
Add a Provider enum value to Payment.Provider.
Add a webhook view under views_webhooks.py with signature verification and raw-body logging.
Add reconciliation support to BaseProvider.query and confirm reconcile_stuck_payments handles the statuses your provider returns.
Run the tests before opening a PR.

License: add your project's license here.
Maintainers: add your team's contact here.