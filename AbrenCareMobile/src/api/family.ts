import { apiRequest } from '@/api/client';
import { isApiConfigured } from '@/api/config';
import { ApiError } from '@/api/errors';
import { hasSession } from '@/api/session';
import {
  kindFromRelationship,
  type FamilyMember,
  type FamilyRelationship,
} from '@/types/auth';
import { ageYearsFromIso } from '@/utilities/birthInput';

const RELATIONSHIPS = new Set([
  'self',
  'mother',
  'father',
  'parent',
  'spouse',
  'child',
  'sibling',
  'relative',
  'other',
]);

const INVITE_TOKEN = /^[A-Za-z0-9._~-]{8,512}$/;

export type FamilyRole = 'owner' | 'observer';

export type FamilyCapabilities = {
  can_read_family: boolean;
  can_write_family: boolean;
  can_read_members: boolean;
  can_write_members: boolean;
  can_read_readings: boolean;
  can_read_care_plan: boolean;
  can_read_visits: boolean;
  can_read_reports: boolean;
  can_read_prescriptions: boolean;
  can_read_lab_results: boolean;
  can_read_history: boolean;
  can_read_attention: boolean;
  can_read_care_team: boolean;
  can_manage_memberships: boolean;
  can_manage_invitations: boolean;
};

export type FamilyProfile = {
  id: number | null;
  name: string;
  onboarded: boolean;
  members: FamilyMember[];
};

export type FamilyHome = {
  profile: FamilyProfile;
  role: FamilyRole | null;
  capabilities: FamilyCapabilities | null;
  missing: boolean;
};

export type FamilySection =
  | 'readings'
  | 'care-plan'
  | 'visits'
  | 'reports'
  | 'prescriptions'
  | 'labs'
  | 'history';

const OWNER_CAPABILITIES: FamilyCapabilities = {
  can_read_family: true,
  can_write_family: true,
  can_read_members: true,
  can_write_members: true,
  can_read_readings: true,
  can_read_care_plan: true,
  can_read_visits: true,
  can_read_reports: true,
  can_read_prescriptions: true,
  can_read_lab_results: true,
  can_read_history: true,
  can_read_attention: true,
  can_read_care_team: true,
  can_manage_memberships: true,
  can_manage_invitations: true,
};

const listeners = new Set<() => void>();

