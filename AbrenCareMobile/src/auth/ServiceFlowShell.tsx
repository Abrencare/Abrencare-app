import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BrandLogo, { BrandHomeLink } from '@/components/ui/BrandLogo';
import FlowGlassHero, {
  FLOW_CHIP,
  FLOW_CHIP_BORDER,
  FLOW_INK,
  FLOW_MUTED,
} from '@/components/ui/FlowGlassHero';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';
import type { CareService } from '@/types/auth';

type Props = {
  service: CareService;
  badge: string;
  kicker: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  accentColor?: string;
};

export default function ServiceFlowShell({
  service,
  badge,
  kicker,
  title,
  subtitle,
  children,
}: Props) {
  const theme = useServiceTheme(service);
  const type = useLandingType(service);
  const { t, language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isPhone = windowWidth < 430;
  const ink = FLOW_INK[service];
  const muted = FLOW_MUTED[service];

  return (
    <View style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: 36 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <FlowGlassHero
            service={service}
            kicker={kicker}
            title={title}
            subtitle={subtitle}
            top={
              <View style={[styles.topBar, isPhone && styles.topBarPhone]}>
                <BrandHomeLink style={styles.brandMark}>
                  <BrandLogo size={isPhone ? 30 : 36} link={false} />
                  <Text
                    style={[
                      styles.brandName,
                      isPhone && styles.brandNamePhone,
                      { fontFamily: type.sansSemi, color: ink },
                    ]}
                  >
                    {language === 'en' ? t.header.brand.toUpperCase() : t.header.brand}
                  </Text>
                </BrandHomeLink>
                <View style={[styles.topRight, isPhone && styles.topRightPhone]}>
                  <View style={[styles.badge, isPhone && styles.badgePhone]}>
                    <Ionicons name="shield-checkmark-outline" size={isPhone ? 12 : 14} color={ink} />
                    <Text style={[styles.badgeText, type.caption, isPhone && styles.badgeTextPhone, { color: muted }]}>
                      {badge}
                    </Text>
                  </View>
                  <View style={styles.langRow}>
                    <Pressable onPress={() => setLanguage('en')} hitSlop={8}>
                      <Text
                        style={[
                          styles.langText,
                          {
                            color: language === 'en' ? ink : muted,
                            fontFamily: type.sansMedium,
                          },
                        ]}
                      >
                        EN
                      </Text>
                    </Pressable>
                    <Text style={[styles.langDot, { color: muted }]}>·</Text>
                    <Pressable onPress={() => setLanguage('am')} hitSlop={8}>
                      <Text
                        style={[
                          styles.langText,
                          {
                            color: language === 'am' ? ink : muted,
                            fontFamily: type.sansMedium,
                          },
                        ]}
                      >
                        {t.common.amharic}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            }
          />
          <View style={[styles.body, isPhone && styles.bodyPhone]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  brandName: {
    fontSize: 13,
    letterSpacing: 2.2,
  },
  topRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: FLOW_CHIP,
    borderColor: FLOW_CHIP_BORDER,
  },
  badgeText: {
    fontSize: 11,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langText: {
    fontSize: 12,
  },
  langDot: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  body: {
    marginTop: -36,
    paddingHorizontal: 22,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  bodyPhone: {
    marginTop: -24,
    paddingHorizontal: 16,
  },
  topBarPhone: {
    marginBottom: 12,
    alignItems: 'center',
  },
  brandNamePhone: {
    fontSize: 12,
    letterSpacing: 1.6,
  },
  topRightPhone: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badgePhone: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    gap: 4,
  },
  badgeTextPhone: {
    fontSize: 10,
  },
});
