import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { accentTitle } from '@/auth/HowItWorksScreen';
import Replace from '@/components/gates/Replace';
import { GlassCard, glassField, glassTints } from '@/components/executive/GlassCard';
import DateOfBirthField, {
  isValidIsoDateOfBirth,
} from '@/components/ui/DateOfBirthField';
import PhoneField from '@/components/ui/PhoneField';
import ServiceFlowShell from '@/auth/ServiceFlowShell';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { detectCountry, isPhoneValueComplete, type CountryId } from '@/data/countries';
import { prepareFamilyPlan } from '@/data/demoCareAccess';
import {
  saveFamilyInquiry,
  type FamilyCaregiverRelationshipId,
  type FamilyCityId,
  type FamilySupportId,
} from '@/data/familyInquiry';
import { dashboardFor, onboardingPath, useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';
import { isValidEmail } from '@/utilities/validation';

const FILL = '#1A3A32';
const DANGER = '#D64545';
const PAGES = [0, 1, 2] as const;

const COMMON_DOMAINS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
};

function suggestEmailCorrection(email: string): string | null {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return null;
  const [user, domain] = parts;
  if (COMMON_DOMAINS[domain]) {
    return `${user}@${COMMON_DOMAINS[domain]}`;
  }
  return null;
}

function isEmailDomainValid(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  // If it's a known typo variant, require strict correction
  if (COMMON_DOMAINS[domain]) {
    return false;
  }
  return true;
}

const CITIES: FamilyCityId[] = [
  'addis',
  'direDawa',
  'hawassa',
  'bahirDar',
  'mekelle',
  'gondar',
  'other',
];

const SUPPORTS: FamilySupportId[] = [
  'checkins',
  'nursing',
  'afterVisit',
  'medication',
  'unsure',
];

const RELATIONSHIPS: FamilyCaregiverRelationshipId[] = [
  'mother',
  'father',
  'parent',
  'spouse',
  'child',
  'sibling',
  'other',
];

