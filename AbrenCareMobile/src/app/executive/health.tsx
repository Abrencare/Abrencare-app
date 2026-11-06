import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ExecutiveHero } from "@/components/executive/ExecutiveHero";
import { GlassCard, glassTints } from "@/components/executive/GlassCard";
import { Ring, StatusPill, type PillTone } from "@/components/executive/ExecutiveUI";
import { useLanguage } from "@/context/LanguageContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useLandingType } from "@/theme/landingType";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

type Range = "week" | "month";

export default function ExecutiveHealth() {
  const c = useExecutiveTheme();
  const { isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(c, isDark), [c, isDark]);
  const type = useLandingType("executive");
  const { t } = useLanguage();
  const router = useRouter();
  const [range, setRange] = useState<Range>("week");
  const glass = glassTints(isDark);

  const copy = t.executiveHealth;
  const home = t.executiveHome;

  const trends: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    unit: string;
    trend: string;
    color: string;
    tint: string;
    bars: Record<Range, number[]>;
  }[] = [
    {
      key: "bp",
      icon: "heart-outline",
      label: home.bpLabel,
      value: "118/76",
      unit: home.bpUnit,
      trend: copy.improving,
      color: c.danger,
      tint: c.dangerSoft,
      bars: {
        week: [0.62, 0.78, 0.9, 0.7, 0.55, 0.6, 0.48],
        month: [0.8, 0.72, 0.85, 0.6, 0.52, 0.45, 0.42],
      },
    },
    {
      key: "hr",
      icon: "pulse-outline",
      label: home.heartRateLabel,
      value: "72",
      unit: home.heartRateUnit,
      trend: copy.steady,
      color: c.success,
      tint: c.successSoft,
      bars: {
        week: [0.55, 0.6, 0.52, 0.58, 0.61, 0.54, 0.57],
        month: [0.5, 0.58, 0.55, 0.6, 0.56, 0.59, 0.54],
      },
    },
    {
      key: "spo2",
      icon: "water-outline",
      label: home.oxygenLabel,
      value: "98",
      unit: "%",
      trend: copy.steady,
      color: c.slate,
      tint: c.slateSoft,
      bars: {
        week: [0.9, 0.94, 0.92, 0.96, 0.93, 0.95, 0.97],
        month: [0.88, 0.9, 0.93, 0.91, 0.95, 0.94, 0.96],
      },
    },
    {
      key: "weight",
      icon: "speedometer-outline",
      label: home.weightLabel,
      value: "74",
      unit: home.weightUnit,
      trend: copy.improving,
      color: c.accent,
      tint: c.accentSoft,
      bars: {
        week: [0.72, 0.7, 0.71, 0.68, 0.66, 0.67, 0.64],
        month: [0.82, 0.78, 0.76, 0.73, 0.7, 0.68, 0.64],
      },
    },
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
        <GlassCard tint={glass.card} border={glass.border} sheen={glass.sheen}>
          <View style={styles.scoreRow}>
            <Ring
              size={88}
              thickness={8}
              value="87"
              caption={t.executive.scoreOutOf}
              color={c.accent}
              track={c.track}
            />
            <View style={styles.scoreCopy}>
              <Text style={[styles.scoreLabel, { fontFamily: type.sansSemi }]}>
                {copy.scoreLabel}
              </Text>
              <StatusPill label={home.scoreStatus} tone="success" />
              <View style={styles.trendRow}>
                <Ionicons name="trending-up" size={14} color={c.success} />
                <Text
                  style={[styles.trendValue, { fontFamily: type.sansSemi }]}
                >
                  {home.scoreTrend}
                </Text>
                <Text style={[styles.trendCaption, { fontFamily: type.sans }]}>
                  {home.scoreTrendCaption}
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        <View style={styles.rangeRow}>
          {(["week", "month"] as Range[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => setRange(option)}
              style={[
                styles.rangeOption,
                range === option && styles.rangeOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.rangeLabel,
                  { fontFamily: type.sansSemi },
                  range === option && styles.rangeLabelActive,
                ]}
              >
                {option === "week" ? copy.thisWeek : copy.thisMonth}
              </Text>
            </Pressable>
          ))}
        </View>

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
              <View style={styles.trendHeader}>
                <View
                  style={[styles.trendIcon, { backgroundColor: trend.tint }]}
                >
                  <Ionicons name={trend.icon} size={17} color={trend.color} />
                </View>
                <View style={styles.flexCopy}>
                  <Text
                    style={[styles.trendLabel, { fontFamily: type.sansSemi }]}
                  >
                    {trend.label}
                  </Text>
                  <Text style={[styles.trendMeta, { fontFamily: type.sans }]}>
                    {copy.measuredToday}
                  </Text>
                </View>
                <View style={styles.trendValueBlock}>
                  <Text
                    style={[styles.trendNumber, { fontFamily: type.sansSemi }]}
                  >
                    {trend.value}
                  </Text>
                  <Text style={[styles.trendUnit, { fontFamily: type.sans }]}>
                    {trend.unit}
                  </Text>
                </View>
              </View>

              <View style={styles.chart}>
                {trend.bars[range].map((height, index) => (
                  <View
                    key={index}
                    style={[
                      styles.bar,
                      {
                        height: 12 + height * 46,
                        backgroundColor:
                          index === trend.bars[range].length - 1
                            ? trend.color
                            : trend.tint,
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.trendFooter}>
                <StatusPill label={trend.trend} tone="success" />
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
    scoreRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
    },
    scoreCopy: {
      flex: 1,
      gap: 8,
    },
    scoreLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    trendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    trendValue: {
      fontSize: 13,
      fontWeight: "700",
      color: c.success,
    },
    trendCaption: {
      fontSize: 12,
      color: c.muted,
    },
    rangeRow: {
      flexDirection: "row",
      gap: 8,
      backgroundColor: isDark
        ? "rgba(255,255,255,0.07)"
        : "rgba(255, 252, 247, 0.4)",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.86)",
      padding: 4,
    },
    rangeOption: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 9,
      borderRadius: 14,
    },
    rangeOptionActive: {
      backgroundColor: c.accent,
    },
    rangeLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.muted,
    },
    rangeLabelActive: {
      color: c.onAccent,
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
    trendHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    trendIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    trendLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    trendMeta: {
      fontSize: 11,
      color: c.faint,
      marginTop: 2,
    },
    trendValueBlock: {
      alignItems: "flex-end",
    },
    trendNumber: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
      letterSpacing: -0.4,
    },
    trendUnit: {
      fontSize: 10,
      color: c.faint,
    },
    chart: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 8,
      height: 62,
      marginTop: 16,
    },
    bar: {
      flex: 1,
      borderRadius: 6,
    },
    trendFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 12,
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
