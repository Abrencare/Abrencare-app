import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/build/useFocusEffect';

import ExecutiveRequestChrome from '@/auth/ExecutiveRequestChrome';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { CARE_LINE } from '@/data/contact';
import {
  acceptExecutiveProposal,
  activateExecutiveCare,
  loadExecutiveInquiry,
  type ExecutiveInquiry,
} from '@/data/executiveInquiry';
import { dashboardFor, executiveCareEntry, onboardingPath, useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';

const CARE_SCENE = require('@/assets/images/stock-executive-why.jpg');
const DOCTOR_PHOTO = require('@/assets/images/executive-doctor-portrait.jpg');
const COORDINATOR_PHOTO = require('@/assets/images/executive-sarah-portrait.jpg');

function splitPlanTitle(title: string) {
  const marker = 'private care plan';
  const index = title.toLowerCase().indexOf(marker);
  if (index <= 0) {
    return { lead: title, accent: '' };
  }
  return {
    lead: `${title.slice(0, index).trimEnd()}\n`,
    accent: title.slice(index),
  };
}

const SERVICE_ICONS = [
  'home-outline',
  'person-outline',
  'document-text-outline',
  'people-outline',
] as const;

export default function ExecutiveCarePlanScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.executivePlan;
  const flow = t.executiveFlow;
  const home = t.executiveHome;
  const type = useLandingType('executive');
  const theme = useServiceTheme('executive');
  const { user, hasService, needsOnboarding, enterDemoCare } = useAuth();
  const [inquiry, setInquiry] = useState<ExecutiveInquiry | null | undefined>(undefined);
  const [accepting, setAccepting] = useState(false);

  const refresh = useCallback(() => {
    loadExecutiveInquiry().then(setInquiry);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (inquiry === undefined) {
    return <ExecutiveRequestChrome>{null}</ExecutiveRequestChrome>;
  }

  if (!inquiry) {
    return <Replace href="/executive-request" />;
  }

  const proposal = inquiry.proposal;
  const careName = proposal?.recipient || inquiry.name;
  const planTitle = splitPlanTitle(flow.planTitle);
  const services = [
    { title: flow.service1, detail: proposal?.visitFrequency || flow.service1Body },
    { title: flow.service2, detail: flow.service2Body },
    { title: flow.service3, detail: flow.service3Body },
    { title: flow.service4, detail: flow.service4Body },
  ];
  const canAccept = inquiry.status === 'proposed' && !!proposal && !accepting;
  const canContinueSetup = inquiry.status === 'accepted' || inquiry.status === 'setup';

  const askQuestion = () => {
    const number = CARE_LINE.replace(/[^\d]/g, '');
    Linking.openURL(`https://wa.me/${number}`).catch(() => Linking.openURL(`tel:${CARE_LINE}`));
  };

  const goToSetup = () => {
    if (user && hasService('executive')) {
      router.push(needsOnboarding('executive') ? onboardingPath('executive') : dashboardFor('executive'));
      return;
    }
    router.push({ pathname: '/open-care', params: { service: 'executive' } });
  };

  const onAccept = () => {
    if (!canAccept) {
      return;
    }
    setAccepting(true);
    acceptExecutiveProposal(inquiry.id)
      .then(() => {
        enterDemoCare('executive', {
          name: inquiry.name,
          email: inquiry.email,
          phone: inquiry.phone,
        });
        return activateExecutiveCare(inquiry.id);
      })
      .then(() => router.replace('/executive'))
      .finally(() => setAccepting(false));
  };

  const waiting =
    inquiry.status === 'received'
      ? { title: copy.waitingReceivedTitle, body: copy.waitingReceivedBody }
      : inquiry.status === 'contacted'
        ? { title: copy.waitingContactedTitle, body: copy.waitingContactedBody }
        : inquiry.status === 'accepted'
          ? { title: copy.acceptedTitle, body: copy.acceptedNote }
          : inquiry.status === 'setup'
            ? { title: copy.setupTitle, body: copy.setupNote }
            : inquiry.status === 'active'
              ? { title: copy.activeTitle, body: copy.activeNote }
              : null;

  return (
    <ExecutiveRequestChrome>
      {proposal ? (
        <View>
          <View style={styles.badgeRow}>
            <Text style={[type.kicker, { color: theme.accent }]}>{flow.kicker}</Text>
            <View style={[styles.badge, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Ionicons name="shield-checkmark-outline" size={13} color={theme.accent} />
              <Text style={[styles.badgeText, { color: theme.text }]}>{flow.badge}</Text>
            </View>
          </View>

          <Text style={[styles.headline, type.headline, { color: theme.text }]}>
            {planTitle.lead}
            {planTitle.accent ? (
              <Text style={{ color: theme.accent }}>{planTitle.accent}</Text>
            ) : null}
          </Text>
          <Text style={[styles.subtitle, type.body, { color: theme.muted }]}>
            {flow.planFor.replace('{name}', careName)}
          </Text>

          <View style={styles.sceneWrap}>
            <Image
              source={CARE_SCENE}
              style={styles.scenePhoto}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(248, 244, 236, 0)', 'rgba(42, 35, 24, 0.28)', 'rgba(42, 35, 24, 0.62)']}
              locations={[0.38, 0.72, 1]}
              style={styles.sceneFade}
              pointerEvents="none"
            />
          </View>

          <View style={[styles.serviceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {services.map((service, index) => (
              <View
                key={service.title}
                style={[styles.serviceRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}
              >
                <View style={[styles.rowIcon, { borderColor: theme.accent }]}>
                  <Ionicons name={SERVICE_ICONS[index]} size={15} color={theme.accent} />
                </View>
                <View style={styles.serviceCopy}>
                  <Text style={[type.label, { color: theme.text }]}>{service.title}</Text>
                  <Text style={[type.caption, { color: theme.muted }]}>{service.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={[styles.detailsKicker, type.kicker, { color: theme.muted }]}>
            {flow.planDetails}
          </Text>
          <View style={[styles.detailsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.detailRow}>
              <View style={[styles.rowIcon, { borderColor: theme.accent }]}>
                <Ionicons name="location-outline" size={15} color={theme.accent} />
              </View>
              <View style={styles.serviceCopy}>
                <Text style={[type.label, { color: theme.text }]}>{flow.location}</Text>
                <Text style={[type.caption, { color: theme.muted }]}>{flow.locationValue}</Text>
              </View>
            </View>

            <View style={[styles.detailRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <Image source={DOCTOR_PHOTO} style={styles.avatar} />
              <View style={styles.serviceCopy}>
                <Text style={[type.label, { color: theme.text }]}>{flow.lead}</Text>
                <Text style={[type.bodySmall, { color: theme.text }]}>{home.doctorName}</Text>
                <Text style={[type.caption, { color: theme.muted }]}>{flow.leadRole}</Text>
              </View>
            </View>

            <View style={[styles.detailRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <Image source={COORDINATOR_PHOTO} style={styles.avatar} />
              <View style={styles.serviceCopy}>
                <Text style={[type.label, { color: theme.text }]}>{flow.coordinator}</Text>
                <Text style={[type.bodySmall, { color: theme.text }]}>{home.nurseName}</Text>
                <Text style={[type.caption, { color: theme.muted }]}>{flow.coordinatorRole}</Text>
              </View>
            </View>

            <View style={[styles.detailRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <View style={[styles.rowIcon, { borderColor: theme.accent }]}>
                <Ionicons name="document-text-outline" size={15} color={theme.accent} />
              </View>
              <Text style={[type.bodySmall, { color: theme.muted, flex: 1 }]}>{flow.quote}</Text>
            </View>
          </View>
        </View>
      ) : waiting ? (
        <View style={[styles.waitCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.headline, type.headline, { color: theme.text }]}>{waiting.title}</Text>
          <Text style={[type.body, { color: theme.muted }]}>{waiting.body}</Text>
        </View>
      ) : null}

      {canAccept ? (
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}
          onPress={onAccept}
        >
          <Text style={[styles.primaryText, type.button]}>{flow.approve}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </Pressable>
      ) : null}

      {canContinueSetup ? (
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}
          onPress={goToSetup}
        >
          <Text style={[styles.primaryText, type.button]}>{copy.continueSetup}</Text>
        </Pressable>
      ) : null}

      {inquiry.status === 'received' ? (
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}
          onPress={() => router.push(executiveCareEntry(user, hasService, needsOnboarding))}
        >
          <Text style={[styles.primaryText, type.button]}>{copy.goHome}</Text>
        </Pressable>
      ) : null}

      {inquiry.status === 'active' ? (
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}
          onPress={() => router.replace(dashboardFor('executive'))}
        >
          <Text style={[styles.primaryText, type.button]}>{copy.goHome}</Text>
        </Pressable>
      ) : null}

      {inquiry.status !== 'active' ? (
        <Pressable
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: theme.accent, backgroundColor: theme.background },
            pressed && styles.pressed,
          ]}
          onPress={askQuestion}
        >
          <Text style={[type.button, { color: theme.text }]}>{flow.ask}</Text>
        </Pressable>
      ) : null}
    </ExecutiveRequestChrome>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  headline: { fontSize: 32, lineHeight: 38, marginBottom: 8 },
  subtitle: { marginBottom: 16 },
  waitCard: { borderRadius: 22, borderWidth: 1, padding: 20, marginBottom: 18 },
  sceneWrap: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#2B2318',
  },
  scenePhoto: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  sceneFade: {
    ...StyleSheet.absoluteFill,
  },
  serviceCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  serviceCopy: { flex: 1 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsKicker: { marginBottom: 10 },
  detailsCard: { borderWidth: 1, borderRadius: 22, overflow: 'hidden', marginBottom: 18 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  primary: {
    minHeight: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  primaryText: { color: '#FFFFFF', textAlign: 'center' },
  secondary: {
    minHeight: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  pressed: { opacity: 0.88 },
});