export default function FamilyRequestScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyRequest;
  const landing = t.familyLanding;
  const theme = useServiceTheme('family');
  const type = useLandingType('family');
  const { isDark } = useAppTheme();
  const glass = glassTints(isDark, 'family');
  const field = glassField(isDark);
  const { user, hasService, needsOnboarding } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const pageRef = useRef(0);
  const pageWidthRef = useRef(0);
  const heightAnim = useRef(new Animated.Value(0)).current;

  const [page, setPage] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeights, setPageHeights] = useState<number[]>([0, 0, 0]);
  const [familyName, setFamilyName] = useState('');
  const [familyPhone, setFamilyPhone] = useState('');
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyCountry] = useState<CountryId>(detectCountry().id);
  const [relationship, setRelationship] = useState<FamilyCaregiverRelationshipId | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientDateOfBirth, setPatientDateOfBirth] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientCity, setPatientCity] = useState<FamilyCityId | null>(null);
  const [support, setSupport] = useState<FamilySupportId | null>(null);
  const [open, setOpen] = useState<'relationship' | 'city' | 'support' | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [touched, setTouched] = useState({
    familyName: false,
    familyEmail: false,
    patientName: false,
    patientDateOfBirth: false,
  });

  useEffect(() => {
    const target = pageHeights[page];
    if (target > 0) {
      Animated.timing(heightAnim, {
        toValue: target,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [heightAnim, page, pageHeights]);

  if (user && hasService('family') && !needsOnboarding('family')) {
    return <Replace href={dashboardFor('family')} />;
  }

  if (user && hasService('family') && needsOnboarding('family')) {
    return <Replace href={onboardingPath('family')} />;
  }

  const emailTrimmed = familyEmail.trim();
  const emailFormatOk = isValidEmail(emailTrimmed);
  const emailDomainOk = isEmailDomainValid(emailTrimmed);
  const emailOk = emailFormatOk && emailDomainOk;
  const emailSuggestion = suggestEmailCorrection(emailTrimmed);
  const emailShowError = touched.familyEmail && emailTrimmed.length > 0 && !emailOk;
  const familyNameOk = familyName.trim().length > 1;
  const patientNameOk = patientName.trim().length > 1;
  const patientDobOk = isValidIsoDateOfBirth(patientDateOfBirth);

  const canSubmit =
    familyNameOk &&
    relationship !== null &&
    isPhoneValueComplete(familyPhone) &&
    emailOk &&
    patientNameOk &&
    patientDobOk &&
    patientCity !== null &&
    isPhoneValueComplete(patientPhone) &&
    support !== null &&
    agreed &&
    !sending;

  const stepLabel = `${page + 1} / ${PAGES.length}`;

  function leave() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  }

  function applyPage(next: number) {
    const clamped = Math.max(0, Math.min(PAGES.length - 1, next));
    if (clamped === pageRef.current) return;
    pageRef.current = clamped;
    setPage(clamped);
    setOpen(null);
  }

  function goToPage(index: number) {
    const clamped = Math.max(0, Math.min(PAGES.length - 1, index));
    pageRef.current = clamped;
    setPage(clamped);
    setOpen(null);
    const width = pageWidthRef.current;
    if (width > 0) {
      scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    }
  }

  function onPagerLayout(event: LayoutChangeEvent) {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next <= 0 || next === pageWidthRef.current) return;
    pageWidthRef.current = next;
    setPageWidth(next);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        x: pageRef.current * next,
        animated: false,
      });
    });
  }

  function onPagerSettle(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const width = pageWidthRef.current;
    if (width <= 0) return;
    const x = event.nativeEvent.contentOffset.x;
    applyPage(Math.round(x / width));
  }

  function onPageContentLayout(index: number, event: LayoutChangeEvent) {
    const height = Math.round(event.nativeEvent.layout.height) + 8;
    if (height <= 0) return;
    setPageHeights((current) => {
      if (current[index] === height) return current;
      const next = [...current];
      next[index] = height;
      return next;
    });
  }

  function markTouched(key: keyof typeof touched) {
    setTouched((current) => ({ ...current, [key]: true }));
  }

  return (
    <ServiceFlowShell
      service="family"
      badge={landing.badge}
      kicker={landing.kicker}
      title={accentTitle(copy.title, copy.titleAccent, '#C5D4C8')}
      subtitle={copy.subtitle}
      accentColor={FILL}
    >
      <View style={styles.stepBar}>
        <Text style={[styles.stepCount, type.caption, { color: theme.muted }]}>
          {stepLabel}
        </Text>
      </View>

      <Animated.View
        onLayout={onPagerLayout}
        style={[
          styles.pager,
          pageHeights[page] > 0 ? { height: heightAnim } : null,
          Platform.OS === 'web' ? webPagerStyle : null,
        ]}
      >
        {pageWidth > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            onMomentumScrollEnd={onPagerSettle}
            style={{ width: pageWidth }}
            contentContainerStyle={Platform.OS === 'web' ? webScrollContent : undefined}
          >
            {/* Page 0: Family Member Details */}
            <View onLayout={(e) => onPageContentLayout(0, e)} style={[styles.page, { width: pageWidth }]}>
              <FormSection
                title={copy.familyMemberTitle}
                subtitle={copy.familyMemberSubtitle}
                caption={copy.familyMemberCaption}
                titleColor={theme.text}
                muted={theme.muted}
                type={type}
                cardTint={glass.card}
                cardBorder={glass.border}
              >
                <FieldLabel type={type} color={theme.text} label={copy.yourName} />
                <TextInput
                  value={familyName}
                  onChangeText={setFamilyName}
                  onBlur={() => markTouched('familyName')}
                  placeholder={copy.yourNamePlaceholder}
                  placeholderTextColor={theme.muted}
                  autoCapitalize="words"
                  style={[styles.input, type.body, field, invalidField(touched.familyName && !familyNameOk, theme.text)]}
                />
                {touched.familyName && !familyNameOk ? (
                  <Text style={styles.fieldError}>{t.validation.required}</Text>
                ) : null}

                <Select
                  label={copy.yourRelationship}
                  value={relationship ? copy.relationships[relationship] : copy.selectRelationship}
                  placeholder={!relationship}
                  open={open === 'relationship'}
                  onToggle={() => setOpen(open === 'relationship' ? null : 'relationship')}
                  options={RELATIONSHIPS.map((id) => ({ id, label: copy.relationships[id] }))}
                  onSelect={(id) => {
                    setRelationship(id as FamilyCaregiverRelationshipId);
                    setOpen(null);
                  }}
                  theme={theme}
                  type={type}
                />

                <PhoneField
                  theme={theme}
                  label={copy.phone}
                  labelStyle="plain"
                  radius={22}
                  value={familyPhone}
                  onChange={setFamilyPhone}
                  placeholder="9XXXXXXXX"
                  showValidation
                />

                <FieldLabel type={type} color={theme.text} label={copy.email} />
                <TextInput
                  value={familyEmail}
                  onChangeText={setFamilyEmail}
                  onBlur={() => markTouched('familyEmail')}
                  placeholder={copy.emailPlaceholder}
                  placeholderTextColor={theme.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, type.body, field, invalidField(emailShowError, theme.text)]}
                />
                {emailShowError ? (
                  <Text style={styles.fieldError}>
                    {!emailFormatOk ? t.validation.emailInvalid : 'Please check your email domain spelling (e.g., yahoo.com)'}
                  </Text>
                ) : null}

                {emailSuggestion ? (
                  <Pressable
                    style={styles.suggestionBox}
                    onPress={() => setFamilyEmail(emailSuggestion)}
                  >
                    <Ionicons name="sparkles" size={14} color={FILL} />
                    <Text style={styles.suggestionText}>
                      Did you mean <Text style={styles.suggestionBold}>{emailSuggestion}</Text>?
                    </Text>
                  </Pressable>
                ) : null}
              </FormSection>
            </View>

            {/* Page 1: Patient Details */}
            <View onLayout={(e) => onPageContentLayout(1, e)} style={[styles.page, { width: pageWidth }]}>
              <FormSection
                title={copy.patientTitle}
                subtitle={copy.patientSubtitle}
                caption={copy.patientCaption}
                titleColor={theme.text}
                muted={theme.muted}
                type={type}
                cardTint={glass.card}
                cardBorder={glass.border}
              >
                <FieldLabel type={type} color={theme.text} label={copy.patientName} />
                <TextInput
                  value={patientName}
                  onChangeText={setPatientName}
                  onBlur={() => markTouched('patientName')}
                  placeholder={copy.patientNamePlaceholder}
                  placeholderTextColor={theme.muted}
                  autoCapitalize="words"
                  style={[styles.input, type.body, field, invalidField(touched.patientName && !patientNameOk, theme.text)]}
                />
                {touched.patientName && !patientNameOk ? (
                  <Text style={styles.fieldError}>{t.validation.required}</Text>
                ) : null}

                <DateOfBirthField
                  theme={theme}
                  label={copy.patientDateOfBirth}
                  labelStyle="plain"
                  radius={22}
                  value={patientDateOfBirth}
                  onChange={(val) => {
                    setPatientDateOfBirth(val);
                    markTouched('patientDateOfBirth');
                  }}
                  error={touched.patientDateOfBirth && !patientDobOk ? t.validation.required : null}
                />

                <Select
                  label={copy.patientLocation}
                  value={patientCity ? copy.cities[patientCity] : copy.patientLocationPlaceholder}
                  placeholder={!patientCity}
                  open={open === 'city'}
                  onToggle={() => setOpen(open === 'city' ? null : 'city')}
                  options={CITIES.map((id) => ({ id, label: copy.cities[id] }))}
                  onSelect={(id) => {
                    setPatientCity(id as FamilyCityId);
                    setOpen(null);
                  }}
                  theme={theme}
                  type={type}
                />

                <PhoneField
                  theme={theme}
                  label={copy.phone}
                  labelStyle="plain"
                  radius={22}
                  value={patientPhone}
                  onChange={setPatientPhone}
                  placeholder="9XXXXXXXX"
                  showValidation
                />
              </FormSection>
            </View>

            {/* Page 2: Support Requirements */}
            <View onLayout={(e) => onPageContentLayout(2, e)} style={[styles.page, { width: pageWidth }]}>
              <FormSection
                title={copy.supportTitle}
                subtitle={copy.supportSubtitle}
                caption={copy.supportCaption}
                titleColor={theme.text}
                muted={theme.muted}
                type={type}
                cardTint={glass.card}
                cardBorder={glass.border}
              >
                <Select
                  label={copy.support}
                  value={support ? copy.supports[support] : copy.selectSupport}
                  placeholder={!support}
                  open={open === 'support'}
                  onToggle={() => setOpen(open === 'support' ? null : 'support')}
                  options={SUPPORTS.map((id) => ({ id, label: copy.supports[id] }))}
                  onSelect={(id) => {
                    setSupport(id as FamilySupportId);
                    setOpen(null);
                  }}
                  theme={theme}
                  type={type}
                />
              </FormSection>
            </View>
          </ScrollView>
        ) : null}
      </Animated.View>

      <View style={styles.dots}>
        {PAGES.map((item) => (
          <Pressable
            key={item}
            onPress={() => goToPage(item)}
            hitSlop={8}
            style={[styles.dot, item === page && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.chipRow}>
        {page > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.navChip, pressed && styles.pressed]}
            onPress={() => goToPage(page - 1)}
          >
            <Ionicons name="arrow-back" size={14} color={FILL} />
            <Text style={styles.navChipText}>{t.common.back}</Text>
          </Pressable>
        ) : (
          <View />
        )}

        {page < PAGES.length - 1 ? (
          <Pressable
            style={({ pressed }) => [styles.navChip, pressed && styles.pressed]}
            onPress={() => goToPage(page + 1)}
          >
            <Text style={styles.navChipText}>{t.common.next}</Text>
            <Ionicons name="arrow-forward" size={14} color={FILL} />
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <GlassCard
        tint={glass.update}
        border={glass.border}
        sheen={glass.sheen}
        shadowColor="#16332C"
        style={styles.noteCard}
      >
        <Ionicons name="shield-checkmark-outline" size={18} color={FILL} />
        <Text style={[type.caption, { color: theme.muted, flex: 1 }]}>
          {landing.requestNote} {copy.noForm}
        </Text>
      </GlassCard>

      <View style={styles.termsRow}>
        <Pressable onPress={() => setAgreed((val) => !val)} hitSlop={8}>
          <View
            style={[
              styles.checkbox,
              { borderColor: agreed ? FILL : glass.wellBorder, backgroundColor: glass.well },
            ]}
          >
            {agreed ? <Ionicons name="checkmark" size={14} color={FILL} /> : null}
          </View>
        </Pressable>
        <Text style={[styles.termsText, type.caption, { color: theme.muted }]}>
          {t.auth.termsAgree}{' '}
          <Text
            style={[styles.termsLink, { color: FILL }]}
            onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}
          >
            {t.auth.termsLink}
          </Text>{' '}
          {t.auth.termsAnd}{' '}
          <Text
            style={[styles.termsLink, { color: FILL }]}
            onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}
          >
            {t.auth.privacyLink}
          </Text>
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          pressed && styles.pressed,
          !canSubmit && styles.disabled,
        ]}
        disabled={!canSubmit}
        onPress={() => {
          if (!canSubmit || !relationship || !patientCity || !support) {
            setTouched({
              familyName: true,
              familyEmail: true,
              patientName: true,
              patientDateOfBirth: true,
            });
            return;
          }
          setSending(true);
          saveFamilyInquiry({
            patientName,
            patientPhone,
            patientCountry: 'ET',
            patientDateOfBirth,
            name: familyName,
            phone: familyPhone,
            email: emailTrimmed,
            country: familyCountry,
            city: patientCity,
            caregiverRelationship: relationship,
            support,
          })
            .then((inquiry) => prepareFamilyPlan(inquiry.id))
            .then(() => router.replace('/family-request-status'))
            .finally(() => setSending(false));
        }}
      >
        <Text style={[styles.primaryText, type.button]}>{copy.send}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.secondary, field, pressed && styles.pressed]}
        onPress={leave}
      >
        <Text style={[type.button, { color: theme.text }]}>{t.common.back}</Text>
      </Pressable>
    </ServiceFlowShell>
  );
}

