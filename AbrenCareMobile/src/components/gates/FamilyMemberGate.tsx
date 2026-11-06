import { useEffect, type ReactNode } from 'react';

import { useGlobalSearchParams } from 'expo-router';

import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';

export default function FamilyMemberGate({
  children,
}: {
  children: ReactNode;
}) {
  const { user, selectFamilyMember } = useAuth();
  const params = useGlobalSearchParams();
  const members = user?.familyMembers ?? [];
  const requested =
    typeof params.member === 'string' ? params.member : user?.activeFamilyMemberId;
  const member =
    members.find((item) => item.id === requested) ??
    members.find((item) => item.status === 'active') ??
    members[0] ??
    null;

  useEffect(() => {
    if (member && user?.activeFamilyMemberId !== member.id) {
      selectFamilyMember(member.id);
    }
  }, [member, user?.activeFamilyMemberId, selectFamilyMember]);

  if (!member) {
    if (!user?.familyOnboarded) {
      return <Replace href="/family-setup" />;
    }
    return <Replace href="/family-home" />;
  }

  return <>{children}</>;
}
