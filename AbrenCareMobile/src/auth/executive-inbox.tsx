import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/build/useFocusEffect';

import ExecutiveRequestChrome from '@/auth/ExecutiveRequestChrome';
import { useLanguage } from '@/context/LanguageContext';
import {
  loadExecutiveInquiries,
  markExecutiveContacted,
  type ExecutiveInquiry,
  type ExecutiveJourneyStatus,
} from '@/data/executiveInquiry';
import { useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';

export default function ExecutiveInboxScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.executiveRequest;
  const plan = t.executivePlan;
  const type = useLandingType('executive');
  const theme = useServiceTheme('executive');
  const [items, setItems] = useState<ExecutiveInquiry[]>([]);

  const refresh = useCallback(() => {
    loadExecutiveInquiries().then(setItems);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const statusLabel = (status: ExecutiveJourneyStatus) => {
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
    <ExecutiveRequestChrome>
      <Text style={[styles.title, type.headline, { color: theme.text }]}>{copy.inboxTitle}</Text>
      <Text style={[styles.subtitle, type.bodySmall, { color: theme.muted }]}>{plan.inboxHint}</Text>
      {items.length === 0 ? (
        <Text style={[type.body, { color: theme.muted }]}>{copy.inboxEmpty}</Text>
      ) : (
        [...items].reverse().map((item) => (
          <View
            key={item.id}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[type.caption, { color: theme.muted }]}>{statusLabel(item.status)}</Text>
            <Text style={[type.label, { color: theme.text, marginTop: 6 }]}>{item.name}</Text>
            <Text style={[styles.line, type.bodySmall, { color: theme.muted }]}>{item.phone}</Text>
            {item.email ? (
              <Text style={[styles.line, type.bodySmall, { color: theme.muted }]}>{item.email}</Text>
            ) : null}
            <Text style={[styles.line, type.bodySmall, { color: theme.muted }]}>
              {t.countries[item.country]} · {copy.cities[item.city]}
            </Text>
            <Text style={[styles.line, type.bodySmall, { color: theme.muted }]}>
              {copy.supports[item.support]} · {copy.contacts[item.contact]}
            </Text>
            <Text style={[styles.time, type.caption, { color: theme.muted }]}>
              {new Date(item.submittedAt).toLocaleString()}
            </Text>

            {item.status === 'received' ? (
              <Pressable
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}
                onPress={() => markExecutiveContacted(item.id).then(refresh)}
              >
                <Text style={[styles.actionText, type.button]}>{plan.markContacted}</Text>
              </Pressable>
            ) : null}

            {item.status === 'contacted' || item.status === 'proposed' ? (
              <Pressable
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}
                onPress={() => router.push(`/executive-proposal-compose?id=${item.id}`)}
              >
                <Text style={[styles.actionText, type.button]}>
                  {item.proposal ? plan.updateProposal : plan.shareProposal}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </ExecutiveRequestChrome>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  line: { marginTop: 2 },
  time: { marginTop: 8 },
  action: {
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  actionText: { color: '#FFFFFF' },
  pressed: { opacity: 0.88 },
});
