import { Text } from 'react-native';

import { useRouter } from 'expo-router';

import Replace from '@/components/gates/Replace';
import ServiceHeroLanding from '@/auth/ServiceHeroLanding';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { dashboardFor, onboardingPath, useServiceTheme } from '@/service/serviceTheme';

const HERO = require('@/assets/images/executive-landing-full.jpg');

export default function ExecutiveLanding() {
  const router = useRouter();
  const { t } = useLanguage();
  const landing = t.executiveLanding;
  const copy = t.executiveFlow;
  const theme = useServiceTheme('executive');
  const { user, hasService, needsOnboarding } = useAuth();

  if (user && hasService('executive') && !needsOnboarding('executive')) {
    return <Replace href={dashboardFor('executive')} />;
  }

  if (user && hasService('executive') && needsOnboarding('executive')) {
    return <Replace href={onboardingPath('executive')} />;
  }

  return (
    <ServiceHeroLanding
      service="executive"
      photo={HERO}
      kicker={copy.kicker}
      title={
        <>
          {copy.headline}
          {'\n'}
          <Text style={{ color: '#E6D3A8' }}>{copy.headlineAccent}</Text>
        </>
      }
      subtitle={copy.body}
      primaryLabel={copy.talk}
      secondaryLabel={copy.how}
      note={copy.privateNote}
      loginPrefix={landing.alreadyAccount}
      loginLabel={landing.logIn}
      primaryColor={theme.accent}
      onPrimary={() => router.push('/executive-request')}
      onSecondary={() => router.push('/executive-how-it-works')}
    />
  );
}
