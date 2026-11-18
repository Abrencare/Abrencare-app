Payments Module Documentation
Two documents follow: one for frontend integrators, one for backend engineers. Both are drawn directly from the code you pasted.

Document 1 — Frontend Integration Guide
Audience: web/mobile client developers integrating with the payments API.

Base URL: https://<your-host>/api/payments/ (adjust to your project's URL prefix).

Auth: every endpoint requires an authenticated user (Authorization: Bearer <token> or session cookie, matching your DRF config).

1. Concepts you need to know
Payment — a single money movement. Has a UUID reference you use everywhere.

Payable — the thing being paid for (appointment, invoice, etc.). You never send the amount; the server derives it from the payable.

Refund — a partial or full reversal of a succeeded payment.

Status — a payment moves through a defined lifecycle (below). You never set status directly.

Provider — chapa, telebirr, cbe_birr, or manual (staff-recorded cash).

Payment status lifecycle
text
pending ──▶ processing ──▶ succeeded ──▶ partially_refunded ──▶ refunded
   │            │              ▲              │
   │            │              │              └──▶ partially_refunded (again)
   ├──▶ failed  │              │
   ├──▶ cancelled              │
   └──▶ succeeded ◀────────────┘  (some providers settle directly from pending)
Terminal states (no further movement): failed, cancelled, refunded.

is_terminal and is_paid are exposed as booleans on every payment so you don't have to reimplement the rules.

2. Endpoints
2.1 Create a payment
text
POST /api/payments/payments/
Body

field	type	required	notes
provider	string	yes	chapa, telebirr, cbe_birr, manual
payable_type	string	yes	registered payable name, e.g. appointment
payable_id	string	yes	id of the payable object
currency	string	no	default ETB
patient	int	no	user id of the person receiving care
idempotency_key	string	no	see §4
expires_at	ISO datetime	no	
metadata	object	no	non-secret extras only
Do not send amount. It is derived server-side from the payable and rejected if you try.

Response (201) — a PaymentPublic object:

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

If checkout_url is non-empty → redirect the user there.

If provider == "manual" → no redirect; show the "cash recorded, awaiting settlement" screen. Only staff may create manual payments.

If status == "failed" immediately → the provider initiation failed; surface failure_code.

Possible errors

status	when
400	unknown payable, unauthorized payer, non-positive amount, non-staff tried manual
502	upstream provider unreachable / rejected checkout
2.2 List / retrieve payments
text
GET /api/payments/payments/                 # list (own payments unless staff)
GET /api/payments/payments/{reference}/     # one payment
Staff see all payments. Non-staff see only payments where they are payer, patient, or recorded_by.

Staff response includes the full Payment (refunds, events, provider refs, failure reasons).
Non-staff response is the slimmer PaymentPublic (no raw provider errors, no event log).

2.3 Poll payment status
text
GET /api/payments/payments/{reference}/status/
Use this after the user returns from the provider's checkout page and before your own webhook/redirect handling completes. It is deliberately cheap and safe to poll every 2–3 seconds.

Response

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
Suggested polling logic

text
while not is_paid and not is_terminal and elapsed < 2 minutes:
    sleep 2s; refetch
Stop when is_paid == true (show success) or is_terminal == true (show failure/cancel).

2.4 Request a refund
text
POST /api/payments/payments/{reference}/refund/
Staff only (see §7). Non-staff callers get 403.

Body

json
{ "amount": "50.00", "reason": "customer request" }
amount may be partial or the full remaining refundable balance. The server rejects over-refunds, including across concurrent requests.

Response (201) — a Refund object with status: "pending". The refund may later move to succeeded or failed, which you observe via the refund list (§2.6) or by polling the payment.

Errors

status	when
400	amount > available, payment not in a refundable state
403	caller is not staff
2.5 Settle a manual payment
text
POST /api/payments/payments/{reference}/settle_manual/
Staff or the recorded_by user only. Used to flip a cash payment from pending/processing to succeeded once money is in hand.

Body

json
{
  "provider_reference": "receipt-123",
  "paid_at": "2025-01-01T10:00:00Z",
  "metadata": {}
}
Response — the full Payment object.

2.6 List refunds
text
GET /api/payments/refunds/                 # refunds on your payments
GET /api/payments/refunds/{reference}/     # one refund
Non-staff see refunds only for payments they can already see.

3. Webhooks (server side, for awareness)
These are not called by browsers. They're listed here so frontend engineers know which URLs the providers hit and when the redirect leg fires.

URL	method	purpose
/webhooks/telebirr/notify/	POST	server-to-server settlement. Returns JSON {"code":"0","msg":"ok"} on success.
/webhooks/telebirr/return/	GET	user redirect after checkout. Redirects to TELEBIRR_RETURN_REDIRECT_URL (default /payments/status/?reference=...).
For your redirect/status page:

Read the reference query parameter.

Immediately call GET /api/payments/payments/{reference}/status/.

If status is not yet terminal, poll every 2–3 seconds for up to ~2 minutes.

The redirect leg never settles a payment. Only the notify webhook does. Never mark a payment paid based on query-string values.

