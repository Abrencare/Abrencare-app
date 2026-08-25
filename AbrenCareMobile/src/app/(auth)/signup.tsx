import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";

import { Link, useRouter } from "expo-router";

import { Input } from "@/components/Input";
import { useLanguage } from "@/i18n/LanguageContext";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function SignupScreen() {
  const router = useRouter();

  // Uses the language selected on the Welcome screen
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSignup() {
    router.replace("/(tabs)");
  }

  return (
    <View style={styles.container}>

      {/* =========================
          HEADER
      ========================= */}

      <View style={styles.header}>
        <Text style={styles.title}>
          {t.auth.signupTitle}
        </Text>

        <Text style={styles.subtitle}>
          {t.auth.signupSubtitle}
        </Text>
      </View>

      {/* =========================
          SIGNUP FORM
      ========================= */}

      <View style={styles.form}>

        {/* Full Name */}

        <Text style={styles.label}>
          {t.auth.fullName}
        </Text>

        <Input
          placeholder={t.auth.fullNamePlaceholder}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        {/* Email */}

        <Text style={styles.label}>
          {t.auth.email}
        </Text>

        <Input
          placeholder={t.auth.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        {/* Password */}

        <Text style={styles.label}>
          {t.auth.password}
        </Text>

        <Input
          placeholder={t.auth.createPasswordPlaceholder}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

      </View>

      {/* =========================
          SIGN UP BUTTON
      ========================= */}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleSignup}
      >
        <Text style={styles.buttonText}>
          {t.auth.signUp}
        </Text>
      </Pressable>

      {/* =========================
          LOGIN LINK
      ========================= */}

      <View style={styles.footer}>

        <Text style={styles.footerText}>
          {t.auth.haveAccount}
        </Text>

        <Link
          href="/login"
          style={styles.link}
        >
          <Text style={styles.linkText}>
            {t.auth.signIn}
          </Text>
        </Link>

      </View>

    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({

  /* =========================
     CONTAINER
  ========================= */

  container: {
    flex: 1,

    padding: spacing.lg,

    justifyContent: "center",

    backgroundColor: colors.background,
  },

  /* =========================
     HEADER
  ========================= */

  header: {
    marginBottom: spacing.lg,
  },

  title: {
    ...typography.header,

    fontSize: 32,

    marginBottom: spacing.sm,

    color: colors.text,
  },

  subtitle: {
    ...typography.body,

    color: colors.subtext,

    lineHeight: 22,
  },

  /* =========================
     FORM
  ========================= */

  form: {
    marginBottom: spacing.xl,
  },

  label: {
    ...typography.body,

    color: colors.text,

    marginBottom: spacing.xs,

    fontWeight: "600",
  },

  input: {
    marginBottom: spacing.md,
  },

  /* =========================
     SIGN UP BUTTON
  ========================= */

  button: {
    backgroundColor: colors.primary,

    borderRadius: 14,

    paddingVertical: 16,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: spacing.md,
  },

  buttonPressed: {
    opacity: 0.85,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  buttonText: {
    color: colors.surface,

    fontWeight: "700",

    fontSize: 16,
  },

  /* =========================
     FOOTER
  ========================= */

  footer: {
    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",
  },

  footerText: {
    ...typography.body,

    color: colors.text,

    marginRight: spacing.xs,
  },

  link: {
    justifyContent: "center",
  },

  linkText: {
    ...typography.body,

    color: colors.primary,

    fontWeight: "700",
  },
});