function FormSection({
  title,
  subtitle,
  caption,
  titleColor,
  muted,
  type,
  cardTint,
  cardBorder,
  children,
}: {
  title: string;
  subtitle: string;
  caption: string;
  titleColor: string;
  muted: string;
  type: ReturnType<typeof useLandingType>;
  cardTint: string;
  cardBorder: string;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: cardTint,
          borderColor: cardBorder,
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, { color: muted }]}>{subtitle}</Text>
      {children}
      <Text style={[styles.sectionCaption, type.caption, { color: muted }]}>
        {caption}
      </Text>
    </View>
  );
}

function invalidField(invalid: boolean, textColor: string) {
  return {
    color: invalid ? DANGER : textColor,
    borderColor: invalid ? DANGER : undefined,
    backgroundColor: invalid ? 'rgba(214,69,69,0.06)' : undefined,
  };
}

function FieldLabel({
  label,
  color,
  type,
}: {
  label: string;
  color: string;
  type: ReturnType<typeof useLandingType>;
}) {
  return <Text style={[styles.label, type.label, { color }]}>{label}</Text>;
}

function Select({
  label,
  value,
  placeholder,
  open,
  onToggle,
  options,
  onSelect,
  theme,
  type,
}: {
  label: string;
  value: string;
  placeholder?: boolean;
  open: boolean;
  onToggle: () => void;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  theme: ReturnType<typeof useServiceTheme>;
  type: ReturnType<typeof useLandingType>;
}) {
  const { isDark } = useAppTheme();
  const field = glassField(isDark);
  const glass = glassTints(isDark, 'family');
  return (
    <View>
      <FieldLabel type={type} color={theme.text} label={label} />
      <Pressable onPress={onToggle} style={[styles.input, styles.select, field]}>
        <Text
          style={[
            type.body,
            {
              color: placeholder ? theme.muted : theme.text,
              flex: 1,
            },
          ]}
        >
          {value}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
      </Pressable>
      {open ? (
        <View style={[styles.menu, field, { backgroundColor: glass.card }]}>
          {options.map((option) => (
            <Pressable key={option.id} style={styles.menuItem} onPress={() => onSelect(option.id)}>
              <Text style={[type.body, { color: theme.text }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const webPagerStyle = {
  touchAction: 'pan-x',
} as ViewStyle;

const webScrollContent = {
  scrollSnapType: 'x mandatory',
} as ViewStyle;

const styles = StyleSheet.create({
  stepBar: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  stepCount: {
    fontVariant: ['tabular-nums'],
  },
  pager: {
    overflow: 'hidden',
  },
  page: {
    paddingRight: 2,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    paddingBottom: 24,
  },
  sectionCaption: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D5DED8',
  },
  dotActive: {
    width: 18,
    backgroundColor: FILL,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 14,
    minHeight: 34,
  },
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(26,58,50,0.08)',
  },
  navChipText: {
    color: FILL,
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    marginBottom: 8,
    textTransform: 'none',
    letterSpacing: 0.1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 22,
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 15,
  },
  fieldError: {
    color: DANGER,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 12,
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(26,58,50,0.06)',
  },
  suggestionText: {
    fontSize: 13,
    color: FILL,
  },
  suggestionBold: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menu: {
    borderWidth: 1,
    borderRadius: 16,
    marginTop: -8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsText: {
    flex: 1,
  },
  termsLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  primary: {
    height: 52,
    borderRadius: 26,
    backgroundColor: FILL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondary: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});