import ServiceLanding from '@/auth/ServiceLanding';
import { useLanguage } from '@/context/LanguageContext';

const HERO_PHOTO = require('@/assets/images/stock-executive-why.jpg');

export default function ExecutiveLanding() {
  const { t } = useLanguage();
  const copy = t.executiveLanding;

  return (
    <ServiceLanding
      service="executive"
      copy={copy}
      heroPhoto={HERO_PHOTO}
      heroItems={[
        { icon: 'pulse-outline', label: copy.preventive },
        { icon: 'flask-outline', label: copy.personalPhysician },
        { icon: 'people-outline', label: copy.advancedScreenings },
      ]}
      included={[
        { icon: 'watch-outline', title: copy.monitoringTitle, body: copy.monitoringBody },
        { icon: 'flask-outline', title: copy.labsTitle, body: copy.labsBody },
        { icon: 'medkit-outline', title: copy.physicianTitle, body: copy.physicianBody },
      ]}
      steps={[
        { icon: 'call-outline', title: copy.step1Title, body: copy.step1Body },
        { icon: 'medkit-outline', title: copy.step2Title, body: copy.step2Body },
        { icon: 'eye-outline', title: copy.step3Title, body: copy.step3Body },
      ]}
      trust={[
        { icon: 'heart-outline', label: copy.experienced },
        { icon: 'pulse-outline', label: copy.facilities },
        { icon: 'medkit-outline', label: copy.confidential },
        { icon: 'leaf-outline', label: copy.localCare },
      ]}
      pitch={{
        scarcity: copy.scarcity,
        messageDoctor: copy.messageDoctor,
        alertCaption: copy.alertCaption,
        alertKicker: t.executiveAlerts.priorityHigh,
        alertTitle: t.executiveAlerts.bpTitle,
        alertBody: t.executiveAlerts.bpBody,
        alertTime: t.executiveAlerts.bpTime,
        emergencyTitle: copy.emergencyTitle,
        emergencyEta: copy.emergencyEta,
        emergencyBody: copy.emergencyBody,
      }}
    />
  );
}
