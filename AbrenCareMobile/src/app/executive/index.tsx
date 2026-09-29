import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Avatar,
  Card,
  Ring,
  SectionHeader,
  SegmentedBar,
  StatusPill,
  type PillTone,
} from "@/components/executive/ExecutiveUI";
import BrandLogo from "@/components/ui/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { useExecutiveAlerts } from "@/context/ExecutiveAlertsContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

const HERO_PHOTO = require("@/assets/images/executive-hero-bg.jpg");

export default function ExecutiveDashboard() {
  const c = useExecutiveTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { t } = useLanguage();
  const { user } = useAuth();
  const { unreadCount } = useExecutiveAlerts();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const copy = t.executiveHome;

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t.executive.goodMorning
      : hour < 18
        ? t.executive.goodAfternoon
        : t.executive.goodEvening;

  const firstName = user?.name.split(" ")[0] ?? "";

  const openChat = (who: "doctor" | "nurse") =>
    router.push({ pathname: "/executive/chat", params: { who } });

  const openCall = (who: "doctor" | "nurse") =>
    router.push({ pathname: "/executive/call", params: { who } });

  const vitals: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    value: string;
    unit: string;
    label: string;
    status: string;
    color: string;
    tint: string;
  }[] = [
    {
      key: "bp",
      icon: "heart-outline",
      value: "118/76",
      unit: copy.bpUnit,
      label: copy.bpLabel,
      status: t.executive.normal,
      color: c.danger,
      tint: c.dangerSoft,
    },
    {
      key: "hr",
      icon: "pulse-outline",
      value: "72",
      unit: copy.heartRateUnit,
      label: copy.heartRateLabel,
      status: t.executive.normal,
      color: c.success,
      tint: c.successSoft,
    },
    {
      key: "spo2",
      icon: "water-outline",
      value: "98",
      unit: "%",
      label: copy.oxygenLabel,
      status: t.executive.normal,
      color: c.slate,
      tint: c.slateSoft,
    },
    {
      key: "weight",
      icon: "speedometer-outline",
      value: "74",
      unit: copy.weightUnit,
      label: copy.weightLabel,
      status: t.executive.stable,
      color: c.accent,
      tint: c.accentSoft,
    },
  ];

  const tasks: {
    key: string;
    label: string;
    status: string;
    tone: PillTone;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
  }[] = [
    {
      key: "checkup",
      label: copy.taskCheckup,
      status: copy.statusCompleted,
      tone: "success",
      icon: "checkmark-circle",
      color: c.success,
    },
    {
      key: "labs",
      label: copy.taskLabs,
      status: copy.statusCompleted,
      tone: "success",
      icon: "checkmark-circle",
      color: c.success,
    },
    {
      key: "followUp",
      label: copy.taskFollowUp,
      status: copy.statusInProgress,
      tone: "accent",
      icon: "time-outline",
      color: c.accent,
    },
    {
      key: "lifestyle",
      label: copy.taskLifestyle,
      status: copy.statusPending,
      tone: "neutral",
      icon: "ellipse-outline",
      color: c.faint,
    },
  ];

  const careTeam = [
    {
      key: "doctor" as const,
      initials: "HB",
      tone: "accent" as const,
      name: copy.doctorName,
      role: copy.doctorRole,
      meta: copy.doctorMeta,
    },
    {
      key: "nurse" as const,
      initials: "NS",
      tone: "slate" as const,
      name: copy.nurseName,
      role: copy.nurseRole,
      meta: t.executive.monitoringActive,
    },
  ];

  const actions: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    color: string;
    tint: string;
    onPress: () => void;
  }[] = [
    {
      key: "report",
      icon: "document-text-outline",
      title: copy.actionReport,
      subtitle: copy.actionReportSub,
      color: c.accent,
      tint: c.accentSoft,
      onPress: () => router.push("/executive/reports"),
    },
    {
      key: "consult",
      icon: "calendar-outline",
      title: copy.actionConsult,
      subtitle: copy.actionConsultSub,
      color: c.slate,
      tint: c.slateSoft,
      onPress: () => router.push("/executive/consultation"),
    },
    {
      key: "emergency",
      icon: "alert-circle-outline",
      title: copy.actionEmergency,
      subtitle: copy.actionEmergencySub,
      color: c.danger,
      tint: c.dangerSoft,
      onPress: () => router.push("/executive/emergency"),
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <Image
          source={HERO_PHOTO}
          style={styles.heroPhoto}
          resizeMode="cover"
        />

        <LinearGradient
          colors={[c.hero, withAlpha(c.hero, 0.94), withAlpha(c.hero, 0.42)]}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.heroFade}
        />

        <View style={styles.heroTopRow}>
          <View style={styles.brandRow}>
            <BrandLogo size={34} />

            <View>
              <Text style={styles.wordmark}>{t.auth.brand}</Text>
              <Text style={styles.tagline}>{t.auth.tagline}</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.header.notifications}
            style={styles.bellButton}
            onPress={() => router.push("/executive/alerts")}
          >
            <Ionicons
              name="notifications-outline"
              size={19}
              color={c.heroText}
            />

            {unreadCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <Text style={styles.heroKicker}>{copy.kicker}</Text>

        <Text style={styles.heroGreeting}>
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </Text>

        <Text style={styles.heroSubtitle}>{copy.greetingSubtitle}</Text>

        <Pressable
          style={styles.heroPill}
          onPress={() => router.push("/executive/consultation")}
        >
          <Ionicons name="calendar-outline" size={14} color={c.heroText} />
          <Text style={styles.heroPillLabel}>{copy.nextCheckup}</Text>
          <View style={styles.heroPillDot} />
          <Text style={styles.heroPillValue}>{copy.nextCheckupDate}</Text>
          <Ionicons name="chevron-forward" size={14} color={c.heroMuted} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* Health score */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreTop}>
            <Ring
              size={96}
              thickness={8}
              value="87"
              caption={t.executive.scoreOutOf}
              color={c.accent}
              track={c.track}
            />

            <View style={styles.scoreCopy}>
              <Text style={styles.scoreTitle}>{copy.scoreTitle}</Text>
              <StatusPill label={copy.scoreStatus} tone="success" />
              <Text style={styles.scoreBody}>{copy.scoreBody}</Text>
            </View>
          </View>

          <Pressable
            style={styles.scoreTrendRow}
            onPress={() => router.push("/executive/health")}
          >
            <Ionicons name="trending-up" size={15} color={c.success} />
            <Text style={styles.scoreTrend}>{copy.scoreTrend}</Text>
            <Text style={styles.scoreTrendCaption}>
              {copy.scoreTrendCaption}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={c.faint} />
          </Pressable>
        </Card>

        {/* Vitals */}
        <View style={styles.section}>
          <SectionHeader
            title={copy.vitalsTitle}
            actionLabel={copy.viewAll}
            onAction={() => router.push("/executive/health")}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vitalRow}
          >
            {vitals.map((vital) => (
              <Pressable
                key={vital.key}
                style={styles.vitalCard}
                onPress={() => router.push("/executive/health")}
              >
                <View
                  style={[styles.vitalIcon, { backgroundColor: vital.tint }]}
                >
                  <Ionicons name={vital.icon} size={17} color={vital.color} />
                </View>

                <View style={styles.vitalValueRow}>
                  <Text style={styles.vitalValue}>{vital.value}</Text>
                  <Text style={styles.vitalUnit}>{vital.unit}</Text>
                </View>

                <Text style={styles.vitalLabel}>{vital.label}</Text>
                <StatusPill label={vital.status} tone="success" />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Health programme */}
        <View style={styles.section}>
          <Card>
            <View style={styles.programTop}>
              <View style={styles.flexCopy}>
                <Text style={styles.cardTitle}>{copy.programTitle}</Text>
                <Text style={styles.cardSubtitle}>{copy.programSubtitle}</Text>
              </View>

              <Ring
                size={64}
                thickness={6}
                value="3/5"
                color={c.accent}
                track={c.track}
              />
            </View>

            <Text style={styles.programMeta}>{copy.tasksCompleted}</Text>

            <View style={styles.programBar}>
              <SegmentedBar
                total={5}
                filled={3}
                color={c.accent}
                track={c.track}
              />
            </View>

            {tasks.map((task) => (
              <Pressable
                key={task.key}
                style={styles.taskRow}
                onPress={() => router.push("/executive/programme")}
              >
                <Ionicons name={task.icon} size={17} color={task.color} />
                <Text style={styles.taskLabel}>{task.label}</Text>
                <StatusPill label={task.status} tone={task.tone} />
              </Pressable>
            ))}

            <Pressable
              style={styles.cardLink}
              onPress={() => router.push("/executive/programme")}
            >
              <Text style={styles.cardLinkText}>{copy.viewFullReport}</Text>
              <Ionicons name="arrow-forward" size={14} color={c.accent} />
            </Pressable>
          </Card>
        </View>

        {/* Needs attention */}
        <View style={styles.section}>
          <View style={styles.attentionCard}>
            <View style={styles.attentionHeader}>
              <View style={styles.attentionIcon}>
                <Ionicons name="warning-outline" size={16} color={c.danger} />
              </View>

              <Text style={styles.attentionKicker}>{copy.attentionKicker}</Text>
            </View>

            <Text style={styles.attentionTitle}>{copy.attentionTitle}</Text>
            <Text style={styles.attentionMeta}>{copy.attentionMeta}</Text>

            <Pressable
              style={styles.attentionButton}
              onPress={() => router.push("/executive/alerts")}
            >
              <Text style={styles.attentionButtonText}>{copy.viewDetails}</Text>
              <Ionicons name="arrow-forward" size={13} color={c.danger} />
            </Pressable>
          </View>
        </View>

        {/* Care team */}
        <View style={styles.section}>
          <Card>
            <View style={styles.careHeader}>
              <View style={styles.flexCopy}>
                <Text style={styles.cardTitle}>{copy.careTeamTitle}</Text>
                <Text style={styles.cardSubtitle}>{copy.careTeamSubtitle}</Text>
              </View>

              <Pressable
                style={styles.careAction}
                onPress={() => router.push("/executive/consultation")}
              >
                <Text style={styles.careActionText}>{copy.viewAll}</Text>
              </Pressable>
            </View>

            {careTeam.map((person, index) => (
              <View
                key={person.key}
                style={[styles.personRow, index > 0 && styles.personRowDivided]}
              >
                <Pressable
                  style={styles.personTop}
                  onPress={() => openChat(person.key)}
                >
                  <Avatar initials={person.initials} tone={person.tone} />

                  <View style={styles.flexCopy}>
                    <Text style={styles.personName}>{person.name}</Text>
                    <Text style={styles.personRole}>{person.role}</Text>
                    <Text style={styles.personMeta}>{person.meta}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={c.faint} />
                </Pressable>

                <View style={styles.personActions}>
                  <Pressable
                    style={styles.ghostButton}
                    onPress={() => openChat(person.key)}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={14}
                      color={c.accent}
                    />
                    <Text style={styles.ghostButtonText}>{copy.message}</Text>
                  </Pressable>

                  <Pressable
                    style={styles.solidButton}
                    onPress={() => openCall(person.key)}
                  >
                    <Ionicons name="call" size={14} color={c.onAccent} />
                    <Text style={styles.solidButtonText}>{copy.call}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              style={styles.actionCard}
              onPress={action.onPress}
            >
              <View
                style={[styles.actionIcon, { backgroundColor: action.tint }]}
              >
                <Ionicons name={action.icon} size={19} color={action.color} />
              </View>

              <View style={styles.flexCopy}>
                <Text style={[styles.actionTitle, { color: action.color }]}>
                  {action.title}
                </Text>
                <Text style={styles.cardSubtitle}>{action.subtitle}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={c.faint} />
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createStyles(c: ExecutivePalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.page,
    },
    content: {
      paddingBottom: 32,
    },

    hero: {
      backgroundColor: c.hero,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      paddingHorizontal: 20,
      paddingBottom: 46,
      overflow: "hidden",
    },
    heroPhoto: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    heroFade: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 26,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    wordmark: {
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: 1.6,
      color: c.heroText,
    },
    tagline: {
      fontSize: 10,
      color: c.heroMuted,
      marginTop: 2,
    },
    bellButton: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: c.heroChip,
      borderWidth: 1,
      borderColor: c.heroChipBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    bellBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      backgroundColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    bellBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    heroKicker: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.6,
      color: c.kicker,
      marginBottom: 8,
    },
    heroGreeting: {
      fontSize: 27,
      fontWeight: "700",
      color: c.heroText,
      letterSpacing: -0.6,
    },
    heroSubtitle: {
      fontSize: 13,
      color: c.heroMuted,
      lineHeight: 19,
      marginTop: 8,
      maxWidth: 270,
    },
    heroPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      alignSelf: "flex-start",
      backgroundColor: c.heroChip,
      borderWidth: 1,
      borderColor: c.heroChipBorder,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginTop: 18,
    },
    heroPillLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: c.heroMuted,
    },
    heroPillDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: c.heroMuted,
    },
    heroPillValue: {
      fontSize: 11,
      fontWeight: "700",
      color: c.heroText,
    },

    body: {
      paddingHorizontal: 18,
      marginTop: -30,
    },
    section: {
      marginTop: 22,
    },
    flexCopy: {
      flex: 1,
    },

    scoreCard: {
      padding: 20,
    },
    scoreTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
    },
    scoreCopy: {
      flex: 1,
      gap: 7,
    },
    scoreTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    scoreBody: {
      fontSize: 12,
      color: c.muted,
      lineHeight: 18,
    },
    scoreTrendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    scoreTrend: {
      fontSize: 13,
      fontWeight: "700",
      color: c.success,
    },
    scoreTrendCaption: {
      flex: 1,
      fontSize: 12,
      color: c.muted,
    },

    vitalRow: {
      gap: 12,
      paddingRight: 4,
    },
    vitalCard: {
      width: 132,
      gap: 8,
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
    },
    vitalIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    vitalValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
    },
    vitalValue: {
      fontSize: 20,
      fontWeight: "700",
      color: c.text,
      letterSpacing: -0.4,
    },
    vitalUnit: {
      fontSize: 11,
      color: c.faint,
    },
    vitalLabel: {
      fontSize: 11,
      color: c.muted,
    },

    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    cardSubtitle: {
      fontSize: 12,
      color: c.muted,
      marginTop: 3,
      lineHeight: 17,
    },
    programTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    programMeta: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: c.faint,
      textTransform: "uppercase",
      marginTop: 18,
      marginBottom: 8,
    },
    programBar: {
      marginBottom: 6,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    taskLabel: {
      flex: 1,
      fontSize: 13,
      color: c.text,
    },
    cardLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 14,
    },
    cardLinkText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.accent,
    },

    attentionCard: {
      backgroundColor: c.dangerSoft,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      padding: 18,
    },
    attentionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 10,
    },
    attentionIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
    },
    attentionKicker: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: c.danger,
      textTransform: "uppercase",
    },
    attentionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    attentionMeta: {
      fontSize: 12,
      color: c.muted,
      marginTop: 4,
    },
    attentionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      backgroundColor: c.card,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 9,
      marginTop: 14,
    },
    attentionButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.danger,
    },

    careHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 6,
    },
    careAction: {
      paddingTop: 2,
    },
    careActionText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.accent,
    },
    personRow: {
      paddingTop: 14,
    },
    personRowDivided: {
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    personTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    personName: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    personRole: {
      fontSize: 12,
      color: c.muted,
      marginTop: 2,
    },
    personMeta: {
      fontSize: 11,
      color: c.faint,
      marginTop: 2,
    },
    personActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },
    ghostButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
      paddingVertical: 11,
    },
    ghostButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
    },
    solidButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 13,
      backgroundColor: c.accent,
      paddingVertical: 11,
    },
    solidButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.onAccent,
    },

    actionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
      marginBottom: 12,
    },
    actionIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    actionTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
