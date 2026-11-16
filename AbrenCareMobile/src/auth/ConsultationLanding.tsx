import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import ServiceBackButton from '@/components/navigation/ServiceBackButton';
import BrandLogo from '@/components/ui/BrandLogo';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';
import {
  CONSULT_INK,
  CONSULT_LINE,
  CONSULT_MUTED,
  CONSULT_PAGE,
  CONSULT_SOFT,
  CONSULT_TEAL,
  CONSULT_TEAL_DEEP,
} from '@/theme/consultation';

// Use a licensed, real photograph here (a doctor on a video consultation works
// best). Square or portrait crops around the face look best in the circle.
const HERO_PHOTO = require('@/assets/images/stock-consultation-hero.jpg');

export default function ConsultationLanding() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const theme = useServiceTheme('consultation');
  const copy = t.consultationFlow;

  const features = [
    { icon: 'medkit' as const, label: copy.featureDoctors },
    { icon: 'videocam' as const, label: copy.featureVideo },
    { icon: 'document-text' as const, label: copy.featureFollow },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Brand + language */}
        <View style={styles.top}>
          <View style={styles.backWrap}>
            <ServiceBackButton
              color={theme.text}
              background={theme.accentSoft}
              borderColor={theme.border}
              size={36}
            />
          </View>
          <View style={styles.brand}>
            <BrandLogo size={46} />
            <Text style={[styles.brandName, { color: theme.text }]}>{t.auth.brand}</Text>
            <Text style={[styles.kicker, { color: theme.muted }]}>{copy.digital}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setLanguage(language === 'en' ? 'am' : 'en')}
            style={styles.lang}
            hitSlop={8}
          >
            <Ionicons name="globe-outline" size={16} color={theme.text} />
            <Text style={[styles.langText, { color: theme.text }]}>
              {language === 'en' ? t.common.english : t.common.amharic}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.text} />
          </Pressable>
        </View>

        {/* Headline, copy and the photo */}
        <View style={styles.hero}>
          <View style={styles.photoStage} pointerEvents="none">
            <View style={[styles.photoBackdrop, { backgroundColor: theme.accentSoft }]} />
            <Image source={HERO_PHOTO} style={styles.photo} resizeMode="cover" />

            <View style={styles.callControls}>
              <View style={[styles.control, styles.controlDark]}>
                <Ionicons name="videocam" size={16} color="#FFFFFF" />
              </View>
              <View style={[styles.control, styles.controlDark]}>
                <Ionicons name="mic" size={16} color="#FFFFFF" />
              </View>
              <View style={[styles.control, styles.controlEnd]}>
                <Ionicons
                  name="call"
                  size={16}
                  color="#FFFFFF"
                  style={styles.endIcon}
                />
              </View>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <Text style={[styles.headline, { color: theme.text }]}>{copy.headlineLead}</Text>
            <Text style={[styles.headline, { color: theme.accent }]}>
              {copy.headlineAccent}
            </Text>
            <LinearGradient
              colors={[theme.accent, CONSULT_TEAL_DEEP]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.accentLine}
            />
            <Text style={[styles.body, { color: theme.muted }]}>{copy.body}</Text>
          </View>
        </View>

        {/* Feature tiles */}
        <View style={styles.features}>
          {features.map((item) => (
            <View key={item.label} style={styles.feature}>
              <View style={[styles.featureTile, { backgroundColor: theme.accentSoft }]}>
                <View style={styles.featureIcon}>
                  <Ionicons name={item.icon} size={22} color={theme.accent} />
                </View>
              </View>
              <Text style={[styles.featureLabel, { color: theme.text }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.seeDoctor}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: theme.accent, shadowColor: theme.accent },
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/consultation-how-it-works')}
        >
          <Text style={styles.primaryText}>{copy.seeDoctor}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.logIn}
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: theme.accent },
            pressed && styles.pressed,
          ]}
          onPress={() => {
            router.push({ pathname: '/login', params: { service: 'consultation' } });
          }}
        >
          <Text style={[styles.secondaryText, { color: theme.accent }]}>{copy.logIn}</Text>
        </Pressable>

        <View style={styles.privacyRow}>
          <Ionicons name="shield-checkmark-outline" size={22} color={theme.muted} />
          <Text style={[styles.privacy, { color: theme.muted }]}>{copy.privacy}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PHOTO = 184;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CONSULT_PAGE,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 24,
  },

  top: {
    paddingTop: 8,
    minHeight: 120,
  },
  backWrap: {
    position: 'absolute',
    left: 0,
    top: 10,
    zIndex: 2,
  },
  brand: {
    alignItems: 'center',
  },
  brandName: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: CONSULT_INK,
  },
  kicker: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: CONSULT_MUTED,
    textTransform: 'uppercase',
  },
  lang: {
    position: 'absolute',
    right: 0,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  langText: {
    fontSize: 13,
    fontWeight: '600',
    color: CONSULT_INK,
  },

  // The photo sits on the right and the text on the left; the text stays on top.
  hero: {
    marginTop: 26,
    minHeight: 300,
  },
  heroCopy: {
    zIndex: 2,
  },
  headline: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.9,
    color: CONSULT_INK,
  },
  // Short accent rule between the headline and the copy.
  accentLine: {
    width: '56%',
    height: 3,
    borderRadius: 2,
    marginTop: 16,
  },
  body: {
    marginTop: 14,
    width: '56%',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    color: CONSULT_MUTED,
  },
  photoStage: {
    position: 'absolute',
    right: -34,
    top: 78,
    width: PHOTO + 40,
    height: PHOTO + 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  photoBackdrop: {
    position: 'absolute',
    width: PHOTO + 40,
    height: PHOTO + 40,
    borderRadius: (PHOTO + 40) / 2,
    backgroundColor: CONSULT_SOFT,
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: CONSULT_LINE,
  },
  callControls: {
    position: 'absolute',
    left: 14,
    bottom: 10,
    flexDirection: 'row',
    gap: 8,
  },
  control: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CONSULT_INK,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  controlDark: {
    backgroundColor: CONSULT_TEAL_DEEP,
  },
  controlEnd: {
    backgroundColor: '#E5484D',
  },
  endIcon: {
    transform: [{ rotate: '135deg' }],
  },

  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 26,
  },
  feature: {
    width: '31%',
    alignItems: 'center',
  },
  featureTile: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: CONSULT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CONSULT_INK,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  featureLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    color: CONSULT_INK,
    textAlign: 'center',
  },

  primary: {
    height: 56,
    borderRadius: 28,
    backgroundColor: CONSULT_TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: CONSULT_TEAL,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondary: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: CONSULT_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    color: CONSULT_TEAL,
    fontSize: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 22,
    paddingHorizontal: 12,
  },
  privacy: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: CONSULT_MUTED,
  },
});
