import { useCallback, useState } from 'react';

import { useFocusEffect } from 'expo-router';

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
    serviceStarted: inquiry?.status === 'active',
  };
}
