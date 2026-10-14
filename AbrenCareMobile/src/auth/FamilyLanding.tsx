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
import { useRouter } from 'expo-router';

import { FamilyFlowHeader } from '@/auth/FamilyRequestChrome';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { dashboardFor, onboardingPath } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';

const HERO_PHOTO = require('@/assets/images/stock-family-hero.jpg');

const PAGE = '#F7F8F6';
const INK = '#16332C';
const MUTED = '#5C6B65';
const FILL = '#1A3A32';
const SOFT = '#E7EEEA';

export default function FamilyLanding() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyLanding;
  const type = useLandingType('family');
  const { user, hasService, needsOnboarding } = useAuth();

  if (user && hasService('family') && !needsOnboarding('family')) {
    return <Replace href={dashboardFor('family')} />;
  }

  if (user && hasService('family') && needsOnboarding('family')) {
    return <Replace href={onboardingPath('family')} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FamilyFlowHeader showBack={false} />
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={[styles.kicker, type.kicker]}>{copy.kicker}</Text>
          <Text style={[styles.headline, type.headline]}>{copy.headline}</Text>
          <Text style={[styles.description, type.body]}>{copy.description}</Text>

          <View style={styles.photoWrap}>
            <Image source={HERO_PHOTO} style={styles.photo} resizeMode="cover" />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={() => router.push('/family-request')}
          >
            <Text style={[styles.primaryText, type.button]}>{copy.createAccount}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={() => router.push('/family-how-it-works')}
          >
            <Text style={[styles.secondaryText, type.button]}>{copy.howCta}</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({ pathname: '/login', params: { service: 'family' } })
            }
          >
            <Text style={[styles.loginRow, type.caption]}>
              {copy.alreadyAccount}{' '}
              <Text style={styles.loginLink}>{copy.logIn}</Text>
            </Text>
          </Pressable>

          <Text style={[styles.note, type.caption]}>{copy.requestNote}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PAGE,
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    justifyContent: 'space-between',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: {
    color: MUTED,
    marginBottom: 12,
  },
  headline: {
    color: INK,
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 14,
  },
  description: {
    color: MUTED,
    marginBottom: 20,
  },
  photoWrap: {
    overflow: 'hidden',
    borderRadius: 22,
    height: 210,
    backgroundColor: SOFT,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  actions: {
    marginTop: 22,
  },
  primary: {
    height: 54,
    borderRadius: 28,
    backgroundColor: FILL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondary: {
    height: 48,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: FILL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  secondaryText: {
    color: FILL,
  },
  loginRow: {
    color: MUTED,
    textAlign: 'center',
    marginBottom: 10,
  },
  loginLink: {
    color: FILL,
    fontWeight: '600',
  },
  note: {
    color: MUTED,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
