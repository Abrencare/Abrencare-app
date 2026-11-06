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

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { parseService } from '@/service/parseService';
import { dashboardFor, onboardingPath, useServiceTheme } from '@/service/serviceTheme';
import AuthField from '@/auth/AuthField';
import AuthNav from '@/auth/AuthNav';
import BrandLogo from '@/components/ui/BrandLogo';
import FlowGlassHero, { FLOW_CHIP, FLOW_MUTED } from '@/components/ui/FlowGlassHero';
import { GlassCard, glassShadow, glassTints } from '@/components/executive/GlassCard';
import Replace from '@/components/gates/Replace';
import { useLanguage } from '@/context/LanguageContext';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { signIn, hasService, needsOnboarding, user } = useAuth();
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

  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const canSubmit = email.includes('@') && password.length > 0;

  if (user && hasService(service) && !needsOnboarding(service)) {
    return <Replace href={dashboardFor(service)} />;
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
            title={t.auth.loginTitle}
            subtitle={t.auth.loginSubtitle}
            top={
              <AuthNav
                service={service}
                active="signin"
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

            <AuthField
              theme={theme}
              label={t.auth.email.toUpperCase()}
              value={email}
              onChangeText={setEmail}
              placeholder={t.auth.emailPlaceholder}
              icon="mail-outline"
              keyboardType="email-address"
            />
            <AuthField
              theme={theme}
              label={t.auth.password.toUpperCase()}
              value={password}
              onChangeText={setPassword}
              placeholder={t.auth.passwordPlaceholder}
              icon="lock-closed-outline"
              secure
            />

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
                !canSubmit && styles.disabled,
              ]}
              onPress={() => {
                if (!canSubmit) {
                  return;
                }
                const next = signIn(email, service);
                if (service === 'family' || service === 'executive') {
                  const granted = next.services.includes(service);
                  if (!granted) {
                    router.replace('/(tabs)');
                    return;
                  }
                  const onboarded =
                    service === 'family'
                      ? next.familyOnboarded || next.familyMembers.length > 0
                      : next.executiveOnboarded;
                  router.replace(
                    onboarded ? dashboardFor(service) : onboardingPath(service),
                  );
                  return;
                }
                router.replace(
                  next.consultationOnboarded
                    ? dashboardFor(service)
                    : onboardingPath(service),
                );
              }}
              disabled={!canSubmit}
            >
              <Text style={styles.buttonText}>{t.auth.signIn}</Text>
            </Pressable>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.muted }]}>
                {t.auth.noAccount}
              </Text>
              <Pressable
                onPress={() =>
                  router.replace({ pathname: '/signup', params: { service } })
                }
                hitSlop={8}
              >
                <Text style={[styles.link, { color: theme.accent }]}>
                  {t.auth.createOne}
                </Text>
              </Pressable>
            </View>
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
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
});
