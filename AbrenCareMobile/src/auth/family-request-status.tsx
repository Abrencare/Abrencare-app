import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import Replace from '@/components/gates/Replace';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { loadFamilyInquiry, type FamilyInquiry } from '@/data/familyInquiry';
import { useLandingType } from '@/theme/landingType';

export default function FamilyRequestStatusScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyRequest;
  const type = useLandingType('family');
  const { colors } = useAppTheme();
  const [inquiry, setInquiry] = useState<FamilyInquiry | null | undefined>(undefined);

  useEffect(() => {
    loadFamilyInquiry().then(setInquiry);
  }, []);

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

      <Text style={[styles.title, type.headline, { color: colors.text }]}>{copy.receivedTitle}</Text>
      <Text style={[styles.subtitle, type.body, { color: colors.muted }]}>{copy.receivedBody}</Text>

      <View style={[styles.record, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.recordKicker, type.kicker, { color: colors.muted }]}>{copy.recorded}</Text>
        <Text style={[type.label, { color: colors.text }]}>{inquiry.name}</Text>
        <Text style={[styles.recordLine, type.bodySmall, { color: colors.muted }]}>{inquiry.phone}</Text>
        {inquiry.email ? (
          <Text style={[styles.recordLine, type.bodySmall, { color: colors.muted }]}>{inquiry.email}</Text>
        ) : null}
        <Text style={[styles.recordLine, type.bodySmall, { color: colors.muted }]}>
          {t.countries[inquiry.country]} · {copy.cities[inquiry.city]}
        </Text>
        <Text style={[styles.recordLine, type.bodySmall, { color: colors.muted }]}>
          {copy.supports[inquiry.support]} · {copy.contacts[inquiry.contact]}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primary, { backgroundColor: colors.continue }, pressed && styles.pressed]}
        onPress={() => router.push('/family-care-plan')}
      >
        <Text style={[styles.primaryText, type.button]}>{copy.viewPlan}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: colors.border, backgroundColor: colors.card },
          pressed && styles.pressed,
        ]}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={[styles.secondaryText, type.button, { color: colors.text }]}>{copy.backHome}</Text>
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
