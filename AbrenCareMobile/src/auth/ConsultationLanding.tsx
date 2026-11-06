import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BrandLogo from '@/components/ui/BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  dashboardFor,
  onboardingPath,
  useServiceTheme,
} from '@/service/serviceTheme';

const HERO_PHOTO = require('@/assets/images/stock-consultation-hero.jpg');
const BLUE = '#7E93A8';

export default function ConsultationLanding() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const theme = useServiceTheme('consultation');
  const { user, hasService, needsOnboarding } = useAuth();
  const copy = t.consultationFlow;

  const features = [
    { icon: 'medkit-outline' as const, label: copy.featureDoctors },
    { icon: 'videocam-outline' as const, label: copy.featureVideo },
    { icon: 'document-text-outline' as const, label: copy.featureFollow },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View style={styles.brand}>
          <BrandLogo size={40} />
          <Text style={styles.brandName}>{t.auth.brand}</Text>
          <Text style={styles.kicker}>{copy.digital}</Text>
        </View>
        <Pressable
          onPress={() => setLanguage(language === 'en' ? 'am' : 'en')}
          style={styles.lang}
        >
          <Ionicons name="globe-outline" size={14} color={theme.muted} />
          <Text style={[styles.langText, { color: theme.muted }]}>
            {language === 'en' ? t.common.english : t.common.amharic}
          </Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.headline}>{copy.headlineLead}</Text>
          <Text style={[styles.headline, { color: BLUE }]}>
            {copy.headlineAccent}
          </Text>
          <Text style={styles.body}>{copy.body}</Text>
        </View>
        <Image source={HERO_PHOTO} style={styles.photo} />
      </View>

      <View style={styles.features}>
        {features.map((item) => (
          <View key={item.label} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name={item.icon} size={20} color="#243040" />
            </View>
            <Text style={styles.featureLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.seeDoctor}
        style={styles.primary}
        onPress={() => router.push('/consultation-how-it-works')}
      >
        <Text style={styles.primaryText}>{copy.seeDoctor}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.logIn}
        style={styles.secondary}
        onPress={() => {
          if (user && hasService('consultation') && !needsOnboarding('consultation')) {
            router.replace(dashboardFor('consultation'));
            return;
          }
          if (user && hasService('consultation') && needsOnboarding('consultation')) {
            router.replace(onboardingPath('consultation'));
            return;
          }
          router.push({ pathname: '/login', params: { service: 'consultation' } });
        }}
      >
        <Text style={styles.secondaryText}>{copy.logIn}</Text>
      </Pressable>

      <View style={styles.privacyRow}>
        <Ionicons name="shield-checkmark-outline" size={14} color={theme.muted} />
        <Text style={styles.privacy}>{copy.privacy}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  brand: {
    alignItems: 'center',
    flex: 1,
  },
  brandName: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '700',
    color: '#172B42',
  },
  kicker: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: BLUE,
  },
  lang: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F4F6F8',
    position: 'absolute',
    right: 0,
    top: 8,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
  },
  heroCopy: {
    flex: 1,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#172B42',
    lineHeight: 34,
  },
  body: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: '#667384',
  },
  photo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#E4EAF1',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 28,
  },
  feature: {
    width: '30%',
    alignItems: 'center',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F4F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#243040',
    textAlign: 'center',
    lineHeight: 16,
  },
  primary: {
    height: 54,
    borderRadius: 27,
    backgroundColor: BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: '#DDE3EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    color: '#243040',
    fontSize: 16,
    fontWeight: '700',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 8,
  },
  privacy: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#667384',
  },
});
