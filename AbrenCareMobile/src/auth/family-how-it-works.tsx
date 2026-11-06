import { useRouter } from 'expo-router';

import HowItWorksScreen, { accentTitle } from '@/auth/HowItWorksScreen';
import { useLanguage } from '@/context/LanguageContext';

const PHOTO = require('@/assets/images/family-care-photo.jpg');

export default function FamilyHowItWorksScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyLanding;
  const fill = '#1A3A32';

  return (
    <HowItWorksScreen
      service="family"
      photo={PHOTO}
      badge={copy.badge}
      kicker={copy.kicker}
      title={accentTitle(copy.howPageTitle, copy.howPageAccent, fill)}
      accentColor={fill}
      subtitle={copy.howPageBody}
      steps={[
        { icon: 'chatbubble-ellipses-outline', title: copy.step1Title, body: copy.step1Body },
        { icon: 'document-text-outline', title: copy.step2Title, body: copy.step2Body },
        { icon: 'stats-chart-outline', title: copy.step3Title, body: copy.step3Body },
      ]}
      note={copy.clinicalNote}
      primaryLabel={copy.createAccount}
      secondaryLabel={t.common.back}
      onPrimary={() => router.push('/family-request')}
    />
  );
}
