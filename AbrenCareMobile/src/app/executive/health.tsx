import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ExecutiveHero } from "@/components/executive/ExecutiveHero";
import { GlassCard, glassTints } from "@/components/executive/GlassCard";
import { StatusPill, type PillTone } from "@/components/executive/ExecutiveUI";
import { useLanguage } from "@/context/LanguageContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useLandingType } from "@/theme/landingType";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

export default function ExecutiveHealth() {
  const c = useExecutiveTheme();
  const { isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(c, isDark), [c, isDark]);
  const type = useLandingType("executive");
  const { t } = useLanguage();
  const router = useRouter();
  const glass = glassTints(isDark);

  const copy = t.executiveHealth;
  const home = t.executiveHome;

  const trends: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "bp", label: home.bpLabel, icon: "heart-outline" },
    { key: "hr", label: home.heartRateLabel, icon: "pulse-outline" },
    { key: "spo2", label: home.oxygenLabel, icon: "water-outline" },
    { key: "weight", label: home.weightLabel, icon: "scale-outline" },
  ];

  const readings: {
    key: string;
    label: string;
    value: string;
    status: string;
    tone: PillTone;
    time: string;
  }[] = [
    {
      key: "bp",
      label: home.bpLabel,
      value: `158/96 ${home.bpUnit}`,
      status: t.executive.high,
      tone: "danger",
      time: t.executiveAlerts.bpTime,
    },
    {
      key: "hr",
      label: home.heartRateLabel,
      value: `91 ${home.heartRateUnit}`,
      status: t.executive.elevated,
      tone: "accent",
      time: copy.measuredToday,
    },
    {
      key: "spo2",
      label: home.oxygenLabel,
      value: "97%",
      status: t.executive.normal,
      tone: "success",
      time: copy.measuredToday,
    },
    {
      key: "glucose",
      label: t.executive.glucose,
      value: "5.4 mmol/L",
      status: t.executive.normal,
      tone: "success",
      time: copy.measuredToday,
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
        <Text style={[styles.sectionKicker, { fontFamily: type.sansSemi }]}>
          {copy.trendsTitle}
        </Text>

        {trends.map((trend) => (
          <Pressable
            key={trend.key}
            onPress={() => router.push("/executive/reports")}
          >
            <GlassCard
              tint={glass.card}
              border={glass.border}
              sheen={glass.sheen}
            >
              <View style={styles.trendRow}>
                <View style={[styles.trendIcon, { borderColor: c.accent }]}>
                  <Ionicons name={trend.icon} size={16} color={c.accent} />
                </View>
                <Text
                  style={[styles.trendLabel, { fontFamily: type.sansSemi }]}
                >
                  {trend.label}
                </Text>
                <Ionicons name="chevron-forward" size={15} color={c.faint} />
              </View>
            </GlassCard>
          </Pressable>
        ))}

        <Text style={[styles.sectionKicker, { fontFamily: type.sansSemi }]}>
          {copy.readingsTitle}
        </Text>

        <GlassCard
          tint={glass.attention}
          border={glass.border}
          sheen={glass.sheen}
        >
          {readings.map((reading, index) => (
            <View
              key={reading.key}
              style={[styles.readingRow, index > 0 && styles.readingDivided]}
            >
              <View style={styles.flexCopy}>
                <Text
                  style={[styles.readingLabel, { fontFamily: type.sansSemi }]}
                >
                  {reading.label}
                </Text>
                <Text style={[styles.readingTime, { fontFamily: type.sans }]}>
                  {reading.time}
                </Text>
              </View>
              <View style={styles.readingRight}>
                <Text
                  style={[styles.readingValue, { fontFamily: type.sansSemi }]}
                >
                  {reading.value}
                </Text>
                <StatusPill label={reading.status} tone={reading.tone} />
              </View>
            </View>
          ))}
          <Text style={[styles.watchCaption, { fontFamily: type.sans }]}>
            {copy.watchCaption}
          </Text>
        </GlassCard>

        <Pressable
          accessibilityRole="button"
          style={styles.goldButton}
          onPress={() => router.push("/executive/reports")}
        >
          <Ionicons name="stats-chart" size={16} color={c.onAccent} />
          <Text style={[styles.goldButtonText, { fontFamily: type.sansSemi }]}>
            {copy.openFullReport}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.outlineButton}
          onPress={() => router.push("/executive/programme")}
        >
          <Ionicons name="layers-outline" size={16} color={c.accent} />
          <Text
            style={[styles.outlineButtonText, { fontFamily: type.sansSemi }]}
          >
            {copy.programmeLink}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(c: ExecutivePalette, isDark: boolean) {
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
    sectionKicker: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      color: c.accent,
      textTransform: "uppercase",
      marginTop: 4,
      marginLeft: 4,
    },
    flexCopy: {
      flex: 1,
      minWidth: 0,
    },
    trendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    trendIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    trendLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    readingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
    },
    readingDivided: {
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    readingLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
    },
    readingTime: {
      fontSize: 11,
      color: c.faint,
      marginTop: 2,
    },
    readingRight: {
      alignItems: "flex-end",
      gap: 5,
    },
    readingValue: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    watchCaption: {
      fontSize: 11,
      color: c.muted,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    goldButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.accent,
      borderRadius: 22,
      paddingVertical: 14,
    },
    goldButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.onAccent,
    },
    outlineButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: c.accent,
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.08)"
        : "rgba(255,255,255,0.35)",
      paddingVertical: 14,
    },
    outlineButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.accent,
    },
  });
}
