import React, { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  Card,
  ScreenHeader,
  SectionHeader,
  StatusPill,
} from "@/components/executive/ExecutiveUI";
import { initialsFor, useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAppTheme } from "@/context/ThemeContext";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

export default function ExecutiveProfile() {
  const c = useExecutiveTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { t, language, setLanguage } = useLanguage();
  const { isDark, toggleTheme } = useAppTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);

  const info = [
    { key: "name", label: t.profile.fullName, value: user?.name ?? "—" },
    { key: "email", label: t.profile.emailLabel, value: user?.email ?? "—" },
    { key: "phone", label: t.profile.phone, value: user?.phone || "—" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          kicker={t.executiveHome.kicker}
          title={t.profile.title}
          subtitle={t.profile.subtitle}
        />

        <Card style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFor(user)}</Text>
          </View>

          <View style={styles.identityCopy}>
            <Text style={styles.identityName}>
              {user?.name ?? t.profile.guest}
            </Text>
            <Text style={styles.identityEmail}>
              {user?.email ?? t.profile.notSignedIn}
            </Text>

            <View style={styles.identityPill}>
              <StatusPill label={t.profile.activePlan} tone="accent" />
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionHeader title={t.profile.yourInformation} />

          <Card>
            {info.map((row, index) => (
              <View
                key={row.key}
                style={[styles.infoRow, index > 0 && styles.infoRowDivided]}
              >
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title={t.profile.consultationSettings} />

          <Card>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t.profile.languageLabel}
                </Text>
                <Text style={styles.settingMeta}>
                  {language === "en"
                    ? t.profile.languageEnglish
                    : t.profile.languageAmharic}
                </Text>
              </View>

              <View style={styles.langToggle}>
                <Pressable
                  onPress={() => setLanguage("en")}
                  style={[
                    styles.langOption,
                    language === "en" && styles.langOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.langLabel,
                      language === "en" && styles.langLabelActive,
                    ]}
                  >
                    EN
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setLanguage("am")}
                  style={[
                    styles.langOption,
                    language === "am" && styles.langOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.langLabel,
                      language === "am" && styles.langLabelActive,
                    ]}
                  >
                    አማ
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.settingRow, styles.settingRowDivided]}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>{t.header.darkTheme}</Text>
                <Text style={styles.settingMeta}>
                  {isDark
                    ? t.profile.notificationsOn
                    : t.profile.notificationsOff}
                </Text>
              </View>

              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: c.track, true: c.accent }}
                thumbColor={c.card}
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowDivided]}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>
                  {t.profile.notificationsLabel}
                </Text>
                <Text style={styles.settingMeta}>
                  {notifications
                    ? t.profile.notificationsOn
                    : t.profile.notificationsOff}
                </Text>
              </View>

              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: c.track, true: c.accent }}
                thumbColor={c.card}
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title={t.profile.accountSection} />

          <Card>
            <Pressable
              style={styles.linkRow}
              onPress={() =>
                router.push({
                  pathname: "/executive/chat",
                  params: { who: "doctor" },
                })
              }
            >
              <Ionicons name="chatbubble-outline" size={17} color={c.accent} />
              <Text style={styles.linkLabel}>
                {t.executiveHome.messageTeam}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={c.faint} />
            </Pressable>

            <Pressable
              style={[styles.linkRow, styles.settingRowDivided]}
              onPress={() => router.push("/executive/reports")}
            >
              <Ionicons
                name="document-text-outline"
                size={17}
                color={c.accent}
              />
              <Text style={styles.linkLabel}>
                {t.executiveHome.actionReport}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={c.faint} />
            </Pressable>

            <Pressable
              style={[styles.linkRow, styles.settingRowDivided]}
              onPress={() => router.push("/executive/programme")}
            >
              <Ionicons name="layers-outline" size={17} color={c.accent} />
              <Text style={styles.linkLabel}>
                {t.executiveHealth.programmeLink}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={c.faint} />
            </Pressable>

            <Pressable
              style={[styles.linkRow, styles.settingRowDivided]}
              onPress={() => {
                signOut();
                router.replace("/(tabs)");
              }}
            >
              <Ionicons name="log-out-outline" size={17} color={c.danger} />
              <Text style={[styles.linkLabel, { color: c.danger }]}>
                {t.profile.signOut}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={c.danger} />
            </Pressable>
          </Card>
        </View>
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
    section: {
      marginTop: 24,
    },

    identityCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 20,
      fontWeight: "700",
      color: c.accent,
    },
    identityCopy: {
      flex: 1,
    },
    identityName: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
    },
    identityEmail: {
      fontSize: 12,
      color: c.muted,
      marginTop: 3,
    },
    identityPill: {
      marginTop: 9,
    },

    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 13,
    },
    infoRowDivided: {
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    infoLabel: {
      fontSize: 12,
      color: c.muted,
    },
    infoValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
      textAlign: "right",
    },

    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 13,
    },
    settingRowDivided: {
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    settingCopy: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
    },
    settingMeta: {
      fontSize: 11,
      color: c.faint,
      marginTop: 2,
    },

    langToggle: {
      flexDirection: "row",
      backgroundColor: c.page,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 3,
    },
    langOption: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    langOptionActive: {
      backgroundColor: c.accent,
    },
    langLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: c.muted,
    },
    langLabelActive: {
      color: c.onAccent,
    },

    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
    },
    linkLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
    },
  });
}
