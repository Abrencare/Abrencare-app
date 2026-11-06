import React, { useMemo, useState } from "react";
import {
  Alert,
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
import { useExecutiveAlerts } from "@/context/ExecutiveAlertsContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useLandingType } from "@/theme/landingType";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

const HERO_PHOTO = require("@/assets/images/executive-hero-bg.jpg");
const DOCTOR_PHOTO = require("@/assets/images/executive-doctor-portrait.jpg");
const COORDINATOR_PHOTO = require("@/assets/images/executive-sarah-portrait.jpg");

const SLOTS = ["09:00", "11:00", "14:00", "16:00"];

export default function ExecutiveConsultation() {
  const c = useExecutiveTheme();
  const { isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(c, isDark), [c, isDark]);
  const type = useLandingType("executive");
  const { t } = useLanguage();
  const { unreadCount } = useExecutiveAlerts();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [provider, setProvider] = useState<"doctor" | "nurse" | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const copy = t.executiveConsult;
  const home = t.executiveHome;
  const glass = glassTints(isDark);

  const specialists = [
    {
      key: "doctor" as const,
      photo: DOCTOR_PHOTO,
      name: home.doctorName,
      role: home.doctorRole,
    },
    {
      key: "nurse" as const,
      photo: COORDINATOR_PHOTO,
      name: home.nurseName,
      role: home.nurseRole,
    },
  ];

  const openChat = (who: "doctor" | "nurse") =>
    router.push({ pathname: "/executive/chat", params: { who } });

  const joinCall = () =>
    router.push({ pathname: "/executive/call", params: { who: "doctor" } });

  const openAlerts = () => router.push("/executive/alerts");

  const bookSlot = (option: string) => {
    if (!provider) {
      setSlot(option);
      Alert.alert(copy.title, copy.selectPrompt, [{ text: copy.ok }]);
      return;
    }

    setSlot(option);
    Alert.alert(copy.requestedTitle, copy.requestedBody, [{ text: copy.ok }]);
  };

  const reschedule = () => {
    setProvider("doctor");
    setSlot(null);
    Alert.alert(copy.rescheduleTitle, copy.rescheduleBody, [
      { text: copy.ok },
    ]);
  };

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
          {home.kicker}
        </Text>
        <Text style={[styles.heroTitle, { fontFamily: type.display }]}>
          {copy.title}
        </Text>
        <Text style={[styles.heroSubtitle, { fontFamily: type.sans }]}>
          {copy.subtitle}
        </Text>
      </View>

      <View style={styles.body}>
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
        >
          <View style={styles.split}>
            <View style={styles.flexCopy}>
              <View style={styles.kickerRow}>
                <Ionicons name="calendar-outline" size={15} color={c.accent} />
                <Text
                  style={[styles.kicker, { fontFamily: type.sansSemi }]}
                >
                  {copy.upcomingLabel}
                </Text>
              </View>

              <Text style={[styles.cardTitle, { fontFamily: type.sansSemi }]}>
                {copy.upcomingTitle}
              </Text>
              <Text style={[styles.when, { fontFamily: type.sansSemi }]}>
                {copy.upcomingWhen}
              </Text>
              <Text style={[styles.cardBody, { fontFamily: type.sans }]}>
                {copy.upcomingWith}
              </Text>
            </View>

            <View style={styles.dateBadge}>
              <Text style={[styles.dateMonth, { fontFamily: type.sansSemi }]}>
                {home.appointmentMonth}
              </Text>
              <Text style={[styles.dateDay, { fontFamily: type.display }]}>
                {home.appointmentDay}
              </Text>
              <Text style={[styles.dateWeek, { fontFamily: type.sansSemi }]}>
                {home.appointmentWeekday}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.joinCall}
              style={styles.goldButton}
              onPress={joinCall}
            >
              <Ionicons name="videocam-outline" size={15} color={c.onAccent} />
              <Text
                style={[styles.goldButtonText, { fontFamily: type.sansSemi }]}
              >
                {copy.joinCall}
              </Text>
              <Ionicons name="arrow-forward" size={13} color={c.onAccent} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.reschedule}
              style={styles.outlineButton}
              onPress={reschedule}
            >
              <Ionicons name="calendar-outline" size={15} color={c.accent} />
              <Text
                style={[styles.outlineButtonText, { fontFamily: type.sansSemi }]}
              >
                {copy.reschedule}
              </Text>
              <Ionicons name="arrow-forward" size={13} color={c.accent} />
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
        >
          <View style={styles.kickerRow}>
            <Ionicons name="people-outline" size={15} color={c.accent} />
            <Text style={[styles.kicker, { fontFamily: type.sansSemi }]}>
              {copy.chooseTitle}
            </Text>
          </View>
          <Text style={[styles.sectionLead, { fontFamily: type.sans }]}>
            {copy.chooseSubtitle}
          </Text>

          {specialists.map((person, index) => {
            const selected = provider === person.key;

            return (
              <Pressable
                key={person.key}
                accessibilityRole="button"
                accessibilityLabel={person.name}
                onPress={() => setProvider(person.key)}
                style={[
                  styles.personRow,
                  index > 0 && styles.personRowDivided,
                  selected && styles.personRowSelected,
                ]}
              >
                <Image
                  source={person.photo}
                  style={styles.personPhoto}
                  resizeMode="cover"
                />
                <View style={styles.flexCopy}>
                  <Text
                    style={[styles.personName, { fontFamily: type.sansSemi }]}
                  >
                    {person.name}
                  </Text>
                  <Text style={[styles.personRole, { fontFamily: type.sans }]}>
                    {person.role}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${home.message} ${person.name}`}
                  style={styles.messageButton}
                  onPress={() => openChat(person.key)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={13}
                    color={c.accent}
                  />
                  <Text
                    style={[
                      styles.messageButtonText,
                      { fontFamily: type.sansSemi },
                    ]}
                  >
                    {home.message}
                  </Text>
                </Pressable>
              </Pressable>
            );
          })}
        </GlassCard>

        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
        >
          <View style={styles.kickerRow}>
            <Ionicons name="time-outline" size={15} color={c.accent} />
            <Text style={[styles.kicker, { fontFamily: type.sansSemi }]}>
              {copy.slotsTitle}
            </Text>
          </View>
          <Text style={[styles.sectionLead, { fontFamily: type.sans }]}>
            {copy.slotsSubtitle}
          </Text>

          <View style={styles.slotRow}>
            {SLOTS.map((option) => {
              const selected = slot === option;

              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                  onPress={() => bookSlot(option)}
                  style={[styles.slot, selected && styles.slotActive]}
                >
                  <Text
                    style={[
                      styles.slotLabel,
                      { fontFamily: type.sansSemi },
                      selected && styles.slotLabelActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.noteRow}>
            <Ionicons name="home-outline" size={14} color={c.faint} />
            <Text style={[styles.note, { fontFamily: type.sans }]}>
              {copy.visitNote}
            </Text>
          </View>
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
      paddingBottom: 88,
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
    heroTitle: {
      fontSize: 32,
      color: c.heroText,
      letterSpacing: -0.6,
    },
    heroSubtitle: {
      fontSize: 14,
      color: c.heroMuted,
      lineHeight: 20,
      marginTop: 6,
      maxWidth: 300,
    },
    body: {
      paddingHorizontal: 16,
      marginTop: -38,
      gap: 14,
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
    kicker: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: c.accent,
      textTransform: "uppercase",
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
      lineHeight: 22,
    },
    when: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      marginTop: 4,
    },
    cardBody: {
      fontSize: 12,
      color: c.muted,
      lineHeight: 17,
      marginTop: 3,
    },
    sectionLead: {
      fontSize: 13,
      color: c.muted,
      lineHeight: 18,
      marginBottom: 4,
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
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    goldButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: c.accent,
      borderRadius: 22,
      paddingVertical: 11,
      paddingHorizontal: 8,
    },
    goldButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.onAccent,
    },
    outlineButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: c.accent,
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.08)"
        : "rgba(255,255,255,0.35)",
      paddingVertical: 11,
      paddingHorizontal: 8,
    },
    outlineButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
    },
    personRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 8,
      marginHorizontal: -8,
      borderRadius: 18,
    },
    personRowDivided: {
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    personRowSelected: {
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.12)"
        : "rgba(196, 160, 90, 0.1)",
    },
    personPhoto: {
      width: 48,
      height: 48,
      borderRadius: 24,
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
    messageButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: c.accent,
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.08)"
        : "rgba(255,255,255,0.35)",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    messageButtonText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.accent,
    },
    slotRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
    },
    slot: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 11,
      borderRadius: 18,
      backgroundColor: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(255,255,255,0.55)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)",
    },
    slotActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    slotLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.text,
    },
    slotLabelActive: {
      color: c.onAccent,
    },
    noteRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
    },
    note: {
      flex: 1,
      fontSize: 11,
      color: c.faint,
      lineHeight: 16,
    },
  });
}