4. Idempotency
Send an idempotency_key (max 64 chars) on payment creation if your UI could submit twice — network retries, double taps, re-renders.

The key is scoped per payer: the pair (payer, idempotency_key) is unique. Submitting the same key twice returns the existing payment instead of creating a second one.

Recommended client pattern

js
const idem = crypto.randomUUID();
const res = await api.post("/payments/", { ..., idempotency_key: idem });
// If the request times out, retry with the SAME idem — you'll get the
// same payment, not a duplicate.
Do not generate a new key on retry, or you will create a duplicate payment.

5. Error format
DRF default shape:

json
{ "field_or_detail": ["message", "..."] }
Common messages you may need to localize:

message	meaning
"You are not authorized to pay for this."	payable-level authorization failed
"Payable has no amount due."	amount resolved to ≤ 0
"Only staff can record manual payments."	non-staff tried provider: "manual"
"No {type} with id {id}."	unknown payable id
"Unknown payable type '{name}'."	typo in payable_type
"Only {n} {CUR} is available."	over-refund attempt
Provider failures come back as HTTP 502 with a {"detail": "..."} body. Do not show detail raw to end users — it can contain provider text.

6. Field reference (client-visible)
PaymentPublic
field	notes
reference	UUID; use this everywhere, not id
provider	enum
amount, amount_refunded, currency	strings, 2-decimal
status	enum
failure_code	machine-readable, safe to display-mapped
created_at, paid_at, expires_at	ISO 8601, null when unset
description	receipt text, already denormalized
checkout_url	present only while processing; empty otherwise
payer	user id
Never present: raw failure_reason, provider request/response payloads, PaymentEvent.payload, webhook bodies. These are staff-only and may contain PII or secrets.

Refund (client view)
field	notes
reference	UUID
amount	string
status	pending / succeeded / failed
reason	staff-supplied
created_at, updated_at, completed_at	ISO
7. Permissions summary
action	who
create payment	any authenticated user, for a payable they're authorized on
create manual payment	staff only
view payment	payer, patient, recorded_by, or staff
request refund	staff only
settle manual	staff, or the recorded_by user
view refund	anyone who can see the parent payment
8. Integration checklist
□ Generate an idempotency key per checkout attempt and persist it across retries.
□ Redirect to checkout_url on 201 when it's non-empty.
□ On return, hit /status/ and poll until is_paid or is_terminal.
□ Treat failure_code as the only failure string safe to show users.
□ Never trust query-string values from the provider's return URL.
□ Handle 502 on create by showing a retryable error, not by silently retrying with a new idempotency key.
□ For refunds, refetch the payment afterwards to see the updated amount_refunded.
Document 2 — Backend Concerns
Audience: backend engineers maintaining or extending payments.

1. Architecture at a glance
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
Layering rules the code already follows and you should preserve:

Views never touch Payment.status directly. They call the service layer or a model method.

Services orchestrate: create reservation, call provider, apply transitions. They never write SQL by hand.

Providers are swappable via get_provider_client() and are the only place network I/O to a PSP happens.

Models own the state machine and invariants. The Payment.ALLOWED_TRANSITIONS dict is the single source of truth.

Signals are emitted inside the transition transaction. Receivers must wrap their own I/O in transaction.on_commit.

2. Data model
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

This is a Python-level guarantee only. For a real append-only audit log, add a Postgres trigger:

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

