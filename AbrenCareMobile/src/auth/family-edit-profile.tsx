import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import AuthField from '@/auth/AuthField';
import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import PhoneField from '@/components/ui/PhoneField';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { isPhoneValueComplete } from '@/data/countries';
import { useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';

export default function FamilyEditProfileScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const type = useLandingType('family');
  const theme = useServiceTheme('family');
  const { colors } = useAppTheme();
  const { user, updateAccountProfile, hasService } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  if (!user || !hasService('family')) {
    return <Replace href="/signup?service=family" />;
  }

  const canSave =
    name.trim().length > 1 &&
    email.includes('@') &&
    isPhoneValueComplete(phone);

  return (
    <FamilyRequestChrome>
      <Text style={[styles.kicker, type.kicker, { color: colors.muted }]}>
        {t.profile.accountManager}
      </Text>
      <Text style={[styles.title, type.headline, { color: colors.text }]}>
        {t.profile.editProfileTitle}
      </Text>
      <Text style={[styles.subtitle, type.body, { color: colors.muted }]}>
        {t.profile.editProfileSubtitle}
      </Text>

      <AuthField
        theme={theme}
        label={t.auth.fullName.toUpperCase()}
        value={name}
        onChangeText={setName}
        placeholder={t.auth.fullNamePlaceholder}
        icon="person-outline"
        autoCapitalize="words"
      />
      <AuthField
        theme={theme}
        label={t.auth.email.toUpperCase()}
        value={email}
        onChangeText={setEmail}
        placeholder={t.auth.emailPlaceholder}
        icon="mail-outline"
        keyboardType="email-address"
      />
      <PhoneField
        theme={theme}
        label={t.auth.phone}
        value={phone}
        onChange={setPhone}
        placeholder={t.auth.phoneLocalPlaceholder}
      />

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: colors.continue },
          pressed && styles.pressed,
          !canSave && styles.disabled,
        ]}
        disabled={!canSave}
        onPress={() => {
          if (!canSave) {
            return;
          }
          updateAccountProfile({ name, email, phone });
          router.back();
        }}
      >
        <Text style={[styles.primaryText, type.button]}>{t.profile.saveProfile}</Text>
        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        onPress={() => router.back()}
      >
        <Text style={[type.button, { color: colors.text }]}>{t.common.back}</Text>
      </Pressable>
    </FamilyRequestChrome>
  );
}

const styles = StyleSheet.create({
  kicker: {
    marginBottom: 10,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 18,
  },
  primary: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondary: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});
