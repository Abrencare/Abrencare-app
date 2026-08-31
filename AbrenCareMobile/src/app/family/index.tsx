import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAppointments } from "@/family/AppointmentsContext";
import { formatDateKey, reminderLabel } from "@/family/format";
import { useLanguage } from "@/i18n/LanguageContext";

export default function FamilyOverview() {
  const { t } = useLanguage();
  const router = useRouter();
  const { nextAppointment } = useAppointments();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace("/(tabs)")}
        hitSlop={10}
      >
        <Ionicons name="chevron-back" size={22} color="#4A5568" />
      </TouchableOpacity>

      <Text style={styles.active}>{t.family.activeService}</Text>
      <Text style={styles.title}>{t.family.title}</Text>

      {/* Visit Card */}
      <View style={styles.visitCard}>
        <View style={styles.row}>
          <Ionicons name="location" size={18} color="#2F855A" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.visitTitle}>{t.family.visitInProgress}</Text>
            <Text style={styles.visitSubtitle}>
              {t.family.visitSubtitle}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        <View style={styles.greenLine} />

        {/* Patient */}
        <View style={styles.patientRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AT</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Ato Tadesse</Text>
            <Text style={styles.info}>
              {t.family.patientInfo}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t.family.liveReadings}</Text>

        {/* Blood Pressure */}
        <View style={styles.item}>
          <View>
            <Text style={styles.label}>{t.family.bloodPressure}</Text>
            <Text style={styles.value}>128/82 mmHg</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: "#E6F4EA" }]}>
            <Text style={[styles.badgeText, { color: "#2F855A" }]}>
              {t.family.good}
            </Text>
          </View>
        </View>

        {/* Medication */}
        <View style={styles.item}>
          <View>
            <Text style={styles.label}>{t.family.medication}</Text>
            <Text style={styles.value}>{t.family.morningDose}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: "#E6F4EA" }]}>
            <Text style={[styles.badgeText, { color: "#2F855A" }]}>
              {t.family.confirmed}
            </Text>
          </View>
        </View>

        {/* Blood Sample */}
        <View style={styles.item}>
          <View>
            <Text style={styles.label}>{t.family.bloodSample}</Text>
            <Text style={styles.value}>{t.family.taken}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: "#E8EEFF" }]}>
            <Text style={[styles.badgeText, { color: "#556CD6" }]}>
              {t.family.sentToLab}
            </Text>
          </View>
        </View>

        {/* Swelling */}
        <View style={styles.item}>
          <View>
            <Text style={styles.label}>{t.family.ankleSwelling}</Text>
            <Text style={styles.value}>{t.family.leftFoot}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: "#FFE8E8" }]}>
            <Text style={[styles.badgeText, { color: "#D64545" }]}>
              {t.family.flagged}
            </Text>
          </View>
        </View>
      </View>

      {/* Next Appointment */}
      <View style={styles.nextCard}>
        <Text style={styles.label}>{t.family.nextAppointment}</Text>

        {nextAppointment ? (
          <>
            <Text style={styles.visitTime}>
              {formatDateKey(nextAppointment.date, t)} · {nextAppointment.time}
            </Text>

            <View style={styles.row}>
              <Text style={styles.nurse}>
                {t.familyAppointments.types[nextAppointment.type]} ·{" "}
                {nextAppointment.withName}
              </Text>

              <View style={[styles.badge, { backgroundColor: "#EEF7E9" }]}>
                <Text style={[styles.badgeText, { color: "#6B8E55" }]}>
                  {t.family.booked}
                </Text>
              </View>
            </View>

            <View style={styles.reminderRow}>
              <Ionicons
                name={
                  nextAppointment.reminderMinutes !== null
                    ? "notifications"
                    : "notifications-off-outline"
                }
                size={13}
                color={
                  nextAppointment.reminderMinutes !== null
                    ? "#2F855A"
                    : "#9AA3AF"
                }
              />
              <Text style={styles.reminderText}>
                {nextAppointment.reminderMinutes !== null
                  ? `${t.family.reminderOn} · ${reminderLabel(
                      nextAppointment.reminderMinutes,
                      t,
                    )}`
                  : t.family.reminderOff}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyNext}>{t.family.noUpcoming}</Text>
        )}

        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => router.push("/family/appointments")}
        >
          <Ionicons name="calendar-outline" size={15} color="#4A5D45" />
          <Text style={styles.manageText}>
            {nextAppointment
              ? t.family.manageAppointments
              : t.family.bookAppointment}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/family/reports")}
      >
        <Text style={styles.buttonText}>{t.family.viewFullReport}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F4EF",
    padding: 18,
  },

  backButton: {
    marginBottom: 10,
  },

  active: {
    fontSize: 11,
    color: "#7A8A7A",
    letterSpacing: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2F3A2F",
    marginBottom: 15,
  },

  visitCard: {
    backgroundColor: "#EAF2EB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  visitTitle: {
    fontWeight: "600",
    color: "#243B2E",
  },

  visitSubtitle: {
    color: "#6F7F73",
    fontSize: 12,
    marginTop: 2,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
  },

  greenLine: {
    height: 3,
    backgroundColor: "#6A8D69",
    borderRadius: 20,
    marginBottom: 16,
  },

  patientRow: {
    flexDirection: "row",
    marginBottom: 18,
    alignItems: "center",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#8FE388",
    fontWeight: "700",
  },

  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#27352A",
  },

  info: {
    color: "#7C8C7D",
    fontSize: 12,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 11,
    color: "#8A8A8A",
    marginBottom: 12,
    letterSpacing: 1,
  },

  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    paddingVertical: 12,
  },

  label: {
    fontSize: 10,
    color: "#9A9A9A",
    letterSpacing: 1,
  },

  value: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginTop: 4,
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 30,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  nextCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },

  visitTime: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 6,
    color: "#222",
  },

  nurse: {
    flex: 1,
    color: "#666",
    fontSize: 13,
  },

  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },

  reminderText: {
    fontSize: 12,
    color: "#6F7F73",
    fontWeight: "500",
  },

  emptyNext: {
    fontSize: 14,
    color: "#9AA3AF",
    marginTop: 6,
  },

  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F4F6F2",
  },

  manageText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A5D45",
  },

  button: {
    backgroundColor: "#8DA684",
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});