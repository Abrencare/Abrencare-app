import ServiceLanding from '@/auth/ServiceLanding';
import { useLanguage } from '@/context/LanguageContext';

const HERO_PHOTO = require('@/assets/images/stock-executive-hero.jpg');
const MID_PHOTO = require('@/assets/images/stock-executive-included.jpg');
const DOCTOR_PHOTO = require('@/assets/images/stock-executive-why.jpg');

export default function ExecutiveLanding() {
  const { t } = useLanguage();
  const copy = t.executiveLanding;

  return (
    <ServiceLanding
      service="executive"
      copy={copy}
      heroPhoto={HERO_PHOTO}
      midPhoto={MID_PHOTO}
      doctorPhoto={DOCTOR_PHOTO}
      kickerIcon="heart-outline"
      ctaIcon="medal-outline"
      heroItems={[
        { icon: 'shield-checkmark-outline', label: copy.preventive },
        { icon: 'person-outline', label: copy.personalPhysician },
        { icon: 'pulse-outline', label: copy.advancedScreenings },
      ]}
      included={[
        { icon: 'pulse-outline', title: copy.monitoringTitle, body: copy.monitoringBody },
        { icon: 'flask-outline', title: copy.labsTitle, body: copy.labsBody },
        { icon: 'heart-outline', title: copy.cardiacTitle, body: copy.cardiacBody },
        { icon: 'person-outline', title: copy.physicianTitle, body: copy.physicianBody },
      ]}
      steps={[
        { icon: 'person-outline', title: copy.step1Title, body: copy.step1Body },
        { icon: 'calendar-outline', title: copy.step2Title, body: copy.step2Body },
        { icon: 'document-text-outline', title: copy.step3Title, body: copy.step3Body },
      ]}
      trust={[
        { icon: 'people-outline', label: copy.experienced },
        { icon: 'business-outline', label: copy.facilities },
        { icon: 'shield-checkmark-outline', label: copy.confidential },
        { icon: 'location-outline', label: copy.localCare },
      ]}
    />
  );
}
