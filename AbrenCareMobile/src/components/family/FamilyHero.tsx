import React, { type ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ServiceBackButton from "@/components/navigation/ServiceBackButton";
import BrandLogo, { BrandHomeLink } from "@/components/ui/BrandLogo";
import { withAlpha } from "@/components/executive/GlassCard";
import { useLanguage } from "@/context/LanguageContext";
import { useLandingType } from "@/theme/landingType";

const HERO_PHOTO = require("@/assets/images/stock-family-hero.jpg");

const FILL = "#1A3A32";
const HERO_TEXT = "#F4F6F3";
const HERO_MUTED = "rgba(232, 237, 228, 0.84)";
const KICKER = "#C5D4C8";
const CHIP = "rgba(255,255,255,0.12)";
const CHIP_BORDER = "rgba(255,255,255,0.22)";

export function FamilyHero({
  title,
  subtitle,
  kicker,
  trailing,
  backHref = "/family",
}: {
  title: string;
  subtitle: string;
  kicker?: string;
  trailing?: ReactNode;
  backHref?: string;
}) {
  const type = useLandingType("family");
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
      <Image source={HERO_PHOTO} style={styles.heroPhoto} resizeMode="cover" />
      <LinearGradient
        colors={[FILL, withAlpha(FILL, 0.94), withAlpha(FILL, 0.42)]}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.heroFade}
      />

      <View style={styles.heroTopRow}>
        <View style={styles.brandRow}>
          <ServiceBackButton
            color={HERO_TEXT}
            background={CHIP}
            borderColor={CHIP_BORDER}
            size={32}
            href={backHref}
          />
          <BrandHomeLink style={styles.brandLink}>
            <BrandLogo size={34} link={false} />
            <Text style={styles.wordmark}>{t.auth.brand}</Text>
          </BrandHomeLink>
        </View>
        {trailing}
      </View>

      {kicker ? (
        <Text style={[styles.heroKicker, { fontFamily: type.sansSemi }]}>
          {kicker}
        </Text>
      ) : null}
      <Text style={[styles.heroTitle, { fontFamily: type.display }]}>
        {title}
      </Text>
      <Text style={[styles.heroSubtitle, { fontFamily: type.sans }]}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: FILL,
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
    gap: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  brandLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  wordmark: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: HERO_TEXT,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: KICKER,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    color: HERO_TEXT,
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: HERO_MUTED,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 300,
  },
});
