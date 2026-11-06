import type { ReactNode } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BrandLogo, { BrandHomeLink } from '@/components/ui/BrandLogo';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';
import type { CareService } from '@/types/auth';

type Step = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

type Props = {
  service: CareService;
  photo: ImageSourcePropType;
  badge: string;
  kicker: string;
  title: ReactNode;
  subtitle: string;
  steps: Step[];
  note: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  accentColor?: string;
};

export function accentTitle(title: string, accent: string, color: string) {
  const index = accent ? title.indexOf(accent) : -1;
  if (index < 0) {
    return title;
  }

  return (
    <>
      {title.slice(0, index)}
      <Text style={{ color }}>{accent}</Text>
      {title.slice(index + accent.length)}
    </>
  );
}

export default function HowItWorksScreen({
  service,
  photo,
  badge,
  kicker,
  title,
  subtitle,
  steps,
  note,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  accentColor,
}: Props) {
  const router = useRouter();
  const theme = useServiceTheme(service);
  const type = useLandingType(service);
  const { t, language, setLanguage } = useLanguage();
  const accent = accentColor ?? theme.accent;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <BrandHomeLink style={styles.brandMark}>
            <BrandLogo size={36} link={false} />
            <Text
              style={[
                styles.brandName,
                {
                  fontFamily: type.sansSemi,
                  color: theme.text,
                },
              ]}
            >
              {language === 'en' ? t.header.brand.toUpperCase() : t.header.brand}
            </Text>
          </BrandHomeLink>

          <View style={styles.topRight}>
            <View style={[styles.badge, { backgroundColor: theme.field, borderColor: theme.border }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={accent} />
              <Text style={[styles.badgeText, type.caption, { color: theme.muted }]}>{badge}</Text>
            </View>
            <View style={styles.langRow}>
              <Pressable onPress={() => setLanguage('en')} hitSlop={8}>
                <Text
                  style={[
                    styles.langText,
                    { color: language === 'en' ? theme.text : theme.muted, fontFamily: type.sansMedium },
                  ]}
                >
                  EN
                </Text>
              </Pressable>
              <Text style={[styles.langDot, { color: theme.muted }]}>·</Text>
              <Pressable onPress={() => setLanguage('am')} hitSlop={8}>
                <Text
                  style={[
                    styles.langText,
                    { color: language === 'am' ? theme.text : theme.muted, fontFamily: type.sansMedium },
                  ]}
                >
                  {t.common.amharic}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.kicker, type.kicker, { color: accent }]}>{kicker}</Text>
          <Text style={[styles.title, type.headline, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, type.body, { color: theme.muted }]}>{subtitle}</Text>
          <View style={styles.photoWrap}>
            <Image source={photo} style={styles.photo} resizeMode="cover" />
          </View>
        </View>

        {steps.map((step, index) => (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.rail}>
              <View style={[styles.stepIndex, { borderColor: accent, backgroundColor: theme.background }]}>
                <Text style={[styles.stepNumber, type.caption, { color: accent }]}>{index + 1}</Text>
              </View>
              {index < steps.length - 1 ? (
                <View style={[styles.connector, { backgroundColor: accent }]} />
              ) : null}
            </View>
            <View style={[styles.stepCard, { backgroundColor: theme.field, borderColor: theme.border }]}>
              <View style={styles.stepHead}>
                <Ionicons name={step.icon} size={18} color={accent} />
                <Text style={[styles.stepTitle, type.label, { color: theme.text }]}>{step.title}</Text>
              </View>
              <Text style={[styles.stepBody, type.bodySmall, { color: theme.muted }]}>{step.body}</Text>
            </View>
          </View>
        ))}

        <View style={[styles.noteCard, { backgroundColor: theme.field, borderColor: theme.border }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={accent} />
          <Text style={[styles.note, type.caption, { color: theme.muted }]}>{note}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: accent },
            pressed && styles.pressed,
          ]}
          onPress={onPrimary}
        >
          <Text style={[styles.primaryText, type.button]}>{primaryLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondary,
            { backgroundColor: theme.field, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
          onPress={goBack}
        >
          <Text style={[styles.secondaryText, type.button, { color: theme.text }]}>{secondaryLabel}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 28,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  hero: {
    position: 'relative',
    marginBottom: 18,
    minHeight: 156,
  },
  kicker: {
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 8,
    paddingRight: 132,
  },
  subtitle: {
    paddingRight: 152,
  },
  photoWrap: {
    position: 'absolute',
    top: 18,
    right: 0,
    width: 138,
    height: 128,
    borderRadius: 22,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  rail: {
    width: 32,
    alignItems: 'center',
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontWeight: '700',
  },
  connector: {
    width: 1.5,
    flex: 1,
    marginVertical: 4,
    minHeight: 18,
    opacity: 0.55,
  },
  stepCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepTitle: {},
  stepBody: {},
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 12,
  },
  note: {
    flex: 1,
  },
  primary: {
    height: 52,
    borderRadius: 26,
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
  secondaryText: {},
  pressed: {
    opacity: 0.88,
  },
});
