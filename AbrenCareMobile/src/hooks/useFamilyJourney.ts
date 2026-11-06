import { useCallback, useState } from 'react';

import { useFocusEffect } from 'expo-router/build/useFocusEffect';

import { loadFamilyInquiry, type FamilyInquiry } from '@/data/familyInquiry';

export function useFamilyJourney() {
  const [inquiry, setInquiry] = useState<FamilyInquiry | null | undefined>(undefined);

  const refresh = useCallback(() => {
    loadFamilyInquiry().then(setInquiry);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return {
    inquiry,
    loading: inquiry === undefined,
    // Full family dashboard only after care is activated (post-acceptance).
    serviceStarted: inquiry?.status === 'active',
  };
}
