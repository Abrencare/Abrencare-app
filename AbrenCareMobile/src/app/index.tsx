import React from "react";

import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { useLanguage } from "@/i18n/LanguageContext";

import colors from "@/theme/colors";

export default function WelcomeScreen() {
  const router = useRouter();

  const {
    t,
    language,
    setLanguage,
  } = useLanguage();

  const changeLanguage = (newLanguage: "en" | "am") => {
    setLanguage(newLanguage);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require("@/assets/images/welcome-hero.png")}
        style={styles.background}
        resizeMode="cover"
      >

        {/* =====================================
            IMAGE OVERLAY
        ===================================== */}

        <View style={styles.overlay} />

        {/* =====================================
            TOP LANGUAGE NAVIGATION
        ===================================== */}

        <View style={styles.topSection}>
          <View style={styles.languageContainer}>

            {/* English */}

            <Pressable
              onPress={() => changeLanguage("en")}
              hitSlop={10}
            >
              <Text
                style={[
                  styles.languageText,
                  language === "en" && styles.activeLanguage,
                ]}
              >
                English
              </Text>
            </Pressable>

            {/* Divider */}

            <Text style={styles.languageDivider}>
              ·
            </Text>

            {/* Amharic */}

            <Pressable
              onPress={() => changeLanguage("am")}
              hitSlop={10}
            >
              <Text
                style={[
                  styles.languageText,
                  language === "am" && styles.activeLanguage,
                ]}
              >
                አማርኛ
              </Text>
            </Pressable>

          </View>
        </View>

        {/* =====================================
            BOTTOM BUTTON
        ===================================== */}

        <View style={styles.bottomSection}>

          <View style={styles.bottomContent}>

            <Pressable
              onPress={() => router.push("/login")}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {t.welcome.getStarted}
              </Text>
            </Pressable>

          </View>

        </View>

      </ImageBackground>
    </SafeAreaView>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({

  /* =====================================
     SCREEN
  ===================================== */

  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },

  /* =====================================
     FULL SCREEN IMAGE
  ===================================== */

  background: {
    flex: 1,

    width: "100%",
    height: "100%",
  },

  /* =====================================
     IMAGE OVERLAY
  ===================================== */

  overlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },

  /* =====================================
     TOP SECTION
  ===================================== */

  topSection: {
    flex: 1,

    alignItems: "flex-end",

    paddingHorizontal: 22,

    paddingTop: 12,
  },

  /* =====================================
     LANGUAGE
  ===================================== */

  languageContainer: {
    flexDirection: "row",

    alignItems: "center",

    paddingVertical: 8,

    paddingHorizontal: 12,

    borderRadius: 20,

    backgroundColor: "rgba(255, 255, 255, 0.78)",
  },

  languageText: {
    color: "#6B7280",

    fontSize: 13,

    fontWeight: "500",
  },

  activeLanguage: {
    color: colors.primary,

    fontWeight: "700",
  },

  languageDivider: {
    color: "#9CA3AF",

    fontSize: 15,

    marginHorizontal: 8,
  },

  /* =====================================
     BOTTOM SECTION
  ===================================== */

  bottomSection: {
    width: "100%",
  },

  bottomContent: {
    paddingHorizontal: 20,

    paddingTop: 45,

    paddingBottom: 20,

    backgroundColor: "rgba(0, 0, 0, 0.30)",
  },

  /* =====================================
     GET STARTED BUTTON
  ===================================== */

  primaryButton: {
    width: "100%",

    height: 58,

    borderRadius: 18,

    backgroundColor: colors.primary,

    alignItems: "center",

    justifyContent: "center",
  },

  primaryButtonText: {
    color: colors.white,

    fontSize: 16,

    fontWeight: "700",
  },

  /* =====================================
     PRESS EFFECT
  ===================================== */

  buttonPressed: {
    opacity: 0.85,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },
});