export function subscribeFamilyChanges(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyFamilyChanged() {
  listeners.forEach((listener) => listener());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function isServerMemberId(id: string) {
  return /^[1-9]\d*$/.test(id);
}

function relationshipOf(value: string): FamilyRelationship {
  if (
    value === 'mother' ||
    value === 'father' ||
    value === 'parent' ||
    value === 'spouse' ||
    value === 'child' ||
    value === 'other'
  ) {
    return value;
  }
  return 'other';
}

export function memberToApi(member: FamilyMember, primary: boolean) {
  const relationship = RELATIONSHIPS.has(member.relationship)
    ? member.relationship
    : 'other';
  const body: Record<string, unknown> = {
    name: member.name.trim(),
    relationship,
    is_primary: primary,
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(member.dateOfBirth)) {
    body.dateOfBirth = member.dateOfBirth;
  }
  if (member.phone.trim()) {
    body.phone = member.phone.trim();
  }
  if (member.city.trim()) {
    body.city = member.city.trim();
  }
  if (member.address.trim()) {
    body.address = member.address.trim();
  }
  if (member.emergencyPhone.trim()) {
    body.emergencyPhone = member.emergencyPhone.trim();
  }
  if (member.notes.trim()) {
    body.notes = member.notes.trim();
  }
  return body;
}

export function memberFromApi(value: unknown): FamilyMember | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  const name = text(row.name) || text(row.full_name);
  const id =
    typeof row.id === 'number' || typeof row.id === 'string' ? String(row.id).trim() : '';
  if (!name || !id) {
    return null;
  }
  const relationship = relationshipOf(text(row.relationship));
  const dateOfBirth = text(row.dateOfBirth) || text(row.date_of_birth);
  return {
    id,
    kind: kindFromRelationship(relationship),
    name,
    relationship,
    dateOfBirth,
    ageYears: ageYearsFromIso(dateOfBirth),
    phone: text(row.phone),
    city: text(row.city),
    address: text(row.address),
    emergencyPhone: text(row.emergencyPhone) || text(row.emergency_phone),
    careNeeds: [],
    preferredLanguage: '',
    notes: text(row.notes),
    status: 'active',
  };
}

function profileFromApi(value: unknown): FamilyProfile {
  const row = asRecord(value) ?? {};
  const membersRaw = Array.isArray(row.members) ? row.members : [];
  return {
    id: typeof row.id === 'number' ? row.id : null,
    name: text(row.name),
    onboarded: row.onboarded === true,
    members: membersRaw
      .map(memberFromApi)
      .filter((member): member is FamilyMember => member !== null),
  };
}

function capabilitiesFromApi(value: unknown): {
  role: FamilyRole | null;
  capabilities: FamilyCapabilities | null;
} {
  const row = asRecord(value);
  const caps = asRecord(row?.capabilities);
  const role = row?.role === 'owner' || row?.role === 'observer' ? row.role : null;
  if (!caps) {
    return { role, capabilities: null };
  }
  const flag = (key: keyof FamilyCapabilities) => caps[key] === true;
  return {
    role,
    capabilities: {
      can_read_family: flag('can_read_family'),
      can_write_family: flag('can_write_family'),
      can_read_members: flag('can_read_members'),
      can_write_members: flag('can_write_members'),
      can_read_readings: flag('can_read_readings'),
      can_read_care_plan: flag('can_read_care_plan'),
      can_read_visits: flag('can_read_visits'),
      can_read_reports: flag('can_read_reports'),
      can_read_prescriptions: flag('can_read_prescriptions'),
      can_read_lab_results: flag('can_read_lab_results'),
      can_read_history: flag('can_read_history'),
      can_read_attention: flag('can_read_attention'),
      can_read_care_team: flag('can_read_care_team'),
      can_manage_memberships: flag('can_manage_memberships'),
      can_manage_invitations: flag('can_manage_invitations'),
    },
  };
}

async function canSend() {
  return isApiConfigured() && (await hasSession());
}

export async function fetchFamilyHome(): Promise<FamilyHome | null> {
  if (!(await canSend())) {
    return null;
  }
  try {
    const profile = profileFromApi(await apiRequest('/api/family/profile/'));
    let role: FamilyRole | null = null;
    let capabilities: FamilyCapabilities | null = null;
    try {
      const parsed = capabilitiesFromApi(
        await apiRequest('/api/family/me/capabilities/'),
      );
      role = parsed.role;
      capabilities = parsed.capabilities;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        role = 'owner';
        capabilities = OWNER_CAPABILITIES;
      } else {
        throw error;
      }
    }
    return { profile, role, capabilities, missing: false };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        profile: { id: null, name: '', onboarded: false, members: [] },
        role: null,
        capabilities: null,
        missing: true,
      };
    }
    throw error;
  }
}

/** Full roster replacement, then mark family onboarding complete. */
export async function publishFamilyRoster(
  members: FamilyMember[],
): Promise<FamilyMember[] | null> {
  if (!(await canSend()) || members.length === 0) {
    return null;
  }
  const saved = profileFromApi(
    await apiRequest('/api/family/profile/', {
      method: 'PUT',
      body: {
        members: members.map((member, index) => memberToApi(member, index === 0)),
      },
    }),
  );
  if (!saved.onboarded) {
    try {
      await apiRequest('/api/family/onboarding/complete/', {
        method: 'POST',
        body: {},
      });
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 400 && error.status !== 409)) {
        throw error;
      }
    }
  }
  notifyFamilyChanged();
  return saved.members.length ? saved.members : null;
}

export async function publishFamilyMemberUpdate(
  members: FamilyMember[],
  activeId: string,
): Promise<FamilyMember[] | null> {
  if (!(await canSend())) {
    return null;
  }
  const member = members.find((item) => item.id === activeId);
  if (!member) {
    return null;
  }
  if (!isServerMemberId(member.id)) {
    return publishFamilyRoster(members);
  }
  const updated = memberFromApi(
    await apiRequest(`/api/family/members/${member.id}/`, {
      method: 'PATCH',
      body: memberToApi(member, members[0]?.id === member.id),
    }),
  );
  notifyFamilyChanged();
  if (!updated) {
    return null;
  }
  return members.map((item) => (item.id === activeId ? updated : item));
}

function memberPath(memberId: string, suffix = '') {
  if (!isServerMemberId(memberId)) {
    throw new ApiError(400, 'This family member is not on the server yet.');
  }
  return `/api/family/members/${memberId}/${suffix}`;
}

export function readMemberSection(memberId: string, section: FamilySection) {
  return apiRequest(memberPath(memberId, `${section}/`));
}

