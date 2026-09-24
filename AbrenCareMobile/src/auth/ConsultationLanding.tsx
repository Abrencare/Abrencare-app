import ServiceLanding from '@/auth/ServiceLanding';
import { useLanguage } from '@/context/LanguageContext';

const HERO_PHOTO = require('@/assets/images/stock-consultation-hero.jpg');
const MID_PHOTO = require('@/assets/images/stock-consultation-included.jpg');
const DOCTOR_PHOTO = require('@/assets/images/stock-consultation-why.jpg');

export default function ConsultationLanding() {
  const { t } = useLanguage();
  const copy = t.consultationLanding;

  return (
    <ServiceLanding
      service="consultation"
      copy={copy}
      heroPhoto={HERO_PHOTO}
      midPhoto={MID_PHOTO}
      doctorPhoto={DOCTOR_PHOTO}
      kickerIcon="videocam-outline"
      ctaIcon="videocam-outline"
      heroItems={[
        { icon: 'medkit-outline', label: copy.preventive },
        { icon: 'videocam-outline', label: copy.personalPhysician },
        { icon: 'card-outline', label: copy.advancedScreenings },
      ]}
      included={[
        { icon: 'videocam-outline', title: copy.monitoringTitle, body: copy.monitoringBody },
        { icon: 'chatbubbles-outline', title: copy.labsTitle, body: copy.labsBody },
        { icon: 'calendar-outline', title: copy.cardiacTitle, body: copy.cardiacBody },
        { icon: 'person-outline', title: copy.physicianTitle, body: copy.physicianBody },
      ]}
      steps={[
        { icon: 'person-outline', title: copy.step1Title, body: copy.step1Body },
        { icon: 'calendar-outline', title: copy.step2Title, body: copy.step2Body },
        { icon: 'videocam-outline', title: copy.step3Title, body: copy.step3Body },
      ]}
      trust={[
        { icon: 'people-outline', label: copy.experienced },
        { icon: 'phone-portrait-outline', label: copy.facilities },
        { icon: 'shield-checkmark-outline', label: copy.confidential },
        { icon: 'location-outline', label: copy.localCare },
      ]}
    />
  );
}
