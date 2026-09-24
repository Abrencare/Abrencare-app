import Replace from '@/components/gates/Replace';

import { useAuth } from '@/context/AuthContext';
import { dashboardFor, onboardingPath } from '@/service/serviceTheme';
import type { CareService } from '@/types/auth';

type Props = {
  service: CareService;
  children: React.ReactNode;
};

export default function ServiceAccessGate({ service, children }: Props) {
  const { isSignedIn, hasService, needsOnboarding } = useAuth();

  if (!isSignedIn || !hasService(service)) {
    return (
      <Replace href={`/service?service=${service}`} />
    );
  }

  if (needsOnboarding(service)) {
    return <Replace href={onboardingPath(service)} />;
  }

  return <>{children}</>;
}

export function serviceHome(service: CareService) {
  return dashboardFor(service);
}
