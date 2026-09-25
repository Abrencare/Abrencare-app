import ServiceLanding from '@/auth/ServiceLanding';
import { useLanguage } from '@/context/LanguageContext';

const HERO_PHOTO = require('@/assets/images/stock-consultation-hero.jpg');

export default function ConsultationLanding() {
  const { t } = useLanguage();
  const copy = t.consultationLanding;

  return (
    <ServiceLanding
      service="consultation"
      copy={copy}
      heroPhoto={HERO_PHOTO}
      heroItems={[
        { icon: 'phone-portrait-outline', label: copy.preventive },
        { icon: 'shield-checkmark-outline', label: copy.personalPhysician },
        { icon: 'medkit-outline', label: copy.advancedScreenings },
      ]}
      included={[
        { icon: 'chatbubbles-outline', title: copy.monitoringTitle, body: copy.monitoringBody },
        { icon: 'refresh-outline', title: copy.labsTitle, body: copy.labsBody },
        { icon: 'document-text-outline', title: copy.cardiacTitle, body: copy.cardiacBody },
      ]}
      steps={[
        { icon: 'person-outline', title: copy.step1Title, body: copy.step1Body },
        { icon: 'videocam-outline', title: copy.step2Title, body: copy.step2Body },
        { icon: 'checkmark-circle-outline', title: copy.step3Title, body: copy.step3Body },
      ]}
      trust={[
        { icon: 'videocam-outline', label: copy.experienced },
        { icon: 'shield-checkmark-outline', label: copy.facilities },
        { icon: 'calendar-outline', label: copy.confidential },
        { icon: 'location-outline', label: copy.localCare },
      ]}
    />
  );
}
