import ServiceLanding from '@/auth/ServiceLanding';
import { useLanguage } from '@/context/LanguageContext';

const HERO_PHOTO = require('@/assets/images/stock-family-hero.jpg');
const MID_PHOTO = require('@/assets/images/stock-family-included.jpg');
const DOCTOR_PHOTO = require('@/assets/images/stock-family-why.jpg');

export default function FamilyLanding() {
  const { t } = useLanguage();
  const copy = t.familyLanding;

  return (
    <ServiceLanding
      service="family"
      copy={copy}
      heroPhoto={HERO_PHOTO}
      midPhoto={MID_PHOTO}
      doctorPhoto={DOCTOR_PHOTO}
      kickerIcon="home-outline"
      ctaIcon="heart-outline"
      heroItems={[
        { icon: 'home-outline', label: copy.preventive },
        { icon: 'pulse-outline', label: copy.personalPhysician },
        { icon: 'medkit-outline', label: copy.advancedScreenings },
      ]}
      included={[
        { icon: 'home-outline', title: copy.monitoringTitle, body: copy.monitoringBody },
        { icon: 'heart-outline', title: copy.labsTitle, body: copy.labsBody },
        { icon: 'flask-outline', title: copy.cardiacTitle, body: copy.cardiacBody },
        { icon: 'chatbubbles-outline', title: copy.physicianTitle, body: copy.physicianBody },
      ]}
      steps={[
        { icon: 'person-outline', title: copy.step1Title, body: copy.step1Body },
        { icon: 'people-outline', title: copy.step2Title, body: copy.step2Body },
        { icon: 'phone-portrait-outline', title: copy.step3Title, body: copy.step3Body },
      ]}
      trust={[
        { icon: 'people-outline', label: copy.experienced },
        { icon: 'location-outline', label: copy.facilities },
        { icon: 'shield-checkmark-outline', label: copy.confidential },
        { icon: 'earth-outline', label: copy.localCare },
      ]}
    />
  );
}
