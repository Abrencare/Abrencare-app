import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { parseService } from '@/service/parseService';
import {
  dashboardFor,
  onboardingPath,
  useServiceTheme,
} from '@/service/serviceTheme';
import AuthField from '@/auth/AuthField';
import AuthNav from '@/auth/AuthNav';
import BrandLogo from '@/components/ui/BrandLogo';
import FlowGlassHero, { FLOW_CHIP, FLOW_MUTED } from '@/components/ui/FlowGlassHero';
import { GlassCard, glassShadow, glassTints } from '@/components/executive/GlassCard';
import PhoneField from '@/components/ui/PhoneField';
import Replace from '@/components/gates/Replace';
import { useLanguage } from '@/context/LanguageContext';
import { isPhoneValueComplete } from '@/data/countries';
import {
  activateFamilyCare,
  loadFamilyInquiry,
  markFamilySetupStarted,
  type FamilyCaregiverRelationshipId,
  type FamilyInquiry,
} from '@/data/familyInquiry';
import { loadExecutiveInquiry, markExecutiveSetupStarted } from '@/data/executiveInquiry';
import {
  kindFromRelationship,
  type FamilyMember,
  type FamilyRelationship,
} from '@/types/auth';
import { ageYearsFromIso } from '@/utilities/birthInput';
import { isValidEmail } from '@/utilities/validation';

/** Form option is who the patient is to the account holder (Mother = patient is mother). */
function patientRelationshipFromCaregiver(
  relationship: FamilyCaregiverRelationshipId | undefined,
): FamilyRelationship {
  switch (relationship) {
    case 'mother':
      return 'mother';
    case 'father':
      return 'father';
    case 'parent':
      return 'parent';
    case 'spouse':
      return 'spouse';
    case 'child':
      return 'child';
    default:
      return 'parent';
  }
}

const CITY_LABELS: Record<string, string> = {
  addis: 'Addis Ababa',
  direDawa: 'Dire Dawa',
  hawassa: 'Hawassa',
  bahirDar: 'Bahir Dar',
  mekelle: 'Mekelle',
  gondar: 'Gondar',
  other: 'Another city in Ethiopia',
};

function memberFromInquiry(inquiry: FamilyInquiry | null, fallbackName: string): FamilyMember {
  const relationship = patientRelationshipFromCaregiver(inquiry?.caregiverRelationship);
  const patientName =
    inquiry?.patientName?.trim() || inquiry?.name?.trim() || fallbackName.trim() || 'Loved one';
  const cityId = inquiry?.city ?? 'addis';
  const dateOfBirth = inquiry?.patientDateOfBirth?.trim() || '';
  return {
    id: `member-${Date.now()}`,
    kind: kindFromRelationship(relationship),
    name: patientName,
    relationship,
    dateOfBirth,
    ageYears: ageYearsFromIso(dateOfBirth),
    phone: inquiry?.patientPhone?.trim() || '',
    city: CITY_LABELS[cityId] ?? CITY_LABELS.addis,
    address: '',
    emergencyPhone: inquiry?.phone?.trim() || '',
    careNeeds: ['general'],
    preferredLanguage: '',
    notes: '',
    status:
      inquiry?.status === 'accepted' ||
      inquiry?.status === 'setup' ||
      inquiry?.status === 'active'
        ? 'active'
        : 'pending',
  };
}

