import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ExecutiveHero } from "@/components/executive/ExecutiveHero";
import { GlassCard, glassTints } from "@/components/executive/GlassCard";
import { initialsFor, useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useLandingType } from "@/theme/landingType";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

export default function ExecutiveProfile() {
  const c = useExecutiveTheme();
  const { isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(c, isDark), [c, isDark]);
  const type = useLandingType("executive");
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const glass = glassTints(isDark);
  const [infoOpen, setInfoOpen] = useState(false);

  const copy = t.profile;
  const firstName = user?.name.split(" ")[0] ?? copy.guest;

  const info = [
    { key: "name", label: copy.fullName, value: user?.name ?? "—" },
    { key: "email", label: copy.emailLabel, value: user?.email ?? "—" },
    { key: "phone", label: copy.phone, value: user?.phone || "—" },
  ];

  const settings = [
    {
      key: "personal",
      icon: "person-outline" as const,
      title: copy.personalInformation,
      meta: copy.personalMeta,
      onPress: () => setInfoOpen((open) => !open),
    },
    {
      key: "language",
      icon: "globe-outline" as const,
      title: copy.languageLabel,
      meta:
        language === "en" ? copy.languageEnglish : copy.languageAmharic,
      onPress: () => setLanguage(language === "en" ? "am" : "en"),
    },
    {
      key: "notifications",
      icon: "notifications-outline" as const,
      title: copy.notificationsLabel,
      meta: copy.notificationsMeta,
      onPress: () => router.push("/executive/alerts"),
    },
  ];

  const support = [
    {
      key: "reports",
      icon: "document-text-outline" as const,
      title: copy.downloadReports,
      meta: copy.downloadReportsMeta,
      onPress: () => router.push("/executive/reports"),
    },
    {
      key: "privacy",
      icon: "shield-checkmark-outline" as const,
      title: copy.privacySecurity,
      meta: copy.privacyMeta,
      onPress: () =>
        Alert.alert(copy.privacySecurity, copy.privacyMessage, [
          { text: copy.ok },
        ]),
    },
    {
      key: "contact",
      icon: "headset-outline" as const,
      title: copy.contactTeam,
      meta: copy.contactTeamMeta,
      onPress: () =>
        router.push({ pathname: "/executive/chat", params: { who: "doctor" } }),
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ExecutiveHero title={copy.title} subtitle={copy.executiveSubtitle} />

      <View style={styles.body}>
        <GlassCard tint={glass.card} border={glass.border} sheen={glass.sheen}>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={[styles.avatarText, { fontFamily: type.sansSemi }]}>
                {initialsFor(user)}
              </Text>
            </View>

            <View style={styles.flexCopy}>
              <Text style={[styles.identityName, { fontFamily: type.sansSemi }]}>
                {firstName}
              </Text>
              <Text style={[styles.identityEmail, { fontFamily: type.sans }]}>
                {user?.email ?? copy.notSignedIn}
              </Text>
              <Text style={[styles.identityRole, { fontFamily: type.sans }]}>
                {copy.executiveMember}
              </Text>
            </View>

            <View style={styles.planPill}>
              <Ionicons name="checkmark-circle" size={14} color={c.success} />
              <Text style={[styles.planPillText, { fontFamily: type.sansSemi }]}>
                {copy.activePlan}
              </Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard tint={glass.card} border={glass.border} sheen={glass.sheen}>
          {settings.map((row, index) => (
            <View key={row.key}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={row.title}
                onPress={row.onPress}
                style={[styles.linkRow, index > 0 && styles.rowDivided]}
              >
                <View style={styles.iconWell}>
                  <Ionicons name={row.icon} size={16} color={c.accent} />
                </View>
                <View style={styles.flexCopy}>
                  <Text
                    style={[styles.linkTitle, { fontFamily: type.sansSemi }]}
                  >
                    {row.title}
                  </Text>
                  <Text style={[styles.linkMeta, { fontFamily: type.sans }]}>
                    {row.meta}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.faint} />
              </Pressable>

              {row.key === "personal" && infoOpen
                ? info.map((item) => (
                    <View key={item.key} style={styles.detailRow}>
                      <Text
                        style={[styles.detailLabel, { fontFamily: type.sans }]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          { fontFamily: type.sansSemi },
                        ]}
                      >
                        {item.value}
                      </Text>
                    </View>
                  ))
                : null}
            </View>
          ))}

          <View style={[styles.linkRow, styles.rowDivided]}>
            <View style={styles.iconWell}>
              <Ionicons name="moon-outline" size={16} color={c.accent} />
            </View>
            <View style={styles.flexCopy}>
              <Text style={[styles.linkTitle, { fontFamily: type.sansSemi }]}>
                {t.header.darkTheme}
              </Text>
              <Text style={[styles.linkMeta, { fontFamily: type.sans }]}>
                {copy.darkThemeMeta}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: c.track, true: c.accent }}
              thumbColor={c.card}
            />
          </View>
        </GlassCard>

        <Text style={[styles.sectionKicker, { fontFamily: type.sansSemi }]}>
          {copy.support}
        </Text>

        <GlassCard tint={glass.card} border={glass.border} sheen={glass.sheen}>
          {support.map((row, index) => (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              accessibilityLabel={row.title}
              onPress={row.onPress}
              style={[styles.linkRow, index > 0 && styles.rowDivided]}
            >
              <View style={styles.iconWell}>
                <Ionicons name={row.icon} size={16} color={c.accent} />
              </View>
              <View style={styles.flexCopy}>
                <Text style={[styles.linkTitle, { fontFamily: type.sansSemi }]}>
                  {row.title}
                </Text>
                <Text style={[styles.linkMeta, { fontFamily: type.sans }]}>
                  {row.meta}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.faint} />
            </Pressable>
          ))}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.signOut}
            onPress={() => {
              signOut();
              router.replace("/(tabs)");
            }}
            style={[styles.linkRow, styles.rowDivided]}
          >
            <View style={[styles.iconWell, styles.signOutWell]}>
              <Ionicons name="log-out-outline" size={16} color={c.danger} />
            </View>
            <Text
              style={[
                styles.linkTitle,
                styles.flexCopy,
                { color: c.danger, fontFamily: type.sansSemi },
              ]}
            >
              {copy.signOut}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={c.danger} />
          </Pressable>
        </GlassCard>
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
    identityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isDark ? c.accentSoft : "rgba(255,255,255,0.7)",
      borderWidth: 1,
      borderColor: isDark ? c.accentBorder : "rgba(255,255,255,0.9)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 20,
      fontWeight: "700",
      color: c.accent,
    },
    flexCopy: {
      flex: 1,
      minWidth: 0,
    },
    identityName: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
    },
    identityEmail: {
      fontSize: 12,
      color: c.muted,
      marginTop: 3,
    },
    identityRole: {
      fontSize: 12,
      color: c.faint,
      marginTop: 2,
    },
    planPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: isDark ? c.successSoft : "rgba(233, 241, 232, 0.9)",
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    planPillText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.success,
    },
    sectionKicker: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      color: c.accent,
      textTransform: "uppercase",
      marginTop: 6,
      marginLeft: 4,
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
    },
    rowDivided: {
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    iconWell: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.14)"
        : "rgba(255, 248, 236, 0.9)",
      alignItems: "center",
      justifyContent: "center",
    },
    signOutWell: {
      backgroundColor: isDark ? c.dangerSoft : "rgba(251, 234, 232, 0.9)",
    },
    linkTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    linkMeta: {
      fontSize: 11,
      color: c.muted,
      marginTop: 2,
      lineHeight: 15,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      paddingLeft: 48,
      paddingBottom: 8,
    },
    detailLabel: {
      fontSize: 11,
      color: c.faint,
    },
    detailValue: {
      flex: 1,
      fontSize: 12,
      color: c.text,
      textAlign: "right",
    },
  });
}
