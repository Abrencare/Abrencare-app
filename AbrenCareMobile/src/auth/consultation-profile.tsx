import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import AuthField from '@/auth/AuthField';
import AuthScaffold from '@/auth/AuthScaffold';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';
import type { Gender } from '@/types/auth';

export default function ConsultationProfileScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, hasService, completeConsultationOnboarding } = useAuth();
  const theme = useServiceTheme('consultation');

  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ?? '');
  const [gender, setGender] = useState<Gender | null>(user?.gender ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!user || !hasService('consultation')) {
    return <Replace href="/signup?service=consultation" />;
  }

  const genders: { id: Gender; label: string }[] = [
    { id: 'female', label: t.executiveSignup.female },
    { id: 'male', label: t.executiveSignup.male },
    { id: 'other', label: t.executiveSignup.other },
    { id: 'preferNot', label: t.executiveSignup.preferNot },
  ];

  const canContinue = dateOfBirth.trim().length >= 8 && gender !== null;

  return (
    <AuthScaffold
      theme={theme}
      serviceLabel={t.consultationFlow.digital}
      title={t.consultationSignup.welcomeTitle}
      subtitle={t.consultationSignup.setupTitle}
    >
      <AuthField
        theme={theme}
        label={t.executiveSignup.dateOfBirth.toUpperCase()}
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder={t.executiveSignup.dobPlaceholder}
        icon="calendar-outline"
      />

      <Text style={[styles.label, { color: theme.muted }]}>
        {t.executiveSignup.gender.toUpperCase()}
      </Text>
      <Pressable
        style={[
          styles.select,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
        onPress={() => setPickerOpen((current) => !current)}
      >
        <Text style={[styles.selectText, { color: gender ? theme.text : '#A8AEB4' }]}>
          {genders.find((item) => item.id === gender)?.label ??
            t.executiveSignup.selectGender}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.muted} />
      </Pressable>

      {pickerOpen ? (
        <View style={[styles.genderList, { borderColor: theme.border }]}>
          {genders.map((item) => (
            <Pressable
              key={item.id}
              style={styles.genderRow}
              onPress={() => {
                setGender(item.id);
                setPickerOpen(false);
              }}
            >
              <Text style={[styles.genderText, { color: theme.text }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.accent },
          pressed && styles.pressed,
          !canContinue && styles.disabled,
        ]}
        disabled={!canContinue}
        onPress={() => {
          if (!gender) {
            return;
          }
          completeConsultationOnboarding({ dateOfBirth, gender });
          router.replace('/consultation/doctors');
        }}
      >
        <View style={styles.buttonRow}>
          <Text style={styles.buttonText}>{t.consultationFlow.continue}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </View>
      </Pressable>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  select: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  selectText: {
    fontSize: 15,
  },
  genderList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: -8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  genderRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF2',
  },
  genderText: {
    fontSize: 15,
  },
  button: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.45,
  },
});
