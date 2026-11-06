import React, { useEffect } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { GlassCard, glassTints } from '@/components/executive/GlassCard';
import { FamilyHero } from '@/components/family/FamilyHero';
import FamilyIconWell from '@/components/family/FamilyIconWell';
import { useAppointments } from '@/context/AppointmentsContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useVisit } from '@/context/VisitContext';
import { CARE_LINE } from '@/data/contact';
import type { FamilyInquiry } from '@/data/familyInquiry';
import { useFamilyJourney } from '@/hooks/useFamilyJourney';
import { useLandingType } from '@/theme/landingType';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { formatClock, formatDateKey } from '@/utilities/familyFormat';
import { activeFamilyMember } from '@/utilities/familyMember';
import type { FamilyMember } from '@/types/auth';

const GREEN = '#5E7A62';
const CARE_PHONE = CARE_LINE;

function shortNurse(name: string) {
  const first = name.replace(/^Nurse\s+/i, '').split(' ').filter(Boolean)[0];
  if (!first) {
    return name;
  }
  return /^nurse\b/i.test(name) ? `Nurse ${first}` : first;
}

function glanceFor(
  member: FamilyMember | null,
  copy: {
    greetingSubtitle: string;
    glanceMother: string;
    glanceFather: string;
    glanceParent: string;
    glanceSpouse: string;
    glanceChild: string;
    glanceNamed: string;
  },
) {
  if (!member) {
    return copy.greetingSubtitle;
  }
  switch (member.relationship) {
    case 'mother':
      return copy.glanceMother;
    case 'father':
      return copy.glanceFather;
    case 'parent':
      return copy.glanceParent;
    case 'spouse':
      return copy.glanceSpouse;
    case 'child':
      return copy.glanceChild;
    default:
      return copy.glanceNamed.replace('{name}', member.name);
  }
}

