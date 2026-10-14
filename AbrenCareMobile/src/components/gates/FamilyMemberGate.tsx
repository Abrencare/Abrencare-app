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
  const requested =
    typeof params.member === 'string' ? params.member : user?.activeFamilyMemberId;
  const member =
    user?.familyMembers.find((item) => item.id === requested) ?? null;

  useEffect(() => {
    if (member && user?.activeFamilyMemberId !== member.id) {
      selectFamilyMember(member.id);
    }
  }, [member, user?.activeFamilyMemberId, selectFamilyMember]);

  if (!member) {
    return <Replace href="/family-home" />;
  }

  return <>{children}</>;
}