SENSITIVE_HEADER_MARKERS scrubs authorization, cookie, *token*, *secret*, *api-key*. Signature headers are intentionally preserved (they're the proof of validity).

Retention is unset. Bodies contain phone numbers and possibly health context. Decide a retention window and purge on a schedule (processed=True AND received_at < now() - interval '90 days' is a reasonable start).

3. State machine
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

Takes SELECT ... FOR UPDATE on the row and calls refresh_from_db(), so any unsaved changes on the caller's instance are discarded. Do not rely on mutating a Payment instance and then calling transition_to — pass changes as **updates.

Returns True on status change, False if the payment was already in the target status (used for duplicate-webhook safety).

Raises InvalidTransition for disallowed moves.

_TRANSITION_FIELDS whitelists which fields may be set alongside a transition. Adding a field means editing that frozenset.

Auto-sets paid_at on the first SUCCEEDED transition if it was null.

Writes a PaymentEvent and then emits payment_status_changed inside the transaction, so receivers that do I/O must use transaction.on_commit.

4. Services
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
Calls Payment.request_refund() which locks the row, checks status and available balance, inserts a pending Refund, and writes refund.requested.

Calls client.execute_refund().

On ProviderError → refund.mark_failed(...) and raise RefundError.

If the provider settles synchronously (result.succeeded) → refund.mark_succeeded(...).

Refund.mark_succeeded
Locks the payment, recomputes amount_refunded, and rejects if the new total would exceed payment.amount (defense-in-depth against the DB check).

Transitions the payment to partially_refunded or refunded depending on whether the new total equals the full amount.

Idempotent: returns False if already succeeded (duplicate webhook).

Refund.mark_failed
Idempotent: returns False if already failed.

Writes a refund.failed PaymentEvent and emits the refund_failed signal.

5. Webhook handling (Telebirr as the worked example)
views_webhooks.telebirr_notify:

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

Trade-status vocabulary differs per leg: Completed for notify, PAY_SUCCESS for query/return, Failure, Expired.

Signing uses trans_id, but the field is sent as transId. The verifier tries both spellings.

Base64 + may arrive as a space after form decoding. _repair_base64 tries multiple repairs.

Both PSS and PKCS1v15 paddings are accepted.

Timestamps are epoch milliseconds; parse_notify_time normalizes.

Return leg
telebirr_return logs and redirects to TELEBIRR_RETURN_REDIRECT_URL (with ?reference= if resolvable). It never settles. This is a hard rule; do not weaken it.

6. Provider client interface
BaseProvider / BaseProviderClient defines:

initiate(payment) → CheckoutResult

execute_refund(refund) → RefundResult

query(payment) → QueryResult

(Base also documents verify, refund, parse_webhook; the current service code uses initiate, execute_refund, query.)

get_provider_client(provider) is lru_cached. When you add a provider, register it in _PROVIDER_CLIENTS and make sure the client is thread-safe and creates a fresh HTTP session per call or has proper connection pooling.

Known inconsistency to fix: services.providers.base defines InitiateResult, but services.py and telebirr_client.py use CheckoutResult. Pick one and delete the other.

7. Reconciliation
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
Celery wiring is optional; the plain functions are importable for cron or a management command. The module swallows ImportError on celery, which is deliberate.

Idempotency: both jobs are safe to run repeatedly. The mark_* methods and transition_to short-circuit on already-applied states.

8. Signals
signal	sent from	kwargs
payment_status_changed	Payment.transition_to	payment, event, old_status, new_status, actor
refund_failed	Refund.mark_failed	refund, reason, actor
Both are sent inside the transaction. Receivers that send emails, push notifications, or WebSocket messages must wrap their work in transaction.on_commit(...). Example:

python
@receiver(payment_status_changed)
def notify_payer(sender, payment, new_status, **kwargs):
    if new_status != Payment.Status.SUCCEEDED:
        return
    transaction.on_commit(lambda: send_receipt.delay(payment.pk))
9. Known issues / TODOs
Ordered by risk.

RefundRequestSerializer.validate_amount_against_payment is never called. The view calls request_refund directly, which does its own check, so the double-check is dead code. Either wire it into the serializer or delete it.

Refund reconciliation doesn't query the provider (see §7). Risk of double refunds.

InitiateResult vs CheckoutResult — two dataclasses for the same shape (see §6).

No retention policy on ProviderWebhookLog (see §2).

Append-only enforcement is Python-only — add the Postgres trigger (§2).

_find_payment does a metadata__out_trade_no JSON lookup, which won't use a standard index on most databases. If webhook volume grows, add a GIN index or store out_trade_no in its own column.

telebirr_notify catches AmountMismatch twice — once inside the with transaction.atomic() block and once outside. The inner handler returns before the outer ever sees it; the outer is dead code for the success branch. The _check_notified_amount(payment, normalized_for_log) call is also duplicated. Clean up.

_post helper in telebirr_client.py is defined but unused. Remove or wire in.

parse_notify_time is imported by the webhook view but never used. Remove the import or start using it to normalize timestamps.

Payment.available_for_refund() queries refunds without locking — the caller (request_refund) does lock the payment row, so concurrent refunds serialize correctly, but the method itself is not safe to call standalone in a race.

StubProviderClient for MANUAL is instantiated without a name argument, but __init__ requires one. Payment.Provider.MANUAL: StubProviderClient() will raise TypeError at import if that dict is ever evaluated. Pass "MANUAL".

services.py imports TelebirrClient from .providers.telebirr_client, but the webhook module imports helpers from .services.providers.telebirr. Two different paths for Telebirr code. Consolidate.

10. Testing notes
TestPayable exists only for the payments test suite. It must never be referenced by production code; a test that imports it in a non-test module is a bug.

Mock provider clients return deterministic pending from query(), so reconciliation tests can drive states explicitly.

Webhook tests should build payloads with TelebirrClient.sign() so the same verifier path is exercised end-to-end.

For the append-only guarantee, add a test that calls PaymentEvent.objects.filter(...).update(...) and asserts ImmutableRecordError.

11. Operational runbook (short)
symptom	action
payment stuck in processing > 30 min	reconciliation job will query the provider on its next run; if the provider is down, check ProviderWebhookLog for unprocessed deliveries
webhook signature failures spiking	check key rotation; verify TELEBIRR_PUBLIC_KEY matches the provider's current key; inspect ProviderWebhookLog.signature_valid=False rows
amount-mismatch events	a client is sending the wrong amount or the payable changed after checkout began; inspect the event payload
terminal-state conflict events	a success webhook arrived for a cancelled/failed payment; a human must decide whether to refund or re-open
refund stuck in pending	run reconcile_stuck_refunds; if the provider says succeeded but the row is pending, manually call mark_succeeded with the provider ref
