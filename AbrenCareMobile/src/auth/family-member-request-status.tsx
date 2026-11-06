import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLandingType } from '@/theme/landingType';

export default function FamilyMemberRequestStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; id?: string }>();
  const { t } = useLanguage();
  const copy = t.familyAdd;
  const type = useLandingType('family');
  const { colors } = useAppTheme();
  const { approveFamilyMember } = useAuth();
  const name = typeof params.name === 'string' && params.name ? params.name : copy.addMember;
  const memberId = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    if (!memberId) {
      return;
    }
    const timer = setTimeout(() => {
      approveFamilyMember(memberId);
    }, 5000);
    return () => clearTimeout(timer);
  }, [approveFamilyMember, memberId]);

  return (
    <FamilyRequestChrome>
      <View style={styles.checkWrap}>
        <Ionicons name="time-outline" size={28} color={colors.continue} />
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{copy.requestPendingBadge}</Text>
      </View>

      <Text style={[styles.title, type.headline, { color: colors.text }]}>
        {copy.requestReceivedTitle}
      </Text>
      <Text style={[styles.subtitle, type.body, { color: colors.muted }]}>
        {copy.requestReceivedBody.replace('{name}', name)}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: colors.continue },
          pressed && styles.pressed,
        ]}
        onPress={() => router.replace('/family/profile')}
      >
        <Text style={[styles.primaryText, type.button]}>{copy.backToProfile}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: colors.border, backgroundColor: colors.card },
          pressed && styles.pressed,
        ]}
        onPress={() => router.replace('/family-home')}
      >
        <Text style={[styles.secondaryText, type.button, { color: colors.text }]}>
          {copy.backToFamily}
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
    marginBottom: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F4EFE2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
  },
  badgeText: {
    color: '#9A7B3C',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 24,
  },
  primary: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
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
