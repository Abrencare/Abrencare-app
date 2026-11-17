import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ApiError } from '@/api/errors';
import {
  acceptInvitation,
  cancelInvitation,
  completeCareItem,
  createInvitation,
  createMemberRecord,
  endVisit,
  fetchFamilyHome,
  invitationPreflight,
  markReportRead,
  readAttention,
  readCareTeam,
  readInvitations,
  readMemberSection,
  readMemberships,
  registerFromInvitation,
  requestInvitationOtp,
  resolveAttention,
  revokeMembership,
  startVisit,
  subscribeFamilyChanges,
  updateMembershipFlags,
  verifyInvitationOtp,
  type FamilyHome,
  type FamilySection,
  type InvitationDraft,
} from '@/api/family';
import { isApiConfigured } from '@/api/config';
import { useAuth } from '@/context/AuthContext';

type FamilyContextValue = {
  home: FamilyHome | null;
  ready: boolean;
  accessRevoked: boolean;
  reload: () => Promise<void>;
  readSection: (memberId: string, section: FamilySection) => Promise<unknown>;
  createRecord: (
    memberId: string,
    section: FamilySection,
    body: Record<string, unknown>,
  ) => Promise<unknown>;
  completeCareItem: (memberId: string, itemId: string) => Promise<unknown>;
  startVisit: (memberId: string, visitId: string) => Promise<unknown>;
  endVisit: (memberId: string, visitId: string) => Promise<unknown>;
  markReportRead: (reportId: string) => Promise<unknown>;
  readCareTeam: () => Promise<unknown>;
  readAttention: () => Promise<unknown>;
  resolveAttention: (flagId: string) => Promise<unknown>;
  readMemberships: () => Promise<unknown>;
  updateMembershipFlags: (id: string, flags: Record<string, boolean>) => Promise<unknown>;
  revokeMembership: (id: string) => Promise<unknown>;
  readInvitations: () => Promise<unknown>;
  createInvitation: (draft: InvitationDraft) => Promise<unknown>;
  cancelInvitation: (id: string) => Promise<unknown>;
  invitationPreflight: (token: string) => Promise<unknown>;
  requestInvitationOtp: (token: string) => Promise<unknown>;
  verifyInvitationOtp: (token: string, otp: string) => Promise<unknown>;
  registerFromInvitation: (
    token: string,
    body: { password: string; username?: string; first_name?: string; last_name?: string },
  ) => Promise<unknown>;
  acceptInvitation: (token: string) => Promise<unknown>;
};

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user, applyServerFamilyMembers } = useAuth();
  const applyRef = useRef(applyServerFamilyMembers);
  applyRef.current = applyServerFamilyMembers;
  const [home, setHome] = useState<FamilyHome | null>(null);
  const [ready, setReady] = useState(!isApiConfigured());
  const [accessRevoked, setAccessRevoked] = useState(false);

  const reload = useCallback(async () => {
    if (!isApiConfigured()) {
      setReady(true);
      return;
    }
    try {
      const next = await fetchFamilyHome();
      setHome(next);
      setAccessRevoked(false);
      if (next && !next.missing && next.profile.members.length > 0) {
        applyRef.current(next.profile.members, next.profile.onboarded);
      }
    } catch (error) {
      if (error instanceof ApiError && error.accessRevoked) {
        setHome(null);
        setAccessRevoked(true);
      }
    } finally {
      setReady(true);
    }
  }, []);

  const email = user?.email ?? null;

  useEffect(() => {
    if (!email) {
      setHome(null);
      setAccessRevoked(false);
      setReady(true);
      return;
    }
    void reload();
    return subscribeFamilyChanges(() => {
      void reload();
    });
  }, [email, reload]);

  const value = useMemo<FamilyContextValue>(
    () => ({
      home,
      ready,
      accessRevoked,
      reload,
      readSection: readMemberSection,
      createRecord: createMemberRecord,
      completeCareItem,
      startVisit,
      endVisit,
      markReportRead,
      readCareTeam,
      readAttention,
      resolveAttention,
      readMemberships,
      updateMembershipFlags,
      revokeMembership,
      readInvitations,
      createInvitation,
      cancelInvitation,
      invitationPreflight,
      requestInvitationOtp,
      verifyInvitationOtp,
      registerFromInvitation,
      acceptInvitation,
    }),
    [accessRevoked, home, ready, reload],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within FamilyProvider');
  }
  return context;
}
