import type { AuthUser, FamilyMember, FamilyRelationship } from '@/types/auth';
import type { en } from '@/i18n/translations';

type Copy = typeof en;

export function memberInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'AC';
}

export function activeFamilyMember(user: AuthUser | null): FamilyMember | null {
  if (!user?.activeFamilyMemberId) {
    return null;
  }

  return (
    user.familyMembers.find(
      (member) => member.id === user.activeFamilyMemberId,
    ) ?? null
  );
}

export function relationshipLabel(
  relationship: FamilyRelationship,
  copy: Copy['familyAdd'],
) {
  return copy[relationship];
}

export function memberSummary(
  member: FamilyMember,
  copy: Copy['familyAdd'],
) {
  const parts = [
    relationshipLabel(member.relationship, copy),
    member.ageYears !== null
      ? copy.dobAge.replace('{age}', String(member.ageYears))
      : null,
    member.city || null,
  ].filter(Boolean);

  return parts.join(' · ');
}
