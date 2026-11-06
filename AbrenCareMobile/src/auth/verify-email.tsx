import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { useRouter } from 'expo-router';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { dashboardFor, onboardingPath } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';

const FILL = '#1A3A32';
const INK = '#16332C';
const MUTED = '#5C6B65';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.verifyEmail;
  const type = useLandingType('family');
  const { user, verifyEmail, hasService } = useAuth();
  const [code, setCode] = useState('');

  if (!user || !hasService('family')) {
    return <Replace href="/signup?service=family" />;
  }

  if (user.emailVerified) {
    return (
      <Replace
        href={
          user.familyOnboarded
            ? dashboardFor('family')
            : onboardingPath('family')
        }
      />
    );
  }

  const canSubmit = code.replace(/\D/g, '').length === 6;

  return (
    <FamilyRequestChrome
      hero={{
        kicker: copy.kicker,
        title: copy.title,
        subtitle: `${copy.body} ${user.email}`,
      }}
    >
      <Text style={[styles.label, type.label, { color: INK }]}>{copy.code}</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder={copy.codePlaceholder}
        placeholderTextColor={MUTED}
        keyboardType="number-pad"
        maxLength={6}
        style={[styles.input, type.body]}
      />
      <Text style={[styles.hint, type.caption]}>{copy.hint}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          pressed && styles.pressed,
          !canSubmit && styles.disabled,
        ]}
        disabled={!canSubmit}
        onPress={() => {
          if (!canSubmit) {
            return;
          }
          verifyEmail();
          router.replace(
            user.familyOnboarded
              ? dashboardFor('family')
              : onboardingPath('family'),
          );
        }}
      >
        <Text style={[styles.primaryText, type.button]}>{copy.submit}</Text>
      </Pressable>
    </FamilyRequestChrome>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: MUTED,
    marginBottom: 10,
  },
  title: {
    marginBottom: 10,
  },
  body: {
    marginBottom: 22,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 22,
    minHeight: 50,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.55)',
    color: INK,
    letterSpacing: 4,
  },
  hint: {
    color: MUTED,
    marginBottom: 22,
  },
  primary: {
    height: 52,
    borderRadius: 26,
    backgroundColor: FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});
