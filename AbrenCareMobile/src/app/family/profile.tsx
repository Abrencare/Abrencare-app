import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import FamilyIconWell from "@/components/family/FamilyIconWell";
import FamilyProfilePhoto from "@/components/family/FamilyProfilePhoto";
import { initialsFor, useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useFamilyJourney } from "@/hooks/useFamilyJourney";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { activeFamilyMember } from "@/utilities/familyMember";

export default function ConsultationProfile() {

  const styles = useThemedStyles(baseStyles);
  const { t } = useLanguage();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useAppTheme();
  const { serviceStarted } = useFamilyJourney();
  const member = activeFamilyMember(user);
  const memberName = member?.name ?? user?.name ?? "";
  const memberAge =
    member?.ageYears !== null && member?.ageYears !== undefined
      ? t.familyAdd.dobAge.replace("{age}", String(member.ageYears))
      : t.profile.ageValue;
  const memberCity = member?.city || t.profile.addressValue;
  const memberPhone = member?.phone || t.familyAdd.noneSelected;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={10}
      >
        <Ionicons name="chevron-back" size={22} color="#4A5568" />
      </TouchableOpacity>

      <Text style={styles.smallTitle}>{t.profile.account}</Text>
      <Text style={styles.title}>{t.profile.title}</Text>

      {/* User Card */}
      <View style={styles.profileCard}>
        <FamilyProfilePhoto size={84} />

        <Text style={styles.name}>{memberName}</Text>

        <Text style={styles.subtitle}>
          {t.profile.member}
        </Text>

        {serviceStarted ? (
          <LinearGradient
            colors={isDark ? ["#3A5246", "#2A3B33"] : ["#FFFFFF", "#E3EFE8"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.statusBadge}
          >
            <Text style={[styles.statusText, isDark && styles.statusTextDark]}>
              {t.profile.activePlan}
            </Text>
          </LinearGradient>
        ) : null}
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.profile.personalInformation}</Text>

        <View style={styles.row}>
          <FamilyIconWell name="person-outline" box={34} size={16} />
          <View style={styles.info}>
            <Text style={styles.label}>{t.profile.fullName}</Text>
            <Text style={styles.value}>{memberName}</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.row}>
          <FamilyIconWell name="calendar-outline" box={34} size={16} />
          <View style={styles.info}>
            <Text style={styles.label}>{t.profile.age}</Text>
            <Text style={styles.value}>{memberAge}</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.row}>
          <FamilyIconWell name="location-outline" box={34} size={16} />
          <View style={styles.info}>
            <Text style={styles.label}>{t.profile.address}</Text>
            <Text style={styles.value}>{memberCity}</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.row}>
          <FamilyIconWell name="call-outline" box={34} size={16} />
          <View style={styles.info}>
            <Text style={styles.label}>{t.profile.phone}</Text>
            <Text style={styles.value}>{memberPhone}</Text>
          </View>
        </View>
      </View>

      {/* Emergency Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.profile.emergencyContact}</Text>

        <View style={styles.row}>
          <FamilyIconWell name="people-outline" box={34} size={16} />
          <View style={styles.info}>
            <Text style={styles.label}>{t.profile.coordinator}</Text>
            <Text style={styles.value}>Marta Tesfaye</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.row}>
          <FamilyIconWell name="medkit-outline" box={34} size={16} />
          <View style={styles.info}>
            <Text style={styles.label}>{t.profile.assignedNurse}</Text>
            <Text style={styles.value}>Meron Girma</Text>
          </View>
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.profile.signedInAs}</Text>

        <View style={styles.row}>
          <LinearGradient
            colors={isDark ? ["#3A5246", "#2A3B33"] : ["#FFFFFF", "#E3EFE8"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.accountAvatar}
          >
            <Text style={[styles.accountAvatarText, isDark && styles.statusTextDark]}>
              {initialsFor(user)}
            </Text>
          </LinearGradient>
          <View style={styles.info}>
            <Text style={styles.label}>{t.profile.accountEmail}</Text>
            <Text style={styles.value}>{user?.name}</Text>
            <Text style={styles.accountEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.title}</Text>

        <View style={styles.row}>
          <FamilyIconWell name={isDark ? "moon" : "moon-outline"} box={34} size={16} />
          <View style={styles.info}>
            <Text style={styles.label}>{t.header.darkTheme}</Text>
            <Text style={styles.value}>
              {isDark
                ? t.profile.notificationsOn
                : t.profile.notificationsOff}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: "#E2E0DB", true: "#8B9A7C" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.primaryButton}>
        <Text style={styles.primaryText}>{t.profile.editProfile}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push('/family-inbox')}
      >
        <Text style={styles.secondaryText}>{t.familyRequest.inboxTitle}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => {
          signOut();
          router.replace("/(tabs)");
        }}
      >
        <Ionicons name="log-out-outline" size={16} color="#B5544B" />
        <Text style={styles.signOutText}>{t.profile.signOut}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F3",
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },

  backButton: {
    marginBottom: 8,
  },

  smallTitle: {
    fontSize: 10,
    color: "#8C9487",
    letterSpacing: 1,
    marginBottom: 2,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#2A2622",
    marginBottom: 18,
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    alignItems: "center",
    padding: 22,
    marginBottom: 18,
  },

  name: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "700",
    color: "#2A2622",
  },

  subtitle: {
    color: "#8A8A8A",
    marginTop: 4,
  },

  statusBadge: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D7E6DC",
    overflow: "hidden",
  },

  statusText: {
    color: "#4F7A62",
    fontWeight: "600",
    fontSize: 12,
  },

  statusTextDark: {
    color: "#E7F3EC",
  },

  section: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 11,
    color: "#9B9B9B",
    letterSpacing: 1,
    marginBottom: 15,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  info: {
    marginLeft: 14,
    flex: 1,
  },

  label: {
    fontSize: 11,
    color: "#9B9B9B",
  },

  value: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "600",
    color: "#2A2622",
  },

  separator: {
    height: 1,
    backgroundColor: "#EEEEEE",
  },

  primaryButton: {
    backgroundColor: "#8B9A7C",
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  primaryText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },

  secondaryButton: {
    backgroundColor: "#FFF",
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D8D8D8",
    marginBottom: 4,
  },

  secondaryText: {
    color: "#2A2622",
    fontWeight: "600",
    fontSize: 15,
  },

  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7E6DC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  accountAvatarText: {
    color: "#4F7A62",
    fontWeight: "700",
    fontSize: 13,
  },

  accountEmail: {
    fontSize: 12,
    color: "#9AA3AF",
    marginTop: 2,
  },

  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    marginBottom: 30,
  },

  signOutText: {
    color: "#B5544B",
    fontWeight: "600",
    fontSize: 14,
  },
});