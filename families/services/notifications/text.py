# families/services/notifications/text.py

def _member_label(member):
    return member.full_name


def observer_accepted_message(observer):
    return f"{observer.get_full_name()} accepted your invitation."


def observer_registered_message(observer):
    return f"{observer.get_full_name()} joined the family."


def membership_revoked_message(family):
    return f"Your access to {family.name or 'the family'} was revoked."


def membership_permissions_changed_message(family, changed_fields):
    human = ", ".join(f.replace("can_view_", "").replace("_", " ") for f in changed_fields)
    return f"Your access to {human} was updated."


def member_created_message(member):
    return f"{_member_label(member)} was added to the family."


def member_updated_message(member):
    return f"{_member_label(member)}'s information was updated."


def member_deleted_message(member):
    return f"{_member_label(member)} was removed from the family."


def reading_recorded_message(member, reading):
    return f"New {reading.get_kind_display().lower()} for {_member_label(member)}: {reading.value}."


def care_plan_item_completed_message(member, item):
    return f"{item.title} marked done for {_member_label(member)}."


def visit_scheduled_message(member, visit):
    return f"A visit was scheduled for {_member_label(member)}."


def visit_started_message(member, visit):
    return f"A visit is now in progress for {_member_label(member)}."


def visit_ended_message(member, visit):
    return f"The visit for {_member_label(member)} has ended."


def attention_flag_resolved_message(flag):
    return f"'{flag.title}' was marked resolved."