import React, { useMemo } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  ScreenHeader,
  StatusPill,
  type PillTone,
} from "@/components/executive/ExecutiveUI";
import { useLanguage } from "@/context/LanguageContext";
import {
  useExecutiveAlerts,
  type ExecutiveAlertId,
} from "@/context/ExecutiveAlertsContext";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

export default function ExecutiveAlerts() {
  const c = useExecutiveTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { t } = useLanguage();
  const router = useRouter();
  const { unreadCount, isUnread, markRead, markAllRead } = useExecutiveAlerts();

  const copy = t.executiveAlerts;

  const alerts: {
    id: ExecutiveAlertId;
    icon: keyof typeof Ionicons.glyphMap;
    priority: string;
    tone: PillTone;
    color: string;
    tint: string;
    title: string;
    body: string;
    time: string;
    route?: "/executive/health" | "/executive/reports" | "/executive/programme";
  }[] = [
    {
      id: "bp",
      icon: "warning-outline",
      priority: copy.priorityHigh,
      tone: "danger",
      color: c.danger,
      tint: c.dangerSoft,
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
      tint: c.successSoft,
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
      tint: c.accentSoft,
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
      tint: c.slateSoft,
      title: copy.checkupTitle,
      body: copy.checkupBody,
      time: copy.checkupTime,
      route: "/executive/programme",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          kicker={t.executiveHome.kicker}
          title={copy.title}
          subtitle={copy.subtitle}
        />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {unreadCount > 0
              ? `${unreadCount} ${copy.unread}`
              : copy.allClear}
          </Text>

          {unreadCount > 0 ? (
            <Pressable onPress={markAllRead}>
              <Text style={styles.markAll}>{copy.markAllRead}</Text>
            </Pressable>
          ) : null}
        </View>

        {alerts.map((alert) => {
          const unread = isUnread(alert.id);

          return (
            <Pressable
              key={alert.id}
              style={[styles.alertCard, unread && styles.alertCardUnread]}
              onPress={() => {
                markRead(alert.id);
                if (alert.route) {
                  router.push(alert.route);
                }
              }}
            >
              <View style={[styles.alertIcon, { backgroundColor: alert.tint }]}>
                <Ionicons name={alert.icon} size={18} color={alert.color} />
              </View>

              <View style={styles.alertCopy}>
                <View style={styles.alertHeader}>
                  <StatusPill label={alert.priority} tone={alert.tone} />
                  {unread ? <View style={styles.unreadDot} /> : null}
                </View>

                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertBody}>{alert.body}</Text>

                <View style={styles.alertFooter}>
                  <Text style={styles.alertTime}>{alert.time}</Text>

                  {alert.route ? (
                    <View style={styles.alertLink}>
                      <Text style={styles.alertLinkText}>
                        {t.executiveHome.viewDetails}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={13}
                        color={c.accent}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}

        <Pressable
          style={styles.emergencyButton}
          onPress={() => router.push("/executive/emergency")}
        >
          <Ionicons name="alert-circle" size={17} color={c.danger} />

          <View style={styles.alertCopy}>
            <Text style={styles.emergencyTitle}>
              {t.executiveHome.actionEmergency}
            </Text>
            <Text style={styles.emergencySubtitle}>
              {t.executiveHome.actionEmergencySub}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={c.danger} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ExecutivePalette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.page,
    },
    content: {
      padding: 18,
      paddingBottom: 36,
    },

    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    summaryText: {
      fontSize: 12,
      fontWeight: "600",
      color: c.muted,
    },
    markAll: {
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
    },

    alertCard: {
      flexDirection: "row",
      gap: 13,
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
      marginBottom: 12,
    },
    alertCardUnread: {
      borderColor: c.accentBorder,
    },
    alertIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    alertCopy: {
      flex: 1,
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
      gap: 2,
    },
    alertLinkText: {
      fontSize: 12,
      fontWeight: "600",
      color: c.accent,
    },

    emergencyButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.dangerSoft,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      padding: 16,
      marginTop: 10,
    },
    emergencyTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.danger,
    },
    emergencySubtitle: {
      fontSize: 12,
      color: c.muted,
      marginTop: 2,
    },
  });
}
