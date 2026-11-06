import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { loadExecutiveInquiry } from '@/data/executiveInquiry';
import { loadFamilyInquiry } from '@/data/familyInquiry';
import { parseService } from '@/service/parseService';
import {
  dashboardFor,
  onboardingPath,
} from '@/service/serviceTheme';

export default function OpenCareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const service = parseService(params.service);
  const { user, hasService, needsOnboarding } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function open() {
      if (service === 'executive') {
        const inquiry = await loadExecutiveInquiry();
        if (cancelled) {
          return;
        }
        if (!inquiry) {
          router.replace('/executive-request');
          return;
        }
        if (inquiry.status === 'proposed') {
          router.replace('/executive-care-plan');
          return;
        }
        if (
          inquiry.status === 'accepted' ||
          inquiry.status === 'setup'
        ) {
          if (!user || !hasService('executive')) {
            router.replace({ pathname: '/signup', params: { service: 'executive' } });
            return;
          }
          if (needsOnboarding('executive')) {
            router.replace(onboardingPath('executive'));
            return;
          }
          router.replace(dashboardFor('executive'));
          return;
        }
        if (inquiry.status === 'active' && user && hasService('executive')) {
          router.replace(
            needsOnboarding('executive')
              ? onboardingPath('executive')
              : dashboardFor('executive'),
          );
          return;
        }
        router.replace('/executive-request');
        return;
      }

      const inquiry = await loadFamilyInquiry();
      if (cancelled) {
        return;
      }
      if (!inquiry) {
        router.replace('/family-request');
        return;
      }
      if (inquiry.status === 'proposed') {
        router.replace('/family-care-plan');
        return;
      }
      if (inquiry.status === 'accepted' || inquiry.status === 'setup') {
        if (!user || !hasService('family')) {
          router.replace({ pathname: '/signup', params: { service: 'family' } });
          return;
        }
        if (!user.emailVerified) {
          router.replace('/verify-email');
          return;
        }
        if (needsOnboarding('family')) {
          router.replace(onboardingPath('family'));
          return;
        }
        router.replace(dashboardFor('family'));
        return;
      }
      if (inquiry.status === 'active' && user && hasService('family')) {
        router.replace(
          needsOnboarding('family')
            ? onboardingPath('family')
            : dashboardFor('family'),
        );
        return;
      }
      router.replace('/family-request-status');
    }

    open();
    return () => {
      cancelled = true;
    };
  }, [hasService, needsOnboarding, router, service, user]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
