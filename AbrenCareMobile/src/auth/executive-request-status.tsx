import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ExecutiveWizardChrome from '@/auth/ExecutiveWizardChrome';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { loadExecutiveInquiry, type ExecutiveInquiry } from '@/data/executiveInquiry';
import { executiveCareEntry } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';
import { useExecutiveTheme } from '@/theme/executiveTheme';

export default function ExecutiveRequestStatusScreen() {
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
      <ExecutiveWizardChrome showProgress={false} showBack={false}>
        {null}
      </ExecutiveWizardChrome>
    );
  }

  if (!inquiry) {
    return <Replace href="/executive-request" />;
  }

  const firstName = inquiry.name.trim().split(/\s+/)[0] || inquiry.name;
  const points = [
    { icon: 'time-outline' as const, text: flow.submittedContact },
    { icon: 'person-outline' as const, text: flow.submittedAdvisor, href: '/executive-advisor' },
    { icon: 'document-text-outline' as const, text: flow.submittedPlan },
  ];

  return (
    <ExecutiveWizardChrome
      showProgress={false}
      showBack={false}
      footer={
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: c.accent },
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
          <Text style={[styles.primaryText, type.button, { color: c.onAccent }]}>{flow.backToHome}</Text>
        </Pressable>
      }
    >
      <View style={styles.hero}>
        <View style={[styles.checkWrap, { backgroundColor: c.successSoft }]}>
          <Ionicons name="checkmark" size={36} color={c.success} />
        </View>
        <Text style={[styles.title, type.headline, { color: c.text }]}>{flow.submittedTitle}</Text>
        <Text style={[styles.thanks, type.headline, { color: c.text }]}>
          {flow.submittedThanks.replace('{name}', firstName)}
        </Text>
        <Text style={[styles.body, type.body, { color: c.muted }]}>{flow.submittedBody}</Text>
      </View>

      <View style={styles.points}>
        {points.map((point) => {
          const content = (
            <>
              <View style={[styles.pointIcon, { backgroundColor: c.accentSoft }]}>
                <Ionicons name={point.icon} size={16} color={c.accent} />
              </View>
              <Text style={[styles.pointText, type.bodySmall, { color: c.text }]}>{point.text}</Text>
              {point.href ? <Ionicons name="chevron-forward" size={16} color={c.faint} /> : null}
            </>
          );
          if (point.href) {
            return (
              <Pressable key={point.text} style={styles.point} onPress={() => router.push(point.href)}>
                {content}
              </Pressable>
            );
          }
          return (
            <View key={point.text} style={styles.point}>
              {content}
            </View>
          );
        })}
      </View>

    </ExecutiveWizardChrome>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    marginBottom: 28,
  },
  checkWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    textAlign: 'center',
    marginBottom: 6,
  },
  thanks: {
    textAlign: 'center',
    fontSize: 26,
    marginBottom: 12,
  },
  body: {
    textAlign: 'center',
    maxWidth: 320,
  },
  points: {
    gap: 16,
    paddingHorizontal: 8,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    flex: 1,
  },
  primary: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {},
  pressed: { opacity: 0.88 },
});
