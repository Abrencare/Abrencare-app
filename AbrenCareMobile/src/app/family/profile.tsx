import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { GlassCard, glassTints } from "@/components/executive/GlassCard";
import { FamilyHero } from "@/components/family/FamilyHero";
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
  const {
    user,
    signOut,
    updateAccountProfile,
    updateActiveFamilyMember,
  } = useAuth();
  const { isDark, toggleTheme } = useAppTheme();
  const glass = glassTints(isDark, "family");
  const { serviceStarted } = useFamilyJourney();
  const member = activeFamilyMember(user);
  const memberName = member?.name ?? user?.name ?? "";
  const memberAge =
    member?.ageYears !== null && member?.ageYears !== undefined
      ? t.familyAdd.dobAge.replace("{age}", String(member.ageYears))
      : t.profile.ageValue;
  const memberCity = member?.city || t.profile.addressValue;
  const memberPhone = member?.phone || t.familyAdd.noneSelected;

  const [editing, setEditing] = useState(false);
  const [managerName, setManagerName] = useState(user?.name ?? "");
  const [managerEmail, setManagerEmail] = useState(user?.email ?? "");
  const [managerPhone, setManagerPhone] = useState(user?.phone ?? "");
  const [careName, setCareName] = useState(member?.name ?? "");
  const [carePhone, setCarePhone] = useState(member?.phone ?? "");
  const [careCity, setCareCity] = useState(member?.city ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setManagerName(user?.name ?? "");
    setManagerEmail(user?.email ?? "");
    setManagerPhone(user?.phone ?? "");
  }, [user?.name, user?.email, user?.phone]);

  useEffect(() => {
    setCareName(member?.name ?? "");
    setCarePhone(member?.phone ?? "");
    setCareCity(member?.city ?? "");
  }, [member?.name, member?.phone, member?.city]);

  function startEdit() {
    setEditing(true);
    setSaved(false);
  }

  function saveEdit() {
    updateAccountProfile({
      name: managerName,
      email: managerEmail,
      phone: managerPhone,
    });
    if (member) {
      updateActiveFamilyMember({
        name: careName,
        phone: carePhone,
        city: careCity,
      });
    }
    setEditing(false);
    setSaved(true);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <FamilyHero
        kicker={t.profile.account}
        title={t.profile.title}
        subtitle={memberName}
      />

      <View style={styles.body}>
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
          shadowColor="#16332C"
          style={styles.profileCard}
        >
          <FamilyProfilePhoto size={52} name={memberName} />

          <View style={styles.profileCopy}>
            <Text style={styles.name}>{memberName}</Text>
            <Text style={styles.subtitle}>{t.profile.member}</Text>
            {member?.status === "pending" ? (
              <View style={[styles.statusBadge, styles.statusPending]}>
                <Text style={[styles.statusText, styles.statusPendingText]}>
                  {t.profile.memberPending}
                </Text>
              </View>
            ) : serviceStarted ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{t.profile.memberApproved}</Text>
              </View>
            ) : null}
          </View>
        </GlassCard>

        {/* Inline edit section */}
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
          shadowColor="#16332C"
          style={styles.section}
        >
          <View style={styles.editHeader}>
            <Text style={styles.sectionTitle}>{t.profile.editProfileTitle}</Text>
            {!editing ? (
              <TouchableOpacity onPress={startEdit} hitSlop={8}>
                <Text style={styles.editLink}>{t.profile.editProfile}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditing(false)} hitSlop={8}>
                <Text style={styles.editLinkMuted}>{t.common.back}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.editHint}>{t.profile.editProfileSubtitle}</Text>

          {saved && !editing ? (
            <Text style={styles.savedNote}>{t.profile.saveProfile}</Text>
          ) : null}

          <Text style={styles.fieldLabel}>{t.profile.accountManagerRole}</Text>
          {editing ? (
            <TextInput
              value={managerName}
              onChangeText={setManagerName}
              placeholder={t.auth.fullNamePlaceholder}
              placeholderTextColor="#9AA3AF"
              style={styles.input}
              autoCapitalize="words"
            />
          ) : (
            <Text style={styles.value}>{user?.name}</Text>
          )}

          <View style={styles.separator} />

          <Text style={styles.fieldLabel}>{t.profile.accountEmail}</Text>
          {editing ? (
            <TextInput
              value={managerEmail}
              onChangeText={setManagerEmail}
              placeholder={t.auth.emailPlaceholder}
              placeholderTextColor="#9AA3AF"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.value}>{user?.email}</Text>
          )}

          <View style={styles.separator} />

          <Text style={styles.fieldLabel}>{t.profile.phone}</Text>
          {editing ? (
            <TextInput
              value={managerPhone}
              onChangeText={setManagerPhone}
              placeholder={t.auth.phoneLocalPlaceholder}
              placeholderTextColor="#9AA3AF"
              style={styles.input}
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.value}>{user?.phone || "—"}</Text>
          )}

          {member ? (
            <>
              <View style={styles.separator} />
              <Text style={[styles.fieldLabel, styles.fieldSpacing]}>
                {t.profile.member}
              </Text>
              {editing ? (
                <TextInput
                  value={careName}
                  onChangeText={setCareName}
                  placeholder={t.auth.fullNamePlaceholder}
                  placeholderTextColor="#9AA3AF"
                  style={styles.input}
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.value}>{member.name}</Text>
              )}
            </>
          ) : null}

          {editing ? (
            <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{t.profile.saveProfile}</Text>
            </TouchableOpacity>
          ) : null}
        </GlassCard>

        {/* Personal Information */}
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
          shadowColor="#16332C"
          style={styles.section}
        >
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
        </GlassCard>

        {/* Emergency Contact */}
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
          shadowColor="#16332C"
          style={styles.section}
        >
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
        </GlassCard>

        {/* Family Care Manager summary */}
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
          shadowColor="#16332C"
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>{t.profile.accountManager}</Text>

          <View style={styles.row}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>{initialsFor(user)}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.label}>{t.profile.accountManagerRole}</Text>
              <Text style={styles.value}>{user?.name}</Text>
              <Text style={styles.accountEmail}>{user?.email}</Text>
              {user?.phone ? (
                <Text style={styles.accountEmail}>{user.phone}</Text>
              ) : null}
              <Text style={styles.managerHint}>{t.profile.accountManagerHint}</Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
          shadowColor="#16332C"
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>{t.settings.title}</Text>

          <View style={styles.row}>
            <FamilyIconWell
              name={isDark ? "moon" : "moon-outline"}
              box={34}
              size={16}
            />
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
        </GlassCard>

        <View style={styles.legalRow}>
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: "/legal", params: { doc: "terms" } })
            }
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{t.auth.termsLink}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: "/legal", params: { doc: "privacy" } })
            }
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{t.auth.privacyLink}</Text>
          </TouchableOpacity>
        </View>

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
      </View>
    </ScrollView>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F3",
  },
  scrollContent: {
    paddingBottom: 88,
  },
  body: {
    paddingHorizontal: 16,
    marginTop: -38,
    gap: 14,
    paddingBottom: 8,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  profileCopy: {
    flex: 1,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16332C",
  },

  subtitle: {
    color: "#5C6B65",
    marginTop: 3,
    fontSize: 13,
  },

  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#EEF3EF",
    borderWidth: 1,
    borderColor: "#D7E3DC",
  },

  statusPending: {
    backgroundColor: "#F4EFE2",
    borderColor: "#E6D7B4",
  },

  statusText: {
    color: "#1A3A32",
    fontWeight: "700",
    fontSize: 11,
  },

  statusPendingText: {
    color: "#9A7B3C",
  },

  managerHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#5C6B65",
    lineHeight: 16,
  },

  section: {
    marginBottom: 0,
  },

  sectionTitle: {
    fontSize: 11,
    color: "#9B9B9B",
    letterSpacing: 1,
    marginBottom: 0,
  },

  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  editLink: {
    color: "#5E7A62",
    fontSize: 13,
    fontWeight: "700",
  },

  editLinkMuted: {
    color: "#9AA3AF",
    fontSize: 13,
    fontWeight: "600",
  },

  editHint: {
    color: "#5C6B65",
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },

  savedNote: {
    color: "#2F9E6B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },

  fieldLabel: {
    fontSize: 11,
    color: "#9B9B9B",
    marginBottom: 6,
  },

  fieldSpacing: {
    marginTop: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: "#D7E3DC",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#2A2622",
    marginBottom: 4,
  },

  saveButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#8B9A7C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
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
    marginVertical: 8,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D7E3DC",
    backgroundColor: "#EEF3EF",
    alignItems: "center",
    justifyContent: "center",
  },

  accountAvatarText: {
    color: "#1A3A32",
    fontWeight: "700",
    fontSize: 12,
  },

  accountEmail: {
    fontSize: 12,
    color: "#9AA3AF",
    marginTop: 2,
  },

  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  legalLink: {
    color: "#5E7A62",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  legalDot: {
    color: "#9AA3AF",
    fontSize: 13,
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