export default function FamilyOverview() {
  const styles = useThemedStyles(baseStyles);
  const { isDark } = useAppTheme();
  const glass = glassTints(isDark, 'family');
  const { t } = useLanguage();
  const type = useLandingType('family');
  const router = useRouter();
  const { user } = useAuth();
  const { nextAppointment } = useAppointments();
  const { visit, status: visitStatus, finishedAt } = useVisit();
  const { inquiry, loading, serviceStarted } = useFamilyJourney();

  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 - pulse.value * 0.38,
    transform: [{ scale: 1 + pulse.value * 1.5 }],
  }));

  const member = activeFamilyMember(user);
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t.family.greetingMorning
      : hour < 18
        ? t.family.greetingAfternoon
        : t.family.greetingEvening;
  const careName = member?.name ?? '';
  const glance = glanceFor(member, t.family);

  async function dial() {
    const url = `tel:${CARE_PHONE}`;
    try {
      if (!(await Linking.canOpenURL(url))) {
        throw new Error('unsupported');
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t.family.callFailed, t.family.callFailedMessage);
    }
  }

  const nurse = shortNurse(visit.nurseName);
  const visitAction = {
    complete: {
      label: t.family.visitDoneAction,
      icon: 'document-text-outline' as const,
      onPress: () => router.push('/family/reports'),
    },
    live: {
      label: t.family.messageNurse,
      icon: 'chatbubble-ellipses-outline' as const,
      onPress: () => router.push('/family/chat'),
    },
    upcoming: {
      label: t.family.messageNurse,
      icon: 'chatbubble-ellipses-outline' as const,
      onPress: () => router.push('/family/chat'),
    },
  }[visitStatus];

  const visitCopy =
    visitStatus === 'complete'
      ? {
          kicker: t.family.visitDoneLabel,
          title: t.family.visitDoneTitle,
          body: t.family.visitDoneBody
            .replace('{nurse}', nurse)
            .replace('{time}', formatClock(finishedAt, t)),
        }
      : visitStatus === 'live'
        ? {
            kicker: t.family.liveNow,
            title: t.family.visitInProgress,
            body: t.family.visitSubtitle,
          }
        : {
            kicker: t.family.visitTodayLabel,
            title: t.family.visitTodayTitle.replace('{time}', formatClock(visit.arrivedAt, t)),
            body: t.family.visitTodayBody.replace('{nurse}', nurse),
          };

  const concern = visit.concern;
  const concernOpen =
    serviceStarted &&
    concern !== null &&
    concern.review !== 'reviewed' &&
    visitStatus !== 'upcoming';
  const concernStatus = !concern
    ? ''
    : concern.review === 'notified' && concern.reviewerName
      ? t.family.concernNotified.replace('{reviewer}', concern.reviewerName)
      : concern.review === 'reviewed' && concern.reviewerName
        ? t.family.concernReviewed.replace('{reviewer}', concern.reviewerName)
        : `${t.family.concernNoted.replace('{nurse}', nurse)} · ${t.family.concernPending}`;

  const before = beforeCare(inquiry ?? null, careName || t.family.lovedOne, t.family);

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <FamilyHero
        kicker={serviceStarted ? t.family.activeService : t.familyAdd.selectKicker}
        title={`${greeting}${careName ? `, ${careName}` : ''}`}
        subtitle={glance}
        trailing={
          serviceStarted ? (
            <View style={styles.planChip}>
              <View style={styles.planDot} />
              <Text style={styles.planChipText}>{t.family.planActive}</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.body}>
        {loading ? null : serviceStarted ? (
          <>
            <GlassCard
              tint={glass.update}
              border={glass.border}
              sheen={glass.sheen}
              shadowColor="#16332C"
            >
              <View style={styles.visitMain}>
                {visitStatus === 'live' ? (
                  <View style={styles.visitIcon}>
                    <View style={styles.dotWrap}>
                      <Animated.View style={[styles.halo, haloStyle]} />
                      <View style={styles.liveDot} />
                    </View>
                  </View>
                ) : (
                  <FamilyIconWell
                    name={visitStatus === 'complete' ? 'calendar-outline' : 'time-outline'}
                  />
                )}

                <View style={styles.visitCopy}>
                  <Text style={[styles.kicker, type.kicker]}>{visitCopy.kicker}</Text>
                  <Text style={[styles.visitTitle, { fontFamily: type.sansSemi }]}>{visitCopy.title}</Text>
                  <Text style={[styles.visitBody, type.bodySmall]}>{visitCopy.body}</Text>

                  <TouchableOpacity
                    style={styles.visitAction}
                    onPress={visitAction.onPress}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={visitAction.icon} size={14} color="#5E7A62" />
                    <Text style={styles.visitActionText}>{visitAction.label}</Text>
                    <Ionicons name="chevron-forward" size={13} color="#5E7A62" />
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>

            {concernOpen ? (
              <GlassCard
                tint={glass.attention}
                border={glass.border}
                sheen={glass.sheen}
                shadowColor="#16332C"
              >
                <View style={styles.attentionTop}>
                  <FamilyIconWell name="warning-outline" tone="warn" />
                  <View style={styles.attentionCopy}>
                    <Text style={[styles.attentionKicker, type.kicker]}>{t.family.attentionLabel}</Text>
                    <Text style={styles.attentionTitle}>{t.family.attentionTitle}</Text>
                    <Text style={styles.attentionBody}>{t.family.attentionBody}</Text>
                    <Text style={styles.attentionStatus}>{concernStatus}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.attentionButton}
                  onPress={() => router.push('/family/reports')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.attentionButtonText}>{t.family.attentionAction}</Text>
                  <Ionicons name="chevron-forward" size={13} color="#C97A2E" />
                </TouchableOpacity>
              </GlassCard>
            ) : null}

            <GlassCard
              tint={glass.card}
              border={glass.border}
              sheen={glass.sheen}
              shadowColor="#16332C"
            >
              <View style={styles.nextTop}>
                <FamilyIconWell name="calendar-outline" />
                <View style={styles.nextCopy}>
                  <Text style={[styles.kicker, type.kicker]}>{t.family.nextAppointment}</Text>
                  {nextAppointment ? (
                    <>
                      <Text style={styles.nextTitle}>
                        {formatDateKey(nextAppointment.date, t)} · {nextAppointment.time}
                      </Text>
                      <Text style={styles.nextMeta}>
                        {t.familyAppointments.types[nextAppointment.type]} · {nextAppointment.withName}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.nextTitle}>{t.family.noUpcoming}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.manageChip}
                onPress={() => router.push('/family/appointments')}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={14} color="#5E7A62" />
                <Text style={styles.manageText}>
                  {nextAppointment ? t.family.manageAppointments : t.family.bookAppointment}
                </Text>
                <Ionicons name="chevron-forward" size={13} color="#5E7A62" />
              </TouchableOpacity>
            </GlassCard>

            <Text style={[styles.sectionLabel, type.kicker]}>{t.family.careTeam}</Text>
            <GlassCard
              tint={glass.card}
              border={glass.border}
              sheen={glass.sheen}
              shadowColor="#16332C"
              style={styles.teamCard}
            >
              <View style={[styles.teamRow, styles.teamDivider]}>
                <View style={styles.teamAvatar}>
                  <Text style={styles.teamAvatarText}>MG</Text>
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>Meron Girma</Text>
                  <Text style={styles.teamRole}>{t.family.assignedNurse}</Text>
                </View>
                {visitStatus === 'live' ? (
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{t.family.onVisit}</Text>
                  </View>
                ) : null}
                <TouchableOpacity onPress={dial} hitSlop={8}>
                  <FamilyIconWell name="call-outline" size={16} box={36} />
                </TouchableOpacity>
              </View>

              <View style={styles.teamRow}>
                <View style={styles.teamAvatar}>
                  <Text style={styles.teamAvatarText}>MT</Text>
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>Marta Tesfaye</Text>
                  <Text style={styles.teamRole}>{t.family.careCoordinator}</Text>
                </View>
                <TouchableOpacity onPress={dial} hitSlop={8}>
                  <FamilyIconWell name="call-outline" size={16} box={36} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          </>
        ) : (
          <GlassCard
            tint={glass.card}
            border={glass.border}
            sheen={glass.sheen}
            shadowColor="#16332C"
          >
            <Text style={[styles.kicker, type.kicker]}>{t.family.latestUpdate}</Text>
            <Text style={styles.nextTitle}>{before.title}</Text>
            <Text style={[styles.beforeBody, type.bodySmall]}>{before.body}</Text>
            <TouchableOpacity
              style={styles.manageChip}
              onPress={() => router.push(before.href)}
              activeOpacity={0.85}
            >
              <Text style={styles.manageText}>{before.action}</Text>
              <Ionicons name="chevron-forward" size={13} color="#5E7A62" />
            </TouchableOpacity>
          </GlassCard>
        )}
      </View>
    </ScrollView>
  );
}

