import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import Replace from '@/components/gates/Replace';
import ServiceHeroLanding from '@/auth/ServiceHeroLanding';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { dashboardFor, onboardingPath } from '@/service/serviceTheme';

const HERO = require('@/assets/images/family-landing-full.jpg');
const FILL = '#1A3A32';

function overlayCopy(headline: string, fallback: string) {
  const parts = headline.split(/\.\s+|።\s*/).filter(Boolean);
  if (parts.length < 2) {
    return { title: headline, subtitle: fallback };
  }
  const end = headline.includes('።') ? '።' : '.';
  return {
    title: `${parts[0]}${end}`,
    subtitle: parts.slice(1).join('. '),
  };
}

export default function FamilyLanding() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyLanding;
  const overlay = overlayCopy(copy.headline, copy.description);
  const { user, hasService, needsOnboarding } = useAuth();

  if (user && hasService('family') && !needsOnboarding('family')) {
    return <Replace href={dashboardFor('family')} />;
  }

  if (user && hasService('family') && needsOnboarding('family')) {
    return <Replace href={onboardingPath('family')} />;
  }

  return (
    <ServiceHeroLanding
      service="family"
      photo={HERO}
      kicker={copy.kicker}
      title={overlay.title}
      subtitle={overlay.subtitle}
      primaryLabel={copy.createAccount}
      secondaryLabel={copy.howCta}
      note={copy.requestNote}
      loginPrefix={copy.alreadyAccount}
      loginLabel={copy.logIn}
      primaryColor={FILL}
      onPrimary={() => router.push('/family-request')}
      onSecondary={() => router.push('/family-how-it-works')}
      extra={
        <View style={styles.legalRow}>
          <Pressable
            onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{t.auth.termsLink}</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{t.auth.privacyLink}</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalDot: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
});
