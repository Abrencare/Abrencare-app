import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  activateFamilyCare,
  loadFamilyInquiry,
  markFamilySetupStarted,
  type FamilyInquiry,
} from '@/data/familyInquiry';
import { dashboardFor } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';

export default function FamilyRequestStatusScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyRequest;
  const type = useLandingType('family');
  const { colors } = useAppTheme();
  const { user, hasService } = useAuth();
  const [inquiry, setInquiry] = useState<FamilyInquiry | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const current = await loadFamilyInquiry();
      if (cancelled) {
        return;
      }

      // Once the request is accepted, activate care and open the family dashboard.
      if (
        current &&
        (current.status === 'accepted' ||
          current.status === 'setup' ||
          current.status === 'active') &&
        user &&
        hasService('family')
      ) {
        if (current.status !== 'active') {
          await markFamilySetupStarted(current.id);
          await activateFamilyCare(current.id);
        }
        if (!cancelled) {
          router.replace(dashboardFor('family'));
        }
        return;
      }

      setInquiry(current);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [hasService, router, user]);

  if (inquiry === undefined) {
    return <FamilyRequestChrome>{null}</FamilyRequestChrome>;
  }

  if (!inquiry) {
    return <Replace href="/family-request" />;
  }

  return (
    <FamilyRequestChrome>
      <View style={styles.checkWrap}>
        <Ionicons name="checkmark" size={28} color={colors.continue} />
      </View>

      <Text style={[styles.title, type.headline, { color: colors.text }]}>
        {copy.receivedTitle}
      </Text>
      <Text style={[styles.subtitle, type.body, { color: colors.muted }]}>
        {copy.receivedBody}
      </Text>

      <View
        style={[
          styles.record,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.recordKicker, type.kicker, { color: colors.muted }]}>
          {copy.recorded}
        </Text>

        <Text style={[styles.recordSection, type.caption, { color: colors.muted }]}>
          {copy.patientSection}
        </Text>
        <Text style={[type.label, { color: colors.text }]}>
          {inquiry.patientName}
        </Text>
        <Text style={[styles.recordLine, type.bodySmall, { color: colors.muted }]}>
          {inquiry.patientPhone}
        </Text>
        <Text style={[styles.recordLine, type.bodySmall, { color: colors.muted }]}>
          {t.countries[inquiry.patientCountry]}
        </Text>

        <Text style={[styles.recordSection, type.caption, { color: colors.muted }]}>
          {copy.caregiverSection}
        </Text>
        <Text style={[type.label, { color: colors.text }]}>{inquiry.name}</Text>
        <Text style={[styles.recordLine, type.bodySmall, { color: colors.muted }]}>
          {inquiry.phone}
        </Text>
        <Text style={[styles.recordLine, type.bodySmall, { color: colors.muted }]}>
          {t.countries[inquiry.country]} ·{' '}
          {copy.relationships[inquiry.caregiverRelationship]}
        </Text>
        <Text style={[styles.recordLine, type.bodySmall, { color: colors.muted }]}>
          {copy.supports[inquiry.support]}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: colors.continue },
          pressed && styles.pressed,
        ]}
        onPress={() => router.push('/family-care-plan')}
      >
        <Text style={[styles.primaryText, type.button]}>{copy.viewPlan}</Text>
        <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: colors.border, backgroundColor: colors.card },
          pressed && styles.pressed,
        ]}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={[styles.secondaryText, type.button, { color: colors.text }]}>
          {copy.backHome}
        </Text>
      </Pressable>
    </FamilyRequestChrome>
  );
}

const styles = StyleSheet.create({
  checkWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#E7EEEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 20,
  },
  record: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    gap: 4,
  },
  recordKicker: {
    marginBottom: 8,
  },
  recordSection: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  recordLine: {},
  primary: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondary: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {},
  pressed: { opacity: 0.88 },
});
