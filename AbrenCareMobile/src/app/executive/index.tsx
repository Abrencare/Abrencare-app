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

import { GlassCard, glassTints } from "@/components/executive/GlassCard";
import ServiceBackButton from "@/components/navigation/ServiceBackButton";
import BrandLogo, { BrandHomeLink } from "@/components/ui/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { useExecutiveAlerts } from "@/context/ExecutiveAlertsContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useLandingType } from "@/theme/landingType";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

const HERO_PHOTO = require("@/assets/images/executive-hero-bg.jpg");
const NURSE_PHOTO = require("@/assets/images/executive-nurse-portrait.jpg");
const DOCTOR_PHOTO = require("@/assets/images/executive-doctor-portrait.jpg");
const COORDINATOR_PHOTO = require("@/assets/images/executive-sarah-portrait.jpg");

export default function ExecutiveDashboard() {
  const c = useExecutiveTheme();
  const { isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(c, isDark), [c, isDark]);
  const type = useLandingType("executive");
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

  const openReports = () => router.push("/executive/reports");
  const openAlerts = () => router.push("/executive/alerts");
  const openAppointment = () => router.push("/executive/consultation");

  const careTeam = [
    {
      key: "doctor" as const,
      photo: DOCTOR_PHOTO,
      name: copy.doctorName,
      role: copy.doctorRole,
    },
    {
      key: "nurse" as const,
      photo: COORDINATOR_PHOTO,
      name: copy.nurseName,
      role: copy.nurseRole,
    },
  ];

  const glass = glassTints(isDark);
  const glassTint = glass.sheen;
  const glassBorder = glass.border;
  const updateTint = glass.update;
  const attentionTint = glass.attention;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
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
            <ServiceBackButton
              color={c.heroText}
              background={c.heroChip}
              borderColor={c.heroChipBorder}
              size={32}
            />

            <BrandHomeLink style={styles.brandLink}>
              <BrandLogo size={34} link={false} />
              <Text style={styles.wordmark}>{t.auth.brand}</Text>
            </BrandHomeLink>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.header.notifications}
            style={styles.bellButton}
            onPress={openAlerts}
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

        <Text style={[styles.heroKicker, { fontFamily: type.sansSemi }]}>
          {copy.kicker}
        </Text>

        <Text style={[styles.heroGreeting, { fontFamily: type.display }]}>
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </Text>

        <Text style={[styles.heroSubtitle, { fontFamily: type.sans }]}>
          {copy.greetingSubtitle}
        </Text>
      </View>

      <View style={styles.body}>
        <GlassCard
          tint={updateTint}
          border={glassBorder}
          sheen={glassTint}
          style={styles.glassCard}
        >
          <View style={styles.split}>
            <View style={styles.flexCopy}>
              <View style={styles.kickerRow}>
                <Ionicons name="checkmark-circle" size={16} color={c.success} />
                <Text style={[styles.updateKicker, { fontFamily: type.sansSemi }]}>
                  {copy.careUpdateKicker}
                </Text>
              </View>

              <Text style={[styles.cardTitle, { fontFamily: type.sansSemi }]}>
                {copy.careUpdateTitle}
              </Text>
              <Text style={[styles.cardBody, { fontFamily: type.sans }]}>
                {copy.careUpdateBody}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.viewFullReport}
                style={styles.goldButton}
                onPress={openReports}
              >
                <Text style={[styles.goldButtonText, { fontFamily: type.sansSemi }]}>
                  {copy.viewFullReport}
                </Text>
                <Ionicons name="arrow-forward" size={13} color={c.onAccent} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.viewFullReport}
              onPress={openReports}
              style={styles.photoWell}
            >
              <Image
                source={NURSE_PHOTO}
                style={styles.photo}
                resizeMode="cover"
              />
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard
          tint={attentionTint}
          border={glassBorder}
          sheen={glassTint}
          style={styles.glassCard}
        >
          <View style={styles.split}>
            <View style={styles.flexCopy}>
              <View style={styles.kickerRow}>
                <Ionicons name="pulse-outline" size={15} color={c.danger} />
                <Text
                  style={[styles.attentionKicker, { fontFamily: type.sansSemi }]}
                >
                  {copy.attentionKicker}
                </Text>
              </View>

              <Text style={[styles.cardTitle, { fontFamily: type.sansSemi }]}>
                {copy.attentionTitle}
              </Text>
              <Text style={[styles.cardBody, { fontFamily: type.sans }]}>
                {copy.attentionMeta}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.viewDetails}
                style={styles.goldButton}
                onPress={openAlerts}
              >
                <Text style={[styles.goldButtonText, { fontFamily: type.sansSemi }]}>
                  {copy.viewDetails}
                </Text>
                <Ionicons name="arrow-forward" size={13} color={c.onAccent} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${copy.bpLabel} ${copy.bpReading}`}
              onPress={() => router.push("/executive/health")}
              style={styles.bpWell}
            >
              <Ionicons name="water-outline" size={16} color={c.danger} />
              <Text style={[styles.bpValue, { fontFamily: type.sansSemi }]}>
                {copy.bpReading}
              </Text>
              <Text style={[styles.bpUnit, { fontFamily: type.sans }]}>
                {copy.bpUnit}
              </Text>
              <Text style={[styles.bpWhen, { fontFamily: type.sansMedium }]}>
                {copy.bpWhen}
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard
          tint={glass.card}
          border={glassBorder}
          sheen={glassTint}
          style={styles.glassCard}
        >
          <View style={styles.split}>
            <View style={styles.flexCopy}>
              <View style={styles.kickerRow}>
                <Ionicons name="calendar-outline" size={15} color={c.accent} />
                <Text
                  style={[styles.appointmentKicker, { fontFamily: type.sansSemi }]}
                >
                  {copy.appointmentKicker}
                </Text>
              </View>

              <Text style={[styles.cardTitle, { fontFamily: type.sansSemi }]}>
                {copy.nextCheckup} — {copy.nextCheckupDate}
              </Text>
              <Text style={[styles.cardBody, { fontFamily: type.sans }]}>
                {copy.appointmentWith}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.actionConsult}
                style={styles.goldButton}
                onPress={openAppointment}
              >
                <Text style={[styles.goldButtonText, { fontFamily: type.sansSemi }]}>
                  {copy.actionConsult}
                </Text>
                <Ionicons name="arrow-forward" size={13} color={c.onAccent} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.nextCheckupDate}
              onPress={openAppointment}
              style={styles.dateBadge}
            >
              <Text style={[styles.dateMonth, { fontFamily: type.sansSemi }]}>
                {copy.appointmentMonth}
              </Text>
              <Text style={[styles.dateDay, { fontFamily: type.display }]}>
                {copy.appointmentDay}
              </Text>
              <Text style={[styles.dateWeek, { fontFamily: type.sansSemi }]}>
                {copy.appointmentWeekday}
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard
          tint={glass.card}
          border={glassBorder}
          sheen={glassTint}
          style={styles.glassCard}
        >
          <View style={styles.kickerRow}>
            <Ionicons name="people-outline" size={15} color={c.accent} />
            <Text style={[styles.appointmentKicker, { fontFamily: type.sansSemi }]}>
              {copy.careTeamTitle}
            </Text>
          </View>

          {careTeam.map((person, index) => (
            <View
              key={person.key}
              style={[styles.personRow, index > 0 && styles.personRowDivided]}
            >
              <Pressable
                style={styles.personIdentity}
                onPress={() => openChat(person.key)}
                accessibilityRole="button"
                accessibilityLabel={person.name}
              >
                <Image
                  source={person.photo}
                  style={styles.personPhoto}
                  resizeMode="cover"
                />
                <View style={styles.flexCopy}>
                  <Text style={[styles.personName, { fontFamily: type.sansSemi }]}>
                    {person.name}
                  </Text>
                  <Text style={[styles.personRole, { fontFamily: type.sans }]}>
                    {person.role}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${copy.message} ${person.name}`}
                style={styles.outlineButton}
                onPress={() => openChat(person.key)}
              >
                <Ionicons name="chatbubble-outline" size={13} color={c.accent} />
                <Text
                  style={[styles.outlineButtonText, { fontFamily: type.sansSemi }]}
                >
                  {copy.message}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${copy.call} ${person.name}`}
                style={styles.outlineButton}
                onPress={() => openCall(person.key)}
              >
                <Ionicons name="call-outline" size={13} color={c.accent} />
                <Text
                  style={[styles.outlineButtonText, { fontFamily: type.sansSemi }]}
                >
                  {copy.call}
                </Text>
              </Pressable>
            </View>
          ))}
        </GlassCard>
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

function createStyles(c: ExecutivePalette, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.page,
    },
    content: {
      paddingBottom: 36,
    },

    hero: {
      backgroundColor: c.hero,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      paddingHorizontal: 20,
      paddingBottom: 56,
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
    brandLink: {
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
      fontSize: 32,
      color: c.heroText,
      letterSpacing: -0.6,
    },
    heroSubtitle: {
      fontSize: 14,
      color: c.heroMuted,
      lineHeight: 20,
      marginTop: 6,
      maxWidth: 280,
    },

    body: {
      paddingHorizontal: 16,
      marginTop: -38,
      gap: 14,
    },
    glassCard: {
      zIndex: 2,
    },
    split: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    flexCopy: {
      flex: 1,
      minWidth: 0,
    },
    kickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 8,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      lineHeight: 21,
    },
    cardBody: {
      fontSize: 12,
      color: c.muted,
      lineHeight: 17,
      marginTop: 4,
    },
    updateKicker: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: c.success,
      textTransform: "uppercase",
    },
    attentionKicker: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: c.danger,
      textTransform: "uppercase",
    },
    appointmentKicker: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: c.accent,
      textTransform: "uppercase",
    },
    goldButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      backgroundColor: c.accent,
      borderRadius: 22,
      paddingHorizontal: 14,
      paddingVertical: 9,
      marginTop: 14,
    },
    goldButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.onAccent,
    },
    photoWell: {
      width: 92,
      height: 92,
      borderRadius: 46,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.9)",
    },
    photo: {
      width: 92,
      height: 92,
    },
    bpWell: {
      width: 86,
      borderRadius: 22,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: "center",
      backgroundColor: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(255,255,255,0.55)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)",
    },
    bpValue: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
      marginTop: 4,
    },
    bpUnit: {
      fontSize: 10,
      color: c.muted,
      marginTop: 1,
    },
    bpWhen: {
      fontSize: 10,
      color: c.faint,
      marginTop: 6,
    },
    dateBadge: {
      width: 72,
      borderRadius: 18,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.14)"
        : "rgba(255,255,255,0.55)",
      borderWidth: 1,
      borderColor: isDark ? c.accentBorder : "rgba(196, 160, 90, 0.35)",
    },
    dateMonth: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      color: c.accent,
    },
    dateDay: {
      fontSize: 26,
      color: c.text,
      lineHeight: 30,
      marginTop: 2,
    },
    dateWeek: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
      color: c.accent,
      marginTop: 2,
    },
    personRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 12,
    },
    personRowDivided: {
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    personIdentity: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    personPhoto: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    personName: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
    },
    personRole: {
      fontSize: 11,
      color: c.muted,
      marginTop: 2,
    },
    outlineButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: c.accent,
      backgroundColor: isDark ? "rgba(196, 160, 90, 0.08)" : "rgba(255,255,255,0.35)",
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    outlineButtonText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.accent,
    },
  });
}
