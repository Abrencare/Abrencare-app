# payments/signals.py
"""Signals emitted by the payments app.

Receivers elsewhere subscribe to these. The payments app itself never
imports notifications, email, SMS, or any other dispatch layer — it only
publishes the fact that a payment changed.
"""
import django.dispatch

# Sent after a Payment row transitions to a new status, inside the same
# transaction as the transition. Receivers should use transaction.on_commit
# before doing I/O (WebSocket sends, emails, HTTP calls).
payment_status_changed = django.dispatch.Signal()

# Kwargs:
#   payment       — the Payment instance (already saved)
#   event         — the PaymentEvent row that was just created
#   old_status    — previous status string
#   new_status    — new status string
#   actor         — the user who caused the change, or None

refund_failed = django.dispatch.Signal()