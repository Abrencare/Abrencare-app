import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ServiceBackButton from "@/components/navigation/ServiceBackButton";
import BrandLogo, { BrandHomeLink } from "@/components/ui/BrandLogo";
import { useExecutiveAlerts } from "@/context/ExecutiveAlertsContext";
import { useLanguage } from "@/context/LanguageContext";
import { useLandingType } from "@/theme/landingType";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";
import { withAlpha } from "@/components/executive/GlassCard";

const HERO_PHOTO = require("@/assets/images/executive-hero-bg.jpg");

export function ExecutiveHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const c = useExecutiveTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const type = useLandingType("executive");
  const { t } = useLanguage();
  const { unreadCount } = useExecutiveAlerts();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
      <Image source={HERO_PHOTO} style={styles.heroPhoto} resizeMode="cover" />

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
          onPress={() => router.push("/executive/alerts")}
        >
          <Ionicons name="notifications-outline" size={19} color={c.heroText} />
          {unreadCount > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Text style={[styles.heroKicker, { fontFamily: type.sansSemi }]}>
        {t.executiveHome.kicker}
      </Text>
      <Text style={[styles.heroTitle, { fontFamily: type.display }]}>
        {title}
      </Text>
      <Text style={[styles.heroSubtitle, { fontFamily: type.sans }]}>
        {subtitle}
      </Text>
    </View>
  );
}

function createStyles(c: ExecutivePalette) {
  return StyleSheet.create({
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
  });
}
