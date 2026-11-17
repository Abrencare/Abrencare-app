import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { fetchAuthProfile, logoutRemote } from '@/api/auth';
import { completeConsultationOnboardingRemote } from '@/api/consultation';
import {
  completeExecutiveOnboardingRemote,
  saveExecutiveCareRemote,
  saveExecutiveProfileRemote,
} from '@/api/executive';
import { publishFamilyMemberUpdate, publishFamilyRoster } from '@/api/family';
import { isApiConfigured } from '@/api/config';
import { hasSession } from '@/api/session';
import { dashboardFor, onboardingPath } from '@/service/serviceTheme';
import {
  DEFAULT_MONITORING,
  emptyUser,
  isCareService,
  kindFromRelationship,
  type AuthUser,
  type CareService,
  type FamilyCareNeed,
  type FamilyMember,
  type FamilyRelationship,
  type Gender,
  type MonitorFrequency,
  type MonitorMetric,
} from '@/types/auth';

function demoFamilyMember(profile: { name: string; phone: string }): FamilyMember {
  return {
    id: `demo-family-${Date.now()}`,
    kind: 'parent',
    name: profile.name || 'Family member',
    relationship: 'parent',
    dateOfBirth: '',
    ageYears: 68,
    phone: profile.phone,
    city: 'Addis Ababa',
    address: '',
    emergencyPhone: '',
    careNeeds: ['homeVisits', 'vitals'],
    preferredLanguage: '',
    notes: '',
    status: 'active',
  };
}

const STORAGE_KEY = 'abrencare-account';

type AuthContextValue = {
  user: AuthUser | null;
  isSignedIn: boolean;
  hasService: (service: CareService) => boolean;
  needsOnboarding: (service: CareService) => boolean;
  nextRouteFor: (service: CareService) => string;
  signIn: (email: string, service: CareService) => AuthUser;
  signUp: (
    input: { name: string; email: string; phone: string; dateOfBirth?: string },
    service: CareService,
  ) => AuthUser;
  verifyEmail: () => void;
  setFamilyMembers: (members: FamilyMember[]) => void;
  selectFamilyMember: (id: string) => void;
  completeFamilyOnboarding: (members: FamilyMember[]) => void;
  applyServerFamilyMembers: (members: FamilyMember[], onboarded: boolean) => void;
  applyServerUser: (remote: AuthUser) => AuthUser;
  updateAccountProfile: (input: {
    name: string;
    email: string;
    phone: string;
  }) => void;
  updateActiveFamilyMember: (input: {
    name?: string;
    phone?: string;
    city?: string;
  }) => void;
  approveFamilyMember: (id: string) => void;
  saveExecutiveProfile: (input: {
    dateOfBirth: string;
    gender: Gender;
    heightCm: string;
    weightKg: string;
  }) => void;
  saveExecutiveCare: (input: {
    monitoring: MonitorMetric[];
    frequency: MonitorFrequency;
  }) => void;
  completeExecutiveOnboarding: () => void;
  completeConsultationOnboarding: (input: {
    dateOfBirth: string;
    gender: Gender;
    healthConcern?: string;
  }) => void;
  enterDemoCare: (
    service: CareService,
    profile: { name: string; email: string; phone: string },
  ) => AuthUser;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeMember(value: unknown): FamilyMember | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const member = value as Partial<FamilyMember> & {
    /** Accounts saved before care needs became multi-select. */
    careNeed?: FamilyCareNeed | null;
  };
  if (typeof member.id !== 'string' || typeof member.name !== 'string') {
    return null;
  }

  const careNeeds = Array.isArray(member.careNeeds)
    ? member.careNeeds
    : member.careNeed
      ? [member.careNeed]
      : [];

  const relationship: FamilyRelationship =
    member.relationship === 'mother' ||
    member.relationship === 'father' ||
    member.relationship === 'parent' ||
    member.relationship === 'spouse' ||
    member.relationship === 'child' ||
    member.relationship === 'other'
      ? member.relationship
      : member.kind === 'spouse'
        ? 'spouse'
        : member.kind === 'child'
          ? 'child'
          : 'parent';

  return {
    id: member.id,
    kind: kindFromRelationship(relationship),
    name: member.name,
    relationship,
    dateOfBirth: typeof member.dateOfBirth === 'string' ? member.dateOfBirth : '',
    ageYears: typeof member.ageYears === 'number' ? member.ageYears : null,
    phone: typeof member.phone === 'string' ? member.phone : '',
    city: typeof member.city === 'string' ? member.city : '',
    address: typeof member.address === 'string' ? member.address : '',
    emergencyPhone:
      typeof member.emergencyPhone === 'string' ? member.emergencyPhone : '',
    careNeeds,
    preferredLanguage:
      member.preferredLanguage === 'en' || member.preferredLanguage === 'am'
        ? member.preferredLanguage
        : '',
    notes: typeof member.notes === 'string' ? member.notes : '',
    status: member.status === 'pending' ? 'pending' : 'active',
  };
}

