import { useCallback, useState } from 'react';

import { useFocusEffect } from 'expo-router/build/useFocusEffect';

import {
  activateFamilyCare,
  loadFamilyInquiry,
  markFamilySetupStarted,
  type FamilyInquiry,
} from '@/data/familyInquiry';

export function useFamilyJourney() {
  const [inquiry, setInquiry] = useState<FamilyInquiry | null | undefined>(undefined);

  const refresh = useCallback(() => {
    loadFamilyInquiry().then(async (current) => {
      if (!current) {
        setInquiry(null);
        return;
      }

      let next = current;
      if (next.status === 'accepted') {
        next = (await markFamilySetupStarted(next.id)) ?? next;
      }
      if (next.status === 'setup' || next.status === 'accepted') {
        next = (await activateFamilyCare(next.id)) ?? next;
      }
      setInquiry(next);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const status = inquiry?.status;
  return {
    inquiry,
    loading: inquiry === undefined,
    // Full home (visit · appointment · care team) after the plan is accepted.
    serviceStarted:
      status === 'accepted' || status === 'setup' || status === 'active',
  };
}
