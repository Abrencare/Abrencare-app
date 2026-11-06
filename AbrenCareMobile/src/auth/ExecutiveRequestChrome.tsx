import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard, glassTints } from '@/components/executive/GlassCard';
import BrandLogo, { BrandHomeLink } from '@/components/ui/BrandLogo';
import FlowGlassHero, {
  FLOW_CHIP,
  FLOW_CHIP_BORDER,
  FLOW_INK,
  FLOW_MUTED,
} from '@/components/ui/FlowGlassHero';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';

type HeaderProps = {
  showBack?: boolean;
  tone?: 'page' | 'hero';
};

export function ExecutiveFlowHeader({ showBack = true, tone = 'page' }: HeaderProps) {
  const router = useRouter();
  const type = useLandingType('executive');
  const { t, language, setLanguage } = useLanguage();
  const colors = useServiceTheme('executive');
  const onHero = tone === 'hero';
  const ink = onHero ? FLOW_INK.executive : colors.text;
  const muted = onHero ? FLOW_MUTED.executive : colors.muted;
  const chip = onHero ? FLOW_CHIP : colors.card;
  const chipBorder = onHero ? FLOW_CHIP_BORDER : colors.border;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  }

  const brand = (
    <BrandHomeLink style={styles.brandMark}>
      <BrandLogo size={32} link={false} />
      <Text style={[styles.brandName, { fontFamily: type.display, color: ink }]}>
        AbrenCare
      </Text>
    </BrandHomeLink>
  );

  return (
    <View style={[styles.topBar, onHero && styles.topBarHero]}>
      {showBack ? (
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={[styles.backButton, { backgroundColor: chip, borderColor: chipBorder }]}
        >
          <Ionicons name="chevron-back" size={20} color={muted} />
        </Pressable>
      ) : (
        brand
      )}

      {showBack ? <View style={styles.brandCenter}>{brand}</View> : <View style={styles.flex} />}

      <Pressable
        onPress={() => setLanguage(language === 'en' ? 'am' : 'en')}
        hitSlop={8}
        style={styles.lang}
      >
        <Text
          style={[
            styles.langText,
            type.caption,
            { color: language === 'en' ? ink : muted },
          ]}
        >
          EN
        </Text>
        <Text style={[styles.langDot, { color: muted }]}>·</Text>
        <Text
          style={[
            styles.langText,
            type.caption,
            { color: language === 'am' ? ink : muted },
          ]}
        >
          {t.common.amharic}
        </Text>
      </Pressable>
    </View>
  );
}

export default function ExecutiveRequestChrome({
  children,
  showBack = true,
  hero,
}: {
  children: ReactNode;
  showBack?: boolean;
  hero?: { kicker?: string; title?: string; subtitle?: string };
}) {
  const theme = useServiceTheme('executive');
  const { isDark } = useAppTheme();
  const glass = glassTints(isDark, 'executive');
  const insets = useSafeAreaInsets();

  if (!hero) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ExecutiveFlowHeader showBack={showBack} />
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.heroContent, { paddingBottom: 36 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FlowGlassHero
            service="executive"
            kicker={hero.kicker}
            title={hero.title}
            subtitle={hero.subtitle}
            top={<ExecutiveFlowHeader showBack={showBack} tone="hero" />}
          />
          <View style={styles.glassBody}>
            <GlassCard
              tint={glass.card}
              border={glass.border}
              sheen={glass.sheen}
              clip={false}
            >
              {children}
            </GlassCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  topBarHero: {
    paddingHorizontal: 0,
    paddingTop: 0,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  brandName: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  lang: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 40,
    justifyContent: 'flex-end',
  },
  langText: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  langDot: {
    marginHorizontal: 5,
    fontSize: 12,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 36,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  heroContent: {
    flexGrow: 1,
    width: '100%',
  },
  glassBody: {
    marginTop: -36,
    paddingHorizontal: 22,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
});
