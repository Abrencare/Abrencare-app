import { useLocalSearchParams } from 'expo-router';

import ConsultationLanding from '@/auth/ConsultationLanding';
import ExecutiveLanding from '@/auth/ExecutiveLanding';
import FamilyLanding from '@/auth/FamilyLanding';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { parseService } from '@/service/parseService';
import { dashboardFor, onboardingPath } from '@/service/serviceTheme';

export default function ServiceIntro() {
  const { user, hasService, needsOnboarding } = useAuth();
  const params = useLocalSearchParams();
  const service = parseService(params.service);

  if (user && hasService(service) && !needsOnboarding(service)) {
    return <Replace href={dashboardFor(service)} />;
  }

  if (user && hasService(service) && needsOnboarding(service)) {
    return <Replace href={onboardingPath(service)} />;
  }

  if (service === 'executive') {
    return <ExecutiveLanding />;
  }

  if (service === 'consultation') {
    return <ConsultationLanding />;
  }

  return <FamilyLanding />;
}
