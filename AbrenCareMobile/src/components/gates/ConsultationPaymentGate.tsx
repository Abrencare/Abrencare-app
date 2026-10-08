import type { ReactNode } from 'react';

import Replace from '@/components/gates/Replace';
import { useConsultations } from '@/context/ConsultationContext';
import type { VisitKind } from '@/data/consultationPricing';

type Props = {
  doctorId: string;
  kind: VisitKind;
  next: 'chat' | 'call';
  alreadyPaid: boolean;
  children: ReactNode;
};

/** Instant consults cannot skip the same 450 ETB step as a booked visit. */
export default function ConsultationPaymentGate({
  doctorId,
  kind,
  next,
  alreadyPaid,
  children,
}: Props) {
  const { hasPaidVisit } = useConsultations();

  if (doctorId && !alreadyPaid && !hasPaidVisit(doctorId)) {
    return (
      <Replace
        href={`/consultation/pay?doctor=${encodeURIComponent(doctorId)}&kind=${kind}&next=${next}`}
      />
    );
  }

  return <>{children}</>;
}
