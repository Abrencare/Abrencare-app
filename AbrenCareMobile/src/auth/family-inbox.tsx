import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/build/useFocusEffect';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  loadFamilyInquiries,
  markFamilyContacted,
  type FamilyInquiry,
  type FamilyJourneyStatus,
} from '@/data/familyInquiry';
import { useLandingType } from '@/theme/landingType';

export default function FamilyInboxScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyRequest;
  const plan = t.familyPlan;
  const type = useLandingType('family');
  const { colors } = useAppTheme();
  const [items, setItems] = useState<FamilyInquiry[]>([]);

  const refresh = useCallback(() => {
    loadFamilyInquiries().then(setItems);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const statusLabel = (status: FamilyJourneyStatus) => {
    switch (status) {
      case 'received':
        return plan.stepReceived;
      case 'contacted':
        return plan.stepContacted;
      case 'proposed':
        return plan.stepProposed;
      case 'accepted':
        return plan.acceptedTitle;
      case 'setup':
        return plan.stepSetup;
      case 'active':
        return plan.stepActive;
      default:
        return status;
    }
  };

  return (
    <FamilyRequestChrome>
      <Text style={[styles.title, type.headline, { color: colors.text }]}>{copy.inboxTitle}</Text>
      <Text style={[styles.subtitle, type.bodySmall, { color: colors.muted }]}>{plan.inboxHint}</Text>
      {items.length === 0 ? (
        <Text style={[type.body, { color: colors.muted }]}>{copy.inboxEmpty}</Text>
      ) : (
        [...items].reverse().map((item) => (
          <View
            key={item.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[type.caption, { color: colors.muted }]}>{statusLabel(item.status)}</Text>
            <Text style={[type.label, { color: colors.text, marginTop: 6 }]}>
              {item.patientName}
            </Text>
            <Text style={[styles.line, type.bodySmall, { color: colors.muted }]}>
              {copy.patientSection}: {item.patientPhone} · {t.countries[item.patientCountry]}
            </Text>
            <Text style={[styles.line, type.bodySmall, { color: colors.muted }]}>
              {copy.caregiverSection}: {item.name} · {item.phone}
            </Text>
            <Text style={[styles.line, type.bodySmall, { color: colors.muted }]}>
              {t.countries[item.country]} · {copy.relationships[item.caregiverRelationship]}
            </Text>
            <Text style={[styles.line, type.bodySmall, { color: colors.muted }]}>
              {copy.supports[item.support]}
            </Text>
            <Text style={[styles.time, type.caption, { color: colors.muted }]}>
              {new Date(item.submittedAt).toLocaleString()}
            </Text>

            {item.status === 'received' ? (
              <Pressable
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: colors.continue },
                  pressed && styles.pressed,
                ]}
                onPress={() => markFamilyContacted(item.id).then(refresh)}
              >
                <Text style={[styles.actionText, type.button]}>{plan.markContacted}</Text>
              </Pressable>
            ) : null}

            {item.status === 'contacted' || item.status === 'proposed' ? (
              <Pressable
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: colors.continue },
                  pressed && styles.pressed,
                ]}
                onPress={() => router.push(`/family-proposal-compose?id=${item.id}`)}
              >
                <Text style={[styles.actionText, type.button]}>
                  {item.proposal ? plan.updateProposal : plan.shareProposal}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </FamilyRequestChrome>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  line: {
    marginTop: 2,
  },
  time: {
    marginTop: 8,
  },
  action: {
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  actionText: {
    color: '#FFFFFF',
  },
  pressed: { opacity: 0.88 },
});