function nameFromEmail(email: string) {
  const handle = email.split('@')[0] ?? '';

  const readable = handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return readable || 'Nordic AbrenCare member';
}

function normalizeUser(parsed: unknown): AuthUser | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const value = parsed as Partial<AuthUser>;
  if (typeof value.email !== 'string' || typeof value.name !== 'string') {
    return null;
  }

  const services = Array.isArray(value.services)
    ? value.services.filter(isCareService)
    : [];

  return emptyUser({
    name: value.name,
    email: value.email,
    phone: typeof value.phone === 'string' ? value.phone : '',
    services,
    familyMembers: Array.isArray(value.familyMembers)
      ? value.familyMembers
          .map(normalizeMember)
          .filter((member): member is FamilyMember => member !== null)
      : [],
    activeFamilyMemberId:
      typeof value.activeFamilyMemberId === 'string'
        ? value.activeFamilyMemberId
        : null,
    familyOnboarded: Boolean(value.familyOnboarded),
    dateOfBirth: typeof value.dateOfBirth === 'string' ? value.dateOfBirth : '',
    gender: value.gender ?? null,
    heightCm: typeof value.heightCm === 'string' ? value.heightCm : '',
    weightKg: typeof value.weightKg === 'string' ? value.weightKg : '',
    monitoring: Array.isArray(value.monitoring)
      ? (value.monitoring as MonitorMetric[])
      : [...DEFAULT_MONITORING],
    frequency: value.frequency ?? 'managed',
    executiveOnboarded: Boolean(value.executiveOnboarded),
    consultationOnboarded: Boolean(value.consultationOnboarded),
    healthConcern:
      typeof value.healthConcern === 'string' ? value.healthConcern : '',
    emailVerified:
      typeof value.emailVerified === 'boolean' ? value.emailVerified : true,
  });
}

