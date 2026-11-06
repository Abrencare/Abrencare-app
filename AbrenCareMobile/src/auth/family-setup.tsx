import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import {
  activateFamilyCare,
  loadFamilyInquiry,
  markFamilySetupStarted,
  type FamilyCaregiverRelationshipId,
  type FamilyInquiry,
} from '@/data/familyInquiry';
import { dashboardFor } from '@/service/serviceTheme';
import {
  kindFromRelationship,
  type FamilyMember,
  type FamilyRelationship,
} from '@/types/auth';
import { ageYearsFromIso } from '@/utilities/birthInput';

const CITY_LABELS: Record<string, string> = {
  addis: 'Addis Ababa',
  direDawa: 'Dire Dawa',
  hawassa: 'Hawassa',
  bahirDar: 'Bahir Dar',
  mekelle: 'Mekelle',
  gondar: 'Gondar',
  other: 'Another city in Ethiopia',
};

/** Form option is who the patient is to the account holder (Mother = patient is mother). */
function patientRelationshipFromCaregiver(
  relationship: FamilyCaregiverRelationshipId | undefined,
): FamilyRelationship {
  switch (relationship) {
    case 'mother':
      return 'mother';
    case 'father':
      return 'father';
    case 'parent':
      return 'parent';
    case 'spouse':
      return 'spouse';
    case 'child':
      return 'child';
    default:
      return 'parent';
  }
}

function memberFromInquiry(
  inquiry: FamilyInquiry | null,
  fallbackName: string,
): FamilyMember {
  const relationship = patientRelationshipFromCaregiver(
    inquiry?.caregiverRelationship,
  );
  const patientName =
    inquiry?.patientName?.trim() ||
    inquiry?.name?.trim() ||
    fallbackName.trim() ||
    'Loved one';
  const cityId = inquiry?.city ?? 'addis';
  const dateOfBirth = inquiry?.patientDateOfBirth?.trim() || '';
  return {
    id: `member-${Date.now()}`,
    kind: kindFromRelationship(relationship),
    name: patientName,
    relationship,
    dateOfBirth,
    ageYears: ageYearsFromIso(dateOfBirth),
    phone: inquiry?.patientPhone?.trim() || '',
    city: CITY_LABELS[cityId] ?? CITY_LABELS.addis,
    address: '',
    emergencyPhone: inquiry?.phone?.trim() || '',
    careNeeds: ['general'],
    preferredLanguage: '',
    notes: '',
    status:
      inquiry?.status === 'accepted' ||
      inquiry?.status === 'setup' ||
      inquiry?.status === 'active'
        ? 'active'
        : 'pending',
  };
}

/**
 * Completes any remaining family onboarding, then opens the family home dashboard.
 */
export default function FamilySetupScreen() {
  const { user, hasService, completeFamilyOnboarding } = useAuth();
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      if (!user || !hasService('family')) {
        return;
      }

      const inquiry = await loadFamilyInquiry();
      if (cancelled) {
        return;
      }

      if (!user.familyOnboarded || user.familyMembers.length === 0) {
        completeFamilyOnboarding([
          memberFromInquiry(inquiry, user.name || 'Loved one'),
        ]);
      }

      const accepted =
        inquiry &&
        (inquiry.status === 'accepted' ||
          inquiry.status === 'setup' ||
          inquiry.status === 'active');

      if (accepted && inquiry) {
        await markFamilySetupStarted(inquiry.id);
        await activateFamilyCare(inquiry.id);
        if (!cancelled) {
          setDestination(dashboardFor('family'));
        }
        return;
      }

      if (!cancelled) {
        setDestination('/family-request-status');
      }
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [completeFamilyOnboarding, hasService, user]);

  if (!user || !hasService('family')) {
    return <Replace href="/signup?service=family" />;
  }

  if (!user.emailVerified) {
    return <Replace href="/verify-email" />;
  }

  if (!destination) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#1A3A32" />
      </View>
    );
  }

  return <Replace href={destination} />;
}