export default function SignupScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, signUp, hasService, needsOnboarding, completeFamilyOnboarding } =
    useAuth();
  const params = useLocalSearchParams();
  const service = parseService(params.service);
  const theme = useServiceTheme(service);
  const { isDark } = useAppTheme();
  const glass = glassTints(isDark, service);
  const insets = useSafeAreaInsets();

  const copy =
    service === 'family'
      ? t.familySignup
      : service === 'executive'
        ? t.executiveSignup
        : t.consultationSignup;

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirm;
  const emailOk = isValidEmail(email);
  const canSubmit =
    name.trim().length > 1 &&
    emailOk &&
    isPhoneValueComplete(phone) &&
    password.length >= 6 &&
    passwordsMatch &&
    agreed;

  if (user && hasService(service) && !needsOnboarding(service)) {
    return <Replace href={dashboardFor(service)} />;
  }

  if (user && hasService(service) && needsOnboarding(service)) {
    return <Replace href={onboardingPath(service)} />;
  }

  const formFields = (
    <>
      {service === 'family' ? (
        <Text style={[styles.accountNote, { color: theme.muted }]}>
          {t.familySignup.accountNote}
        </Text>
      ) : null}
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
        onChangeText={(value) => {
          setEmail(value);
          setEmailTouched(true);
        }}
        placeholder={t.auth.emailPlaceholder}
        icon="mail-outline"
        keyboardType="email-address"
      />
      {emailTouched && email.trim().length > 0 && !emailOk ? (
        <Text style={styles.error}>{t.validation.emailInvalid}</Text>
      ) : null}
      <PhoneField
        theme={theme}
        label={t.auth.phone}
        value={phone}
        onChange={setPhone}
        placeholder={t.auth.phoneLocalPlaceholder}
        showValidation
      />
      <AuthField
        theme={theme}
        label={t.auth.password.toUpperCase()}
        value={password}
        onChangeText={setPassword}
        placeholder={t.auth.createPasswordPlaceholder}
        icon="lock-closed-outline"
        secure
      />
      <AuthField
        theme={theme}
        label={t.auth.confirmPassword.toUpperCase()}
        value={confirm}
        onChangeText={setConfirm}
        placeholder={t.auth.confirmPasswordPlaceholder}
        icon="lock-closed-outline"
        secure
      />

      {confirm.length > 0 && !passwordsMatch ? (
        <Text style={styles.error}>{t.auth.passwordMismatch}</Text>
      ) : null}

      <View style={styles.termsRow}>
        <Pressable onPress={() => setAgreed((current) => !current)}>
          <View
            style={[
              styles.checkbox,
              { borderColor: theme.accent },
              agreed && { backgroundColor: theme.accent },
            ]}
          >
            {agreed ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
          </View>
        </Pressable>
        <Text style={[styles.termsText, { color: theme.muted }]}>
          {t.auth.termsAgree}{' '}
          <Text
            style={[styles.termsLink, { color: theme.accent }]}
            onPress={() =>
              router.push({ pathname: '/legal', params: { doc: 'terms' } })
            }
          >
            {t.auth.termsLink}
          </Text>{' '}
          {t.auth.termsAnd}{' '}
          <Text
            style={[styles.termsLink, { color: theme.accent }]}
            onPress={() =>
              router.push({ pathname: '/legal', params: { doc: 'privacy' } })
            }
          >
            {t.auth.privacyLink}
          </Text>
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.accent },
          pressed && styles.pressed,
          !canSubmit && styles.disabled,
        ]}
        onPress={() => {
          if (!canSubmit) {
            setEmailTouched(true);
            return;
          }
          const account = signUp(
            {
              name,
              email,
              phone,
            },
            service,
          );
          if (service === 'family') {
            void loadFamilyInquiry()
              .then(async (inquiry) => {
                completeFamilyOnboarding([
                  memberFromInquiry(inquiry, account.name || name),
                ]);
                if (!inquiry) {
                  router.replace('/family-request-status');
                  return;
                }
                // Accepted → activate care and open family dashboard.
                if (
                  inquiry.status === 'accepted' ||
                  inquiry.status === 'setup' ||
                  inquiry.status === 'active'
                ) {
                  await markFamilySetupStarted(inquiry.id);
                  await activateFamilyCare(inquiry.id);
                  router.replace(dashboardFor('family'));
                  return;
                }
                // Otherwise stay on the pending request page.
                router.replace('/family-request-status');
              })
              .catch(() => {
                router.replace('/family-request-status');
              });
            return;
          }
          if (service === 'executive') {
            loadExecutiveInquiry()
              .then((inquiry) => {
                if (
                  inquiry &&
                  (inquiry.status === 'accepted' || inquiry.status === 'setup')
                ) {
                  return markExecutiveSetupStarted(inquiry.id);
                }
                return null;
              })
              .finally(() => {
                router.replace(onboardingPath('executive'));
              });
            return;
          }
          router.replace(onboardingPath(service));
        }}
        disabled={!canSubmit}
      >
        <Text style={styles.buttonText}>{copy.submit}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.muted }]}>
          {t.auth.alreadyAccount}
        </Text>
        <Pressable
          onPress={() =>
            router.replace({ pathname: '/login', params: { service } })
          }
          hitSlop={8}
        >
          <Text style={[styles.link, { color: theme.accent }]}>
            {t.auth.signIn}
          </Text>
        </Pressable>
      </View>
    </>
  );

  if (service === 'consultation') {
    return (
      <View style={[styles.safeArea, { backgroundColor: '#F4F6F8' }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.consultContent,
              { paddingBottom: 36 + insets.bottom, paddingTop: insets.top + 8 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthNav
              service={service}
              active="signup"
              accent={theme.accent}
              muted={theme.muted}
              card={theme.card}
            />

            <View style={styles.consultCard}>
              <BrandLogo size={64} style={styles.cardLogo} />
              <Text style={[styles.consultTitle, { color: theme.text }]}>
                {copy.headline}
              </Text>
              {formFields}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 36 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FlowGlassHero
            service={service}
            kicker={copy.service}
            title={copy.title}
            subtitle={service === 'family' ? t.familySignup.subtitle : undefined}
            top={
              <AuthNav
                service={service}
                active="signup"
                accent={theme.accent}
                muted={FLOW_MUTED[service]}
                card={FLOW_CHIP}
              />
            }
          />

          <View style={styles.body}>
            <GlassCard
              tint={glass.card}
              border={glass.border}
              sheen={glass.sheen}
              shadowColor={glassShadow(service)}
            >
              <BrandLogo size={64} style={styles.cardLogo} />
              {formFields}
            </GlassCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
  },
  body: {
    marginTop: -36,
    paddingHorizontal: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  cardLogo: {
    alignSelf: 'center',
    marginBottom: 14,
  },
  accountNote: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },
  error: {
    color: '#D64545',
    fontSize: 12,
    marginBottom: 10,
    marginTop: -6,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    marginBottom: 18,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  button: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
  },
  consultContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  consultCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDE3EA',
    padding: 20,
  },
  consultTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
});