export function createMemberRecord(
  memberId: string,
  section: FamilySection,
  body: Record<string, unknown>,
) {
  return apiRequest(memberPath(memberId, `${section}/`), { method: 'POST', body });
}

export function completeCareItem(memberId: string, itemId: string) {
  if (!isServerMemberId(itemId)) {
    throw new ApiError(400, 'This care item is not on the server yet.');
  }
  return apiRequest(memberPath(memberId, `care-plan/${itemId}/complete/`), {
    method: 'POST',
    body: {},
  });
}

export function startVisit(memberId: string, visitId: string) {
  if (!isServerMemberId(visitId)) {
    throw new ApiError(400, 'This visit is not on the server yet.');
  }
  return apiRequest(memberPath(memberId, `visits/${visitId}/start/`), {
    method: 'POST',
    body: {},
  });
}

export function endVisit(memberId: string, visitId: string) {
  if (!isServerMemberId(visitId)) {
    throw new ApiError(400, 'This visit is not on the server yet.');
  }
  return apiRequest(memberPath(memberId, `visits/${visitId}/end/`), {
    method: 'POST',
    body: {},
  });
}

export function markReportRead(reportId: string) {
  if (!isServerMemberId(reportId)) {
    throw new ApiError(400, 'This report is not on the server yet.');
  }
  return apiRequest(`/api/family/reports/${reportId}/read/`, { method: 'POST', body: {} });
}

export function readCareTeam() {
  return apiRequest('/api/family/care-team/');
}

export function readAttention() {
  return apiRequest('/api/family/attention/?open=1');
}

export function resolveAttention(flagId: string) {
  if (!isServerMemberId(flagId)) {
    throw new ApiError(400, 'This attention flag is not on the server yet.');
  }
  return apiRequest(`/api/family/attention/${flagId}/resolve/`, {
    method: 'POST',
    body: {},
  });
}

export function readMemberships() {
  return apiRequest('/api/family/memberships/');
}

export function updateMembershipFlags(id: string, flags: Record<string, boolean>) {
  if (!isServerMemberId(id)) {
    throw new ApiError(400, 'This membership is not on the server yet.');
  }
  return apiRequest(`/api/family/memberships/${id}/`, { method: 'PATCH', body: flags });
}

export function revokeMembership(id: string) {
  if (!isServerMemberId(id)) {
    throw new ApiError(400, 'This membership is not on the server yet.');
  }
  return apiRequest(`/api/family/memberships/${id}/revoke/`, { method: 'POST', body: {} });
}

export type InvitationDraft = {
  name: string;
  email?: string;
  phone_number?: string;
  can_view_readings?: boolean;
  can_view_care_plan?: boolean;
  can_view_visits?: boolean;
  can_view_reports?: boolean;
  can_view_prescriptions?: boolean;
  can_view_lab_results?: boolean;
  can_view_history?: boolean;
  can_view_attention?: boolean;
  can_view_care_team?: boolean;
};

export function readInvitations() {
  return apiRequest('/api/family/invitations/');
}

export function createInvitation(draft: InvitationDraft) {
  return apiRequest('/api/family/invitations/', { method: 'POST', body: draft });
}

export function cancelInvitation(id: string) {
  if (!isServerMemberId(id)) {
    throw new ApiError(400, 'This invitation is not on the server yet.');
  }
  return apiRequest(`/api/family/invitations/${id}/cancel/`, { method: 'POST', body: {} });
}

function invitationPath(token: string, suffix: string) {
  if (!INVITE_TOKEN.test(token)) {
    throw new ApiError(400, 'Invitation link is not valid.');
  }
  return `/api/invitations/${encodeURIComponent(token)}/${suffix}`;
}

/** Token is used only on this request path. It is never written to storage. */
export function invitationPreflight(token: string) {
  return apiRequest(invitationPath(token, 'preflight/'), { auth: false });
}

export function requestInvitationOtp(token: string) {
  return apiRequest(invitationPath(token, 'otp/request/'), { method: 'POST', auth: false, body: {} });
}

export function verifyInvitationOtp(token: string, otp: string) {
  return apiRequest(invitationPath(token, 'otp/verify/'), {
    method: 'POST',
    auth: false,
    body: { otp },
  });
}

export function registerFromInvitation(
  token: string,
  body: { password: string; username?: string; first_name?: string; last_name?: string },
) {
  return apiRequest(invitationPath(token, 'register/'), { method: 'POST', auth: false, body });
}

export function acceptInvitation(token: string) {
  return apiRequest(invitationPath(token, 'accept/'), { method: 'POST', body: {} });
}
