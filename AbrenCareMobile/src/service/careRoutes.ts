import type { AuthUser, CareService } from '@/types/auth';

/**
 * The bottom bar navigates within the app, so its destinations follow the
 * service the member already pays for rather than asking them to choose again.
 */
export function primaryServiceOf(user: AuthUser | null): CareService | null {
  if (!user || user.services.length === 0) {
    return null;
  }

  const order: CareService[] = ['family', 'executive', 'consultation'];
  return order.find((service) => user.services.includes(service)) ?? null;
}

export type CareRoutes = {
  myCare: string;
  book: string;
  profile: string;
};

export function careRoutesFor(service: CareService | null): CareRoutes {
  switch (service) {
    case 'family':
      return {
        myCare: '/family/reports',
        book: '/family/appointments',
        profile: '/family/profile',
      };
    case 'executive':
      return {
        myCare: '/executive/health',
        book: '/executive/consultation',
        profile: '/executive/profile',
      };
    case 'consultation':
      return {
        myCare: '/consultation/mycare',
        book: '/consultation/doctors',
        profile: '/consultation/profile',
      };
    default:
      // Nothing subscribed yet: send them to the service picker.
      return { myCare: '/service', book: '/service', profile: '/login' };
  }
}