function readStoredUser(): AuthUser | null {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizeUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function persistUser(user: AuthUser | null) {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    if (user) {
      storage?.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      storage?.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage write errors.
  }
}

function withService(user: AuthUser, service: CareService): AuthUser {
  if (user.services.includes(service)) {
    return user;
  }
  return { ...user, services: [...user.services, service] };
}

function onboarded(user: AuthUser, service: CareService) {
  if (service === 'family') {
    return user.familyOnboarded || user.familyMembers.length > 0;
  }
  if (service === 'executive') {
    return user.executiveOnboarded;
  }
  return user.consultationOnboarded;
}

function mergeRemoteUser(current: AuthUser | null, remote: AuthUser): AuthUser {
  if (!current) {
    return remote;
  }
  const services = Array.from(new Set([...current.services, ...remote.services]));
  return {
    ...current,
    name: remote.name || current.name,
    email: remote.email || current.email,
    phone: remote.phone || current.phone,
    services,
    familyOnboarded: current.familyOnboarded || remote.familyOnboarded,
    executiveOnboarded: current.executiveOnboarded || remote.executiveOnboarded,
    consultationOnboarded:
      current.consultationOnboarded || remote.consultationOnboarded,
    dateOfBirth: remote.dateOfBirth || current.dateOfBirth,
    gender: remote.gender ?? current.gender,
    heightCm: remote.heightCm || current.heightCm,
    weightKg: remote.weightKg || current.weightKg,
    monitoring: remote.monitoring.length ? remote.monitoring : current.monitoring,
    frequency: remote.frequency || current.frequency,
    emailVerified: true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  // Keep a sync mirror so patch/signUp chains work inside async callbacks
  // (React state alone is not updated until the next render).
  const userRef = useRef<AuthUser | null>(user);
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!isApiConfigured() || !(await hasSession())) {
        return;
      }
      try {
        const remote = await fetchAuthProfile();
        if (cancelled || !remote) {
          return;
        }
        const next = mergeRemoteUser(userRef.current, remote);
        userRef.current = next;
        setUser(next);
        persistUser(next);
      } catch {
        // Keep the local session if the network is down.
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    function commit(next: AuthUser) {
      userRef.current = next;
      setUser(next);
      persistUser(next);
      return next;
    }

    function patch(updater: (current: AuthUser) => AuthUser) {
      const current = userRef.current;
      if (!current) {
        throw new Error('Not signed in');
      }
      return commit(updater(current));
    }

    function sameRoster(left: FamilyMember[], right: FamilyMember[]) {
      if (left.length !== right.length) {
        return false;
      }
      return left.every((member, index) => {
        const other = right[index];
        return (
          member.id === other?.id &&
          member.name === other?.name &&
          member.phone === other?.phone &&
          member.city === other?.city &&
          member.dateOfBirth === other?.dateOfBirth
        );
      });
    }

    function withServerRoster(
      current: AuthUser,
      members: FamilyMember[],
      onboarded: boolean,
    ): AuthUser {
      return {
        ...current,
        familyMembers: members,
        familyOnboarded: current.familyOnboarded || onboarded || members.length > 0,
        activeFamilyMemberId: members.some(
          (member) => member.id === current.activeFamilyMemberId,
        )
          ? current.activeFamilyMemberId
          : (members[0]?.id ?? null),
      };
    }

    function adoptServerRoster(members: FamilyMember[] | null, onboarded: boolean) {
      const current = userRef.current;
      if (!current || !members?.length || sameRoster(current.familyMembers, members)) {
        return;
      }
      commit(withServerRoster(current, members, onboarded));
    }

    return {
      user,
      isSignedIn: user !== null,
      hasService: (service) => Boolean(user?.services.includes(service)),
      needsOnboarding: (service) =>
        Boolean(user?.services.includes(service) && !onboarded(user, service)),
      nextRouteFor: (service) => {
        if (!user || !user.services.includes(service)) {
          return `/signup?service=${service}`;
        }
        if (!onboarded(user, service)) {
          return onboardingPath(service);
        }
        return dashboardFor(service);
      },
      signIn: (email, service) => {
        const current =
          user ??
          emptyUser({
            name: nameFromEmail(email),
            email: email.trim(),
          });
        const next = { ...current, email: email.trim() };
        if (service === 'consultation') {
          return commit(withService(next, service));
        }
        return commit(next);
      },
      signUp: (input, service) => {
        const dateOfBirth = input.dateOfBirth?.trim() || '';
        const current = user
          ? {
              ...user,
              name: input.name.trim() || user.name,
              email: input.email.trim() || user.email,
              phone: input.phone.trim() || user.phone,
              dateOfBirth: dateOfBirth || user.dateOfBirth,
            }
          : emptyUser({
              name: input.name.trim() || nameFromEmail(input.email),
              email: input.email.trim(),
              phone: input.phone.trim(),
              dateOfBirth,
              emailVerified: true,
            });

        return commit(withService(current, service));
      },
      verifyEmail: () => {
        if (!user) {
          throw new Error('Not signed in');
        }
        return commit({ ...user, emailVerified: true });
      },
      setFamilyMembers: (members) => {
        patch((current) => ({
          ...current,
          familyMembers: members,
          activeFamilyMemberId: members.some(
            (member) => member.id === current.activeFamilyMemberId,
          )
            ? current.activeFamilyMemberId
            : null,
        }));
        void publishFamilyRoster(members)
          .then((serverMembers) => adoptServerRoster(serverMembers, true))
          .catch(() => undefined);
      },
      selectFamilyMember: (id) => {
        patch((current) => ({
          ...current,
          activeFamilyMemberId: id,
          familyOnboarded: true,
        }));
      },
      completeFamilyOnboarding: (members) => {
        patch((current) => ({
          ...current,
          familyMembers: members,
          familyOnboarded: true,
          activeFamilyMemberId:
            current.activeFamilyMemberId &&
            members.some((member) => member.id === current.activeFamilyMemberId)
              ? current.activeFamilyMemberId
              : members[0]?.id ?? null,
        }));
        void publishFamilyRoster(members)
          .then((serverMembers) => adoptServerRoster(serverMembers, true))
          .catch(() => undefined);
      },
      applyServerFamilyMembers: (members, onboarded) => {
        adoptServerRoster(members, onboarded);
      },
      applyServerUser: (remote) => {
        const next = mergeRemoteUser(userRef.current, remote);
        return commit(next);
      },
      updateAccountProfile: (input) => {
        patch((current) => ({
          ...current,
          name: input.name.trim() || current.name,
          email: input.email.trim() || current.email,
          phone: input.phone.trim() || current.phone,
        }));
      },
      updateActiveFamilyMember: (input) => {
        const next = patch((current) => {
          const activeId = current.activeFamilyMemberId;
          if (!activeId) {
            return current;
          }
          return {
            ...current,
            familyMembers: current.familyMembers.map((member) => {
              if (member.id !== activeId) {
                return member;
              }
              return {
                ...member,
                name: input.name?.trim() || member.name,
                phone: input.phone?.trim() || member.phone,
                city: input.city?.trim() || member.city,
              };
            }),
          };
        });
        const activeId = next.activeFamilyMemberId;
        if (!activeId) {
          return;
        }
        void publishFamilyMemberUpdate(next.familyMembers, activeId)
          .then((serverMembers) => adoptServerRoster(serverMembers, true))
          .catch(() => undefined);
      },
      approveFamilyMember: (id) => {
        patch((current) => ({
          ...current,
          familyMembers: current.familyMembers.map((member) =>
            member.id === id ? { ...member, status: 'active' } : member,
          ),
        }));
      },
      saveExecutiveProfile: (input) => {
        const next = patch((current) => ({
          ...current,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
        }));
        void saveExecutiveProfileRemote(input).catch(() => undefined);
        return next;
      },
      saveExecutiveCare: (input) => {
        const next = patch((current) => ({
          ...current,
          monitoring: input.monitoring,
          frequency: input.frequency,
        }));
        void saveExecutiveCareRemote(input).catch(() => undefined);
        return next;
      },
      completeExecutiveOnboarding: () => {
        const current = userRef.current;
        const next = patch((item) => ({
          ...item,
          executiveOnboarded: true,
        }));
        if (current) {
          void completeExecutiveOnboardingRemote({
            dateOfBirth: current.dateOfBirth,
            gender: current.gender ?? undefined,
            heightCm: current.heightCm,
            weightKg: current.weightKg,
            monitoring: current.monitoring,
            frequency: current.frequency,
          }).catch(() => undefined);
        }
        return next;
      },
      completeConsultationOnboarding: (input) => {
        const next = patch((current) => ({
          ...current,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          healthConcern: input.healthConcern?.trim() ?? current.healthConcern,
          consultationOnboarded: true,
        }));
        void completeConsultationOnboardingRemote({
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
        }).catch(() => undefined);
        return next;
      },
      enterDemoCare: (service, profile) => {
        const current =
          user ??
          emptyUser({
            name: profile.name.trim() || nameFromEmail(profile.email || 'demo@abrencare.com'),
            email: profile.email.trim() || 'demo@abrencare.com',
            phone: profile.phone.trim(),
            emailVerified: true,
          });
        let next = withService(
          {
            ...current,
            name: profile.name.trim() || current.name,
            email: profile.email.trim() || current.email,
            phone: profile.phone.trim() || current.phone,
            emailVerified: true,
          },
          service,
        );
        if (service === 'family') {
          const member = next.familyMembers[0] ?? demoFamilyMember(profile);
          next = {
            ...next,
            familyMembers: next.familyMembers.length ? next.familyMembers : [member],
            activeFamilyMemberId: next.activeFamilyMemberId ?? member.id,
            familyOnboarded: true,
          };
        }
        if (service === 'executive') {
          next = { ...next, executiveOnboarded: true };
        }
        return commit(next);
      },
      signOut: () => {
        userRef.current = null;
        setUser(null);
        persistUser(null);
        void logoutRemote();
      },
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function initialsFor(user: AuthUser | null) {
  if (!user) {
    return 'AC';
  }

  return user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export type { AuthUser } from '@/types/auth';
