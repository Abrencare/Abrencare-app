# payments/management/commands/reconcile_payments.py
from django.core.management.base import BaseCommand

from payments.tasks import (
    reconcile_stuck_payments,
    reconcile_stuck_refunds,
)


class Command(BaseCommand):
    help = "Reconcile payments and refunds stuck in non-terminal states."

    def handle(self, *args, **options):
        self.stdout.write("Reconciling stuck payments...")
        p_counts = reconcile_stuck_payments()
        self.stdout.write(str(p_counts))

        self.stdout.write("Reconciling stuck refunds...")
        r_counts = reconcile_stuck_refunds()
        self.stdout.write(str(r_counts))