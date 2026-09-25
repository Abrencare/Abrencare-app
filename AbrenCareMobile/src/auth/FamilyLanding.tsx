import ServiceLanding from '@/auth/ServiceLanding';
import { useLanguage } from '@/context/LanguageContext';

const HERO_PHOTO = require('@/assets/images/stock-family-hero.jpg');

export default function FamilyLanding() {
  const { t } = useLanguage();
  const copy = t.familyLanding;

  return (
    <ServiceLanding
      service="family"
      copy={copy}
      heroPhoto={HERO_PHOTO}
      heroItems={[
        { icon: 'earth-outline', title: copy.experienced, body: copy.experiencedBody },
        { icon: 'time-outline', title: copy.facilities, body: copy.facilitiesBody },
        { icon: 'people-outline', title: copy.confidential, body: copy.confidentialBody },
        { icon: 'heart-outline', title: copy.localCare, body: copy.localCareBody },
      ]}
      included={[
        { icon: 'home-outline', title: copy.monitoringTitle, body: copy.monitoringBody },
        { icon: 'pulse-outline', title: copy.labsTitle, body: copy.labsBody },
        { icon: 'flask-outline', title: copy.cardiacTitle, body: copy.cardiacBody },
        { icon: 'medkit-outline', title: copy.physicianTitle, body: copy.physicianBody },
      ]}
      steps={[
        { icon: 'home-outline', title: copy.step1Title, body: copy.step1Body },
        { icon: 'pulse-outline', title: copy.step2Title, body: copy.step2Body },
        { icon: 'chatbubbles-outline', title: copy.step3Title, body: copy.step3Body },
      ]}
      trust={[
        { icon: 'earth-outline', label: copy.experienced },
        { icon: 'time-outline', label: copy.facilities },
        { icon: 'shield-checkmark-outline', label: copy.confidential },
        { icon: 'leaf-outline', label: copy.localCare },
      ]}
    />
  );
}
