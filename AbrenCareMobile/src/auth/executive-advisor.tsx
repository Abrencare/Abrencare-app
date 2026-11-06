import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ExecutiveWizardChrome from '@/auth/ExecutiveWizardChrome';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { CARE_LINE } from '@/data/contact';
import { loadExecutiveInquiry, type ExecutiveInquiry, type ExecutiveJourneyStatus } from '@/data/executiveInquiry';
import { executiveCareEntry } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';
import { useExecutiveTheme } from '@/theme/executiveTheme';

const STATUS_RANK: Record<ExecutiveJourneyStatus, number> = {
  received: 0,
  contacted: 1,
  proposed: 2,
  accepted: 3,
  setup: 4,
  active: 5,
};

export default function ExecutiveAdvisorScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const flow = t.executiveFlow;
  const type = useLandingType('executive');
  const c = useExecutiveTheme();
  const { user, hasService, needsOnboarding } = useAuth();
  const [inquiry, setInquiry] = useState<ExecutiveInquiry | null | undefined>(undefined);

  useEffect(() => {
    loadExecutiveInquiry().then(setInquiry);
  }, []);

  if (inquiry === undefined) {
    return (
      <ExecutiveWizardChrome showProgress={false} title={flow.advisorTitle} subtitle={flow.advisorSubtitle}>
        {null}
      </ExecutiveWizardChrome>
    );
  }

  if (!inquiry) {
    return <Replace href="/executive-request" />;
  }

  const rank = STATUS_RANK[inquiry.status] ?? 0;
  const steps = [
    { text: flow.advisorStepContact, done: rank >= 1 },
    { text: flow.advisorStepDiscuss, done: rank >= 1 },
    { text: flow.advisorStepPlan, done: rank >= 2 },
    { text: flow.advisorStepQuote, done: rank >= 2 },
  ];

  function callAdvisor() {
    Linking.openURL(`tel:${CARE_LINE}`).catch(() => {});
  }

  function messageAdvisor() {
    const number = CARE_LINE.replace(/[^\d]/g, '');
    Linking.openURL(`https://wa.me/${number}`).catch(() => Linking.openURL(`tel:${CARE_LINE}`));
  }

  return (
    <ExecutiveWizardChrome
      showProgress={false}
      title={flow.advisorTitle}
      subtitle={flow.advisorSubtitle}
      footer={
        <Pressable
          style={({ pressed }) => [
            styles.home,
            { borderColor: c.cardBorder, backgroundColor: c.card },
            pressed && styles.pressed,
          ]}
          onPress={() => {
            if (user && hasService('executive')) {
              router.push(executiveCareEntry(user, hasService, needsOnboarding));
              return;
            }
            router.replace('/(tabs)');
          }}
        >
          <Text style={[type.button, { color: c.text }]}>{flow.backToHome}</Text>
        </Pressable>
      }
    >
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={[styles.avatar, { backgroundColor: c.accentSoft }]}>
          <Text style={[styles.initials, { color: c.accent, fontFamily: type.sansMedium }]}>CA</Text>
        </View>
        <Text style={[styles.name, type.label, { color: c.text }]}>{flow.advisorRole}</Text>
        <Text style={[styles.cardBody, type.bodySmall, { color: c.muted }]}>{flow.advisorBody}</Text>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: c.accent },
              pressed && styles.pressed,
            ]}
            onPress={callAdvisor}
          >
            <Ionicons name="call-outline" size={16} color={c.onAccent} />
            <Text style={[type.caption, { color: c.onAccent }]}>{flow.advisorCall}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: c.card, borderColor: c.cardBorder, borderWidth: 1 },
              pressed && styles.pressed,
            ]}
            onPress={messageAdvisor}
          >
            <Ionicons name="logo-whatsapp" size={16} color={c.text} />
            <Text style={[type.caption, { color: c.text }]}>{flow.advisorWhatsapp}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.nextTitle, type.label, { color: c.text }]}>{flow.advisorNext}</Text>
      <View style={[styles.list, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        {steps.map((step, index) => (
          <View
            key={step.text}
            style={[
              styles.step,
              { borderBottomColor: c.divider },
              index === steps.length - 1 && styles.stepLast,
            ]}
          >
            <View
              style={[
                styles.check,
                {
                  borderColor: step.done ? c.accent : c.cardBorder,
                  backgroundColor: step.done ? c.accent : 'transparent',
                },
              ]}
            >
              {step.done ? <Ionicons name="checkmark" size={12} color={c.onAccent} /> : null}
            </View>
            <Text style={[type.bodySmall, { color: c.text, flex: 1 }]}>{step.text}</Text>
          </View>
        ))}
      </View>
    </ExecutiveWizardChrome>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  initials: {
    fontSize: 22,
  },
  name: {
    marginBottom: 2,
  },
  role: {
    marginBottom: 10,
  },
  cardBody: {
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  action: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextTitle: {
    marginBottom: 10,
  },
  list: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stepLast: {
    borderBottomWidth: 0,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  home: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.88 },
});