function beforeCare(
  inquiry: FamilyInquiry | null,
  name: string,
  copy: {
    beforeTitle: string;
    beforeNone: string;
    beforeReceived: string;
    beforeContacted: string;
    beforeProposed: string;
    beforeSetup: string;
    beforeAction: string;
    beforeActionPending: string;
    beforeActionContacted: string;
    beforeActionProposed: string;
    beforeActionAccepted: string;
  },
) {
  if (!inquiry) {
    return {
      title: copy.beforeTitle,
      body: copy.beforeNone.replace('{name}', name),
      href: '/family-request' as const,
      action: copy.beforeAction,
    };
  }
  if (inquiry.status === 'contacted') {
    return {
      title: copy.beforeTitle,
      body: copy.beforeContacted,
      href: '/family-care-plan' as const,
      action: copy.beforeActionContacted,
    };
  }
  if (inquiry.status === 'proposed') {
    return {
      title: copy.beforeTitle,
      body: copy.beforeProposed,
      href: '/family-care-plan' as const,
      action: copy.beforeActionProposed,
    };
  }
  if (inquiry.status === 'accepted' || inquiry.status === 'setup') {
    return {
      title: copy.beforeTitle,
      body: copy.beforeSetup,
      href: '/family-care-plan' as const,
      action: copy.beforeActionAccepted,
    };
  }
  return {
    title: copy.beforeTitle,
    body: copy.beforeReceived,
    href: '/family-request-status' as const,
    action: copy.beforeActionPending,
  };
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F3',
  },
  containerDark: {
    backgroundColor: '#0E1412',
  },
  content: {
    paddingBottom: 88,
  },
  body: {
    paddingHorizontal: 16,
    marginTop: -38,
    gap: 14,
  },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  planDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#C5D4C8',
  },
  planChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F4F6F3',
  },
  visitMain: {
    flexDirection: 'row',
    gap: 12,
    zIndex: 1,
  },
  visitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitCopy: {
    flex: 1,
  },
  kicker: {
    color: '#7A877F',
    marginBottom: 6,
  },
  visitTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#16332C',
    marginBottom: 4,
  },
  visitBody: {
    color: '#5C6B65',
    marginBottom: 12,
  },
  visitAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
  },
  visitActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN,
  },
  dotWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  nextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextCopy: {
    flex: 1,
    minWidth: 0,
  },
  nextTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16332C',
    marginBottom: 3,
  },
  nextMeta: {
    fontSize: 13,
    color: '#7A877F',
  },
  beforeBody: {
    color: '#5C6B65',
    marginTop: 6,
    lineHeight: 20,
  },
  manageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#E8EDE4',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    marginTop: 12,
  },
  manageText: {
    fontSize: 12,
    fontWeight: '600',
    color: GREEN,
  },
  attentionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  attentionCopy: {
    flex: 1,
  },
  attentionKicker: {
    color: '#C97A2E',
    marginBottom: 4,
  },
  attentionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16332C',
    marginBottom: 4,
  },
  attentionBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#8A7454',
  },
  attentionStatus: {
    fontSize: 13,
    lineHeight: 19,
    color: '#8A7454',
    marginTop: 4,
  },
  attentionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    marginTop: 12,
    marginLeft: 52,
  },
  attentionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C97A2E',
  },
  sectionLabel: {
    color: '#7A877F',
    marginBottom: 10,
  },
  teamCard: {
    paddingVertical: 4,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  teamDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EF',
  },
  teamAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8EDE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16332C',
  },
  teamRole: {
    fontSize: 12,
    color: '#7A877F',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#E8EDE4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: GREEN,
  },
});
