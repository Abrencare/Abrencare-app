# families/services/notifications/facade.py

from notifications.services.notification_service import NotificationService

from .recipients import family_recipients
from .text import (
    membership_permissions_changed_message,
    membership_revoked_message,
    member_created_message,
    member_deleted_message,
    member_updated_message,
    observer_accepted_message,
    observer_registered_message,
    reading_recorded_message,
    visit_ended_message,
    visit_scheduled_message,
    visit_started_message,
    care_plan_item_completed_message,
    attention_flag_resolved_message,
)


class _Notify:

    # ------------------------------------------------------------
    # Invitation → owner
    # ------------------------------------------------------------

    def family_observer_accepted(self, *, family, observer):
        owner = family.user_service.user
        if owner.id == observer.id:
            return

        return NotificationService.create(
            user=owner,
            title="New family member joined",
            message=observer_accepted_message(observer),
            notification_type="family.observer_accepted",
            data={
                "family_id": family.id,
                "observer_user_id": observer.id,
                "route": f"/family/memberships",
            },
        )

    def family_observer_registered(self, *, family, observer):
        owner = family.user_service.user
        if owner.id == observer.id:
            return

        return NotificationService.create(
            user=owner,
            title="New family member registered",
            message=observer_registered_message(observer),
            notification_type="family.observer_registered",
            data={
                "family_id": family.id,
                "observer_user_id": observer.id,
                "route": f"/family/memberships",
            },
        )

    # ------------------------------------------------------------
    # Membership → observer
    # ------------------------------------------------------------

    def family_membership_revoked(self, *, family, observer, revoked_by):
        if observer.id == revoked_by.id:
            return
        return NotificationService.create(
            user=observer,
            title="Your family access was revoked",
            message=membership_revoked_message(family),
            notification_type="family.membership_revoked",
            data={
                "family_id": family.id,
                "revoked_by_user_id": revoked_by.id,
                "route": "/family",
            },
        )

    def family_membership_permissions_changed(
        self, *, family, observer, changed_by, changed_fields,
    ):
        if observer.id == changed_by.id or not changed_fields:
            return
        return NotificationService.create(
            user=observer,
            title="Your access was updated",
            message=membership_permissions_changed_message(family, changed_fields),
            notification_type="family.membership_permissions_changed",
            data={
                "family_id": family.id,
                "changed_by_user_id": changed_by.id,
                "changed_fields": changed_fields,
                "route": "/family",
            },
        )

    # ------------------------------------------------------------
    # Member roster → observers
    # ------------------------------------------------------------

    def family_member_created(self, *, family, member, actor):
        recipients = [
            u for u in family_recipients(family, include_owner=False)
            if u.id != actor.id
        ]
        if not recipients:
            return []
        return NotificationService.broadcast(
            users=recipients,
            title="New family member added",
            message=member_created_message(member),
            notification_type="family.member_created",
            data={
                "family_id": family.id,
                "member_id": member.id,
                "route": f"/family/members/{member.id}",
            },
        )

    def family_member_updated(self, *, family, member, actor):
        recipients = [
            u for u in family_recipients(family, include_owner=False)
            if u.id != actor.id
        ]
        if not recipients:
            return []
        return NotificationService.broadcast(
            users=recipients,
            title="Family member updated",
            message=member_updated_message(member),
            notification_type="family.member_updated",
            data={
                "family_id": family.id,
                "member_id": member.id,
                "route": f"/family/members/{member.id}",
            },
        )

    def family_member_deleted(self, *, family, member, actor):
        recipients = [
            u for u in family_recipients(family, include_owner=False)
            if u.id != actor.id
        ]
        if not recipients:
            return []
        return NotificationService.broadcast(
            users=recipients,
            title="Family member removed",
            message=member_deleted_message(member),
            notification_type="family.member_deleted",
            data={
                "family_id": family.id,
                "member_id": member.id,
                "route": "/family",
            },
        )

    # ------------------------------------------------------------
    # Clinical records → observers (per-section flags)
    # ------------------------------------------------------------

    def family_reading_recorded(self, *, family, member, reading, actor):
        # Flagged readings go to the attention audience; regular ones to
        # the readings audience.
        if reading.tone == "flag":
            recipients = [
                u for u in family_recipients(
                    family, include_owner=True, require_permission="can_view_attention",
                ) if u.id != actor.id
            ]
            ntype = "family.reading_flagged"
            title = "Reading needs attention"
        else:
            recipients = [
                u for u in family_recipients(
                    family, include_owner=False, require_permission="can_view_readings",
                ) if u.id != actor.id
            ]
            ntype = "family.reading_recorded"
            title = "New reading recorded"

        if not recipients:
            return []
        return NotificationService.broadcast(
            users=recipients,
            title=title,
            message=reading_recorded_message(member, reading),
            notification_type=ntype,
            data={
                "family_id": family.id,
                "member_id": member.id,
                "reading_id": reading.id,
                "kind": reading.kind,
                "tone": reading.tone,
                "route": f"/family/members/{member.id}/readings",
            },
        )

    def family_care_plan_item_completed(self, *, family, member, item, actor):
        recipients = [
            u for u in family_recipients(
                family, include_owner=False, require_permission="can_view_care_plan",
            ) if u.id != actor.id
        ]
        if not recipients:
            return []
        return NotificationService.broadcast(
            users=recipients,
            title="Care plan updated",
            message=care_plan_item_completed_message(member, item),
            notification_type="family.care_plan_item_completed",
            data={
                "family_id": family.id,
                "member_id": member.id,
                "item_id": item.id,
                "route": f"/family/members/{member.id}/care-plan",
            },
        )

    def family_visit_scheduled(self, *, family, member, visit, actor):
        recipients = [
            u for u in family_recipients(
                family, include_owner=False, require_permission="can_view_visits",
            ) if u.id != actor.id
        ]
        if not recipients:
            return []
        return NotificationService.broadcast(
            users=recipients,
            title="Visit scheduled",
            message=visit_scheduled_message(member, visit),
            notification_type="family.visit_scheduled",
            data={
                "family_id": family.id,
                "member_id": member.id,
                "visit_id": visit.id,
                "route": f"/family/members/{member.id}/visits",
            },
        )

    def family_visit_started(self, *, family, member, visit, actor):
        recipients = [
            u for u in family_recipients(
                family, include_owner=False, require_permission="can_view_visits",
            ) if u.id != actor.id
        ]
        if not recipients:
            return []
        return NotificationService.broadcast(
            users=recipients,
            title="Visit started",
            message=visit_started_message(member, visit),
            notification_type="family.visit_started",
            data={
                "family_id": family.id,
                "member_id": member.id,
                "visit_id": visit.id,
                "route": f"/family/members/{member.id}/visits/{visit.id}",
            },
        )

    def family_visit_ended(self, *, family, member, visit, actor):
        recipients = [
            u for u in family_recipients(
                family, include_owner=False, require_permission="can_view_visits",
            ) if u.id != actor.id
        ]
        if not recipients:
            return []
        return NotificationService.broadcast(
            users=recipients,
            title="Visit completed",
            message=visit_ended_message(member, visit),
            notification_type="family.visit_ended",
            data={
                "family_id": family.id,
                "member_id": member.id,
                "visit_id": visit.id,
                "route": f"/family/members/{member.id}/visits/{visit.id}",
            },
        )

    def family_attention_flag_resolved(self, *, family, flag, actor):
        recipients = [
            u for u in family_recipients(
                family, include_owner=False, require_permission="can_view_attention",
            ) if u.id != actor.id
        ]
        if not recipients:
            return []
        return NotificationService.broadcast(
            users=recipients,
            title="Attention item resolved",
            message=attention_flag_resolved_message(flag),
            notification_type="family.attention_flag_resolved",
            data={
                "family_id": family.id,
                "flag_id": flag.id,
                "route": "/family/attention",
            },
        )


notify = _Notify()