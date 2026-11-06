import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ExecutiveHero } from "@/components/executive/ExecutiveHero";
import { GlassCard, glassTints } from "@/components/executive/GlassCard";
import { StatusPill, type PillTone } from "@/components/executive/ExecutiveUI";
import { useLanguage } from "@/context/LanguageContext";
import {
  useExecutiveAlerts,
  type ExecutiveAlertId,
} from "@/context/ExecutiveAlertsContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useLandingType } from "@/theme/landingType";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

export default function ExecutiveAlerts() {
  const c = useExecutiveTheme();
  const { isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const type = useLandingType("executive");
  const { t } = useLanguage();
  const router = useRouter();
  const { unreadCount, isUnread, markRead, markAllRead } = useExecutiveAlerts();
  const glass = glassTints(isDark);

  const copy = t.executiveAlerts;

  const alerts: {
    id: ExecutiveAlertId;
    icon: keyof typeof Ionicons.glyphMap;
    priority: string;
    tone: PillTone;
    color: string;
    title: string;
    body: string;
    time: string;
    route?:
      | "/executive/health"
      | "/executive/reports"
      | "/executive/programme"
      | "/executive/consultation";
  }[] = [
    {
      id: "bp",
      icon: "warning-outline",
      priority: copy.priorityHigh,
      tone: "danger",
      color: c.danger,
      title: copy.bpTitle,
      body: copy.bpBody,
      time: copy.bpTime,
      route: "/executive/health",
    },
    {
      id: "lab",
      icon: "document-text-outline",
      priority: copy.priorityUpdate,
      tone: "success",
      color: c.success,
      title: copy.labTitle,
      body: copy.labBody,
      time: copy.labTime,
      route: "/executive/reports",
    },
    {
      id: "medication",
      icon: "medkit-outline",
      priority: copy.priorityReminder,
      tone: "accent",
      color: c.accent,
      title: copy.medicationTitle,
      body: copy.medicationBody,
      time: copy.medicationTime,
      route: "/executive/programme",
    },
    {
      id: "checkup",
      icon: "calendar-outline",
      priority: copy.priorityReminder,
      tone: "neutral",
      color: c.slate,
      title: copy.checkupTitle,
      body: copy.checkupBody,
      time: copy.checkupTime,
      route: "/executive/consultation",
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ExecutiveHero title={copy.title} subtitle={copy.subtitle} />

      <View style={styles.body}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryText, { fontFamily: type.sansSemi }]}>
            {unreadCount > 0 ? `${unreadCount} ${copy.unread}` : copy.allClear}
          </Text>
          {unreadCount > 0 ? (
            <Pressable onPress={markAllRead}>
              <Text style={[styles.markAll, { fontFamily: type.sansSemi }]}>
                {copy.markAllRead}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {alerts.map((alert) => {
          const unread = isUnread(alert.id);
          const tint =
            alert.tone === "danger"
              ? glass.attention
              : unread
                ? glass.update
                : glass.card;

          return (
            <Pressable
              key={alert.id}
              accessibilityRole="button"
              onPress={() => {
                markRead(alert.id);
                if (alert.route) {
                  router.push(alert.route);
                }
              }}
            >
              <GlassCard
                tint={tint}
                border={glass.border}
                sheen={glass.sheen}
              >
                <View style={styles.alertRow}>
                  <View
                    style={[
                      styles.alertIcon,
                      { backgroundColor: `${alert.color}22` },
                    ]}
                  >
                    <Ionicons name={alert.icon} size={18} color={alert.color} />
                  </View>

                  <View style={styles.flexCopy}>
                    <View style={styles.alertHeader}>
                      <StatusPill label={alert.priority} tone={alert.tone} />
                      {unread ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <Text
                      style={[styles.alertTitle, { fontFamily: type.sansSemi }]}
                    >
                      {alert.title}
                    </Text>
                    <Text style={[styles.alertBody, { fontFamily: type.sans }]}>
                      {alert.body}
                    </Text>
                    <View style={styles.alertFooter}>
                      <Text
                        style={[styles.alertTime, { fontFamily: type.sans }]}
                      >
                        {alert.time}
                      </Text>
                      {alert.route ? (
                        <View style={styles.alertLink}>
                          <Text
                            style={[
                              styles.alertLinkText,
                              { fontFamily: type.sansSemi },
                            ]}
                          >
                            {t.executiveHome.viewDetails}
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={13}
                            color={c.accent}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/executive/emergency")}
        >
          <GlassCard
            tint={glass.attention}
            border={c.dangerBorder}
            sheen={glass.sheen}
          >
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, styles.emergencyIcon]}>
                <Ionicons name="alert-circle" size={18} color={c.danger} />
              </View>
              <View style={styles.flexCopy}>
                <Text
                  style={[styles.emergencyTitle, { fontFamily: type.sansSemi }]}
                >
                  {t.executiveHome.actionEmergency}
                </Text>
                <Text
                  style={[styles.alertBody, { fontFamily: type.sans }]}
                >
                  {t.executiveHome.actionEmergencySub}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.danger} />
            </View>
          </GlassCard>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(c: ExecutivePalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.page,
    },
    content: {
      paddingBottom: 88,
    },
    body: {
      paddingHorizontal: 16,
      marginTop: -38,
      gap: 14,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    summaryText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.muted,
    },
    markAll: {
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
    },
    alertRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    alertIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    emergencyIcon: {
      backgroundColor: "rgba(255,255,255,0.55)",
    },
    flexCopy: {
      flex: 1,
      minWidth: 0,
    },
    alertHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 7,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.accent,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    alertBody: {
      fontSize: 12,
      color: c.muted,
      lineHeight: 18,
      marginTop: 4,
    },
    alertFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
    },
    alertTime: {
      fontSize: 11,
      color: c.faint,
    },
    alertLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    alertLinkText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
    },
    emergencyTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.danger,
    },
  });
}
