import React, { useMemo, useState } from "react";
import {
  Alert,
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
  Avatar,
  Card,
  ScreenHeader,
  SectionHeader,
} from "@/components/executive/ExecutiveUI";
import { useLanguage } from "@/context/LanguageContext";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

const SLOTS = ["09:00", "11:30", "14:00", "16:30"];

export default function ExecutiveConsultation() {
  const c = useExecutiveTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { t } = useLanguage();
  const router = useRouter();
  const [doctor, setDoctor] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const copy = t.executiveConsult;
  const home = t.executiveHome;

  const specialists = [
    {
      key: "doctor",
      initials: "HB",
      tone: "accent" as const,
      name: home.doctorName,
      role: home.doctorRole,
      meta: home.doctorMeta,
    },
    {
      key: "nurse",
      initials: "NS",
      tone: "slate" as const,
      name: home.nurseName,
      role: home.nurseRole,
      meta: t.executive.available,
    },
  ];

  const request = () => {
    if (!doctor || !slot) {
      Alert.alert(copy.title, copy.selectPrompt, [{ text: copy.ok }]);
      return;
    }

    Alert.alert(copy.requestedTitle, copy.requestedBody, [{ text: copy.ok }]);
    setDoctor(null);
    setSlot(null);
  };

  const reschedule = () => {
    setDoctor("doctor");
    setSlot(null);
    Alert.alert(copy.rescheduleTitle, copy.rescheduleBody, [
      { text: copy.ok },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          kicker={home.kicker}
          title={copy.title}
          subtitle={copy.subtitle}
        />

        <Card style={styles.upcomingCard}>
          <Text style={styles.upcomingLabel}>{copy.upcomingLabel}</Text>

          <View style={styles.upcomingTop}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateDay}>30</Text>
              <Text style={styles.dateMonth}>SEP</Text>
            </View>

            <View style={styles.upcomingCopy}>
              <Text style={styles.upcomingTitle}>{copy.upcomingTitle}</Text>
              <Text style={styles.upcomingWhen}>{copy.upcomingWhen}</Text>
              <Text style={styles.upcomingWith}>{copy.upcomingWith}</Text>
            </View>
          </View>

          <View style={styles.upcomingActions}>
            <Pressable
              style={styles.solidButton}
              onPress={() =>
                router.push({
                  pathname: "/executive/call",
                  params: { who: "doctor" },
                })
              }
            >
              <Ionicons name="videocam" size={15} color={c.onAccent} />
              <Text style={styles.solidButtonText}>{copy.joinCall}</Text>
            </Pressable>

            <Pressable style={styles.ghostButton} onPress={reschedule}>
              <Ionicons name="time-outline" size={15} color={c.accent} />
              <Text style={styles.ghostButtonText}>{copy.reschedule}</Text>
            </Pressable>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionHeader title={copy.chooseTitle} />
          <Text style={styles.sectionCaption}>{copy.chooseSubtitle}</Text>

          {specialists.map((person) => {
            const selected = doctor === person.key;

            return (
              <Pressable
                key={person.key}
                onPress={() => setDoctor(person.key)}
                style={[
                  styles.specialistCard,
                  selected && styles.specialistCardActive,
                ]}
              >
                <Avatar initials={person.initials} tone={person.tone} />

                <View style={styles.upcomingCopy}>
                  <Text style={styles.specialistName}>{person.name}</Text>
                  <Text style={styles.specialistRole}>{person.role}</Text>
                  <Text style={styles.specialistMeta}>{person.meta}</Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.executiveHome.message}
                  style={styles.messageButton}
                  onPress={() =>
                    router.push({
                      pathname: "/executive/chat",
                      params: { who: person.key },
                    })
                  }
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={16}
                    color={c.accent}
                  />
                </Pressable>

                <Ionicons
                  name={selected ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={selected ? c.accent : c.faint}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <SectionHeader title={copy.slotsTitle} />

          <View style={styles.slotRow}>
            {SLOTS.map((option) => {
              const selected = slot === option;

              return (
                <Pressable
                  key={option}
                  onPress={() => setSlot(option)}
                  style={[styles.slot, selected && styles.slotActive]}
                >
                  <Text
                    style={[
                      styles.slotLabel,
                      selected && styles.slotLabelActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable style={styles.requestButton} onPress={request}>
          <Ionicons name="calendar" size={16} color={c.onAccent} />
          <Text style={styles.requestButtonText}>{copy.request}</Text>
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
    section: {
      marginTop: 24,
    },
    sectionCaption: {
      fontSize: 12,
      color: c.muted,
      marginTop: -6,
      marginBottom: 12,
    },

    upcomingCard: {
      backgroundColor: c.card,
    },
    upcomingLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      color: c.kicker,
      marginBottom: 12,
    },
    upcomingTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    dateBlock: {
      width: 56,
      height: 62,
      borderRadius: 16,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    dateDay: {
      fontSize: 22,
      fontWeight: "700",
      color: c.accent,
    },
    dateMonth: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
      color: c.accent,
    },
    upcomingCopy: {
      flex: 1,
    },
    upcomingTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    upcomingWhen: {
      fontSize: 12,
      color: c.muted,
      marginTop: 3,
    },
    upcomingWith: {
      fontSize: 11,
      color: c.faint,
      marginTop: 2,
    },
    upcomingActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },

    solidButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 12,
    },
    solidButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.onAccent,
    },
    ghostButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      backgroundColor: c.accentSoft,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.accentBorder,
      paddingVertical: 12,
    },
    ghostButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.accent,
    },

    specialistCard: {
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
    specialistCardActive: {
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
    },
    messageButton: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    specialistName: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    specialistRole: {
      fontSize: 12,
      color: c.muted,
      marginTop: 2,
    },
    specialistMeta: {
      fontSize: 11,
      color: c.faint,
      marginTop: 2,
    },

    slotRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    slot: {
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    slotActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    slotLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
    },
    slotLabelActive: {
      color: c.onAccent,
    },

    requestButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.accent,
      borderRadius: 16,
      paddingVertical: 15,
      marginTop: 26,
    },
    requestButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: c.onAccent,
    },
  });
}
