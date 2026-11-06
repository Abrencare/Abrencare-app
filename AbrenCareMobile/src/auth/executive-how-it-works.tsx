import { useRouter } from 'expo-router';

import HowItWorksScreen, { accentTitle } from '@/auth/HowItWorksScreen';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';

const PHOTO = require('@/assets/images/executive-consult-photo.jpg');

export default function ExecutiveHowItWorksScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.executiveFlow;
  const theme = useServiceTheme('executive');

  return (
    <HowItWorksScreen
      service="executive"
      photo={PHOTO}
      badge={copy.badge}
      kicker={copy.kicker}
      title={accentTitle(copy.howTitle, copy.howTitleAccent, theme.accent)}
      subtitle={copy.howBody}
      steps={[
        { icon: 'chatbubble-ellipses-outline', title: copy.step1Title, body: copy.step1Body },
        { icon: 'document-text-outline', title: copy.step2Title, body: copy.step2Body },
        { icon: 'stats-chart-outline', title: copy.step3Title, body: copy.step3Body },
      ]}
      note={copy.clinicalNote}
      primaryLabel={copy.requestCta}
      secondaryLabel={copy.back}
      onPrimary={() => router.push('/executive-request')}
    />
  );
}
