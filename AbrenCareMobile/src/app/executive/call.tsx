import React, { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useLanguage } from "@/context/LanguageContext";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

export default function ExecutiveCall() {
  const c = useExecutiveTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  const isNurse = params.who === "nurse";
  const person = isNurse
    ? {
        initials: "NS",
        name: t.executiveHome.nurseName,
        role: t.executiveHome.nurseRole,
      }
    : {
        initials: "HB",
        name: t.executiveHome.doctorName,
        role: t.executiveHome.doctorRole,
      };

  const copy = t.executiveCall;

  useEffect(() => {
    const timeout = setTimeout(() => setConnected(true), 1600);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!connected) {
      return;
    }

    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [connected]);

  const timer = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-down" size={20} color={c.heroText} />
        </Pressable>

        <View style={styles.secureRow}>
          <Ionicons name="lock-closed" size={11} color={c.heroMuted} />
          <Text style={styles.secureText}>{copy.secure}</Text>
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{person.initials}</Text>
        </View>

        <Text style={styles.name}>{person.name}</Text>
        <Text style={styles.role}>{person.role}</Text>

        <Text style={styles.status}>{connected ? timer : copy.connecting}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          style={[styles.control, muted && styles.controlActive]}
          onPress={() => setMuted((value) => !value)}
        >
          <Ionicons
            name={muted ? "mic-off" : "mic-outline"}
            size={22}
            color={muted ? c.hero : c.heroText}
          />
          <Text style={[styles.controlLabel, muted && styles.controlLabelActive]}>
            {muted ? copy.unmute : copy.mute}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={[styles.control, speaker && styles.controlActive]}
          onPress={() => setSpeaker((value) => !value)}
        >
          <Ionicons
            name={speaker ? "volume-high" : "volume-medium-outline"}
            size={22}
            color={speaker ? c.hero : c.heroText}
          />
          <Text
            style={[styles.controlLabel, speaker && styles.controlLabelActive]}
          >
            {copy.speaker}
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        style={styles.endButton}
        onPress={() => router.back()}
      >
        <Ionicons name="call" size={20} color="#FFFFFF" />
        <Text style={styles.endButtonText}>{copy.end}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function createStyles(c: ExecutivePalette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.hero,
      paddingHorizontal: 22,
      paddingBottom: 28,
    },
    top: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingTop: 12,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 13,
      backgroundColor: c.heroChip,
      borderWidth: 1,
      borderColor: c.heroChipBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    secureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    secureText: {
      fontSize: 11,
      color: c.heroMuted,
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    avatar: {
      width: 116,
      height: 116,
      borderRadius: 40,
      backgroundColor: c.heroChip,
      borderWidth: 1,
      borderColor: c.heroChipBorder,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    avatarText: {
      fontSize: 38,
      fontWeight: "700",
      color: c.kicker,
    },
    name: {
      fontSize: 22,
      fontWeight: "700",
      color: c.heroText,
    },
    role: {
      fontSize: 13,
      color: c.heroMuted,
    },
    status: {
      fontSize: 15,
      fontWeight: "600",
      color: c.kicker,
      marginTop: 14,
      fontVariant: ["tabular-nums"],
    },

    controls: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 16,
      marginBottom: 20,
    },
    control: {
      width: 96,
      alignItems: "center",
      gap: 7,
      paddingVertical: 16,
      borderRadius: 20,
      backgroundColor: c.heroChip,
      borderWidth: 1,
      borderColor: c.heroChipBorder,
    },
    controlActive: {
      backgroundColor: c.kicker,
      borderColor: c.kicker,
    },
    controlLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: c.heroText,
    },
    controlLabelActive: {
      color: c.hero,
    },

    endButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      backgroundColor: "#C2453A",
      borderRadius: 20,
      paddingVertical: 17,
    },
    endButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });
}
