import type { ReactNode } from 'react';
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BrandLogo, { BrandHomeLink } from '@/components/ui/BrandLogo';
import FlowGlassHero, {
  FLOW_CHIP,
  FLOW_CHIP_BORDER,
  FLOW_INK,
  FLOW_MUTED,
} from '@/components/ui/FlowGlassHero';
import { GlassCard, glassTints } from '@/components/executive/GlassCard';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLandingType } from '@/theme/landingType';
import { useExecutiveTheme } from '@/theme/executiveTheme';

type Props = {
  step?: number;
  total?: number;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  showProgress?: boolean;
  showBack?: boolean;
};

export default function ExecutiveWizardChrome({
  step = 1,
  total = 1,
  title,
  subtitle,
  children,
  footer,
  showProgress = true,
  showBack = true,
}: Props) {
  const router = useRouter();
  const type = useLandingType('executive');
  const c = useExecutiveTheme();
  const { isDark } = useAppTheme();
  const glass = glassTints(isDark, 'executive');
  const { t, language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const ink = FLOW_INK.executive;
  const muted = FLOW_MUTED.executive;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <View
      style={[
        styles.safe,
        { backgroundColor: c.page, paddingBottom: footer ? 0 : insets.bottom },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FlowGlassHero
            service="executive"
            kicker={t.executiveFlow.kicker}
            title={title}
            subtitle={subtitle}
            top={
              <View style={styles.topBar}>
                {showBack ? (
                  <Pressable onPress={goBack} hitSlop={12} style={styles.back}>
                    <Ionicons name="chevron-back" size={22} color={ink} />
                  </Pressable>
                ) : (
                  <View style={styles.back} />
                )}
                <BrandHomeLink style={styles.brand}>
                  <View style={styles.brandRow}>
                    <BrandLogo size={22} link={false} />
                    <Text style={[styles.brandName, { fontFamily: type.display, color: ink }]}>
                      {t.header.brand}
                    </Text>
                  </View>
                </BrandHomeLink>
                <Pressable
                  onPress={() => setLanguage(language === 'en' ? 'am' : 'en')}
                  hitSlop={8}
                >
                  <Text style={[styles.lang, { fontFamily: type.sansMedium, color: ink }]}>
                    {language === 'en' ? 'EN' : t.common.amharic}
                  </Text>
                </Pressable>
              </View>
            }
            extra={
              showProgress ? (
                <View style={styles.progressRow}>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${(step / total) * 100}%`, backgroundColor: c.accent },
                      ]}
                    />
                  </View>
                  <Text style={[styles.stepLabel, type.caption, { color: muted }]}>
                    {t.executiveFlow.stepOf
                      .replace('{current}', String(step))
                      .replace('{total}', String(total))}
                  </Text>
                </View>
              ) : null
            }
          />
          <View style={styles.body}>
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
        {footer ? (
          <View
            style={[
              styles.footer,
              { backgroundColor: c.page, paddingBottom: 12 + insets.bottom },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    ...Platform.select({
      web: {
        height: '100vh' as unknown as number,
        maxHeight: '100vh' as unknown as number,
        overflow: 'hidden',
      },
    }),
  },
  flex: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    width: '100%',
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: FLOW_CHIP,
    borderWidth: 1,
    borderColor: FLOW_CHIP_BORDER,
  },
  brand: {
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  lang: {
    fontSize: 12,
    minWidth: 36,
    textAlign: 'right',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  stepLabel: {
    minWidth: 48,
    textAlign: 'right',
  },
  body: {
    marginTop: -36,
    paddingHorizontal: 22,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 8,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
});
