import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function FamilyOverview() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <TouchableOpacity style={styles.backButton}>
        <Ionicons name="chevron-back" size={22} color="#4A5568" />
      </TouchableOpacity>

      <Text style={styles.active}>ACTIVE SERVICE</Text>
      <Text style={styles.title}>Family care</Text>

      {/* Visit Card */}
      <View style={styles.visitCard}>
        <View style={styles.row}>
          <Ionicons name="location" size={18} color="#2F855A" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.visitTitle}>Visit in progress</Text>
            <Text style={styles.visitSubtitle}>
              Nurse Meron Girma · GPS verified · arrived 10:02
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
              74 · Addis Ababa · active plan
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>LIVE READINGS</Text>

        {/* Blood Pressure */}
        <View style={styles.item}>
          <View>
            <Text style={styles.label}>BLOOD PRESSURE</Text>
            <Text style={styles.value}>128/82 mmHg</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: "#E6F4EA" }]}>
            <Text style={[styles.badgeText, { color: "#2F855A" }]}>
              Good
            </Text>
          </View>
        </View>

        {/* Medication */}
        <View style={styles.item}>
          <View>
            <Text style={styles.label}>MEDICATION</Text>
            <Text style={styles.value}>Morning dose</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: "#E6F4EA" }]}>
            <Text style={[styles.badgeText, { color: "#2F855A" }]}>
              Confirmed ✓
            </Text>
          </View>
        </View>

        {/* Blood Sample */}
        <View style={styles.item}>
          <View>
            <Text style={styles.label}>BLOOD SAMPLE</Text>
            <Text style={styles.value}>Taken</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: "#E8EEFF" }]}>
            <Text style={[styles.badgeText, { color: "#556CD6" }]}>
              Sent to lab
            </Text>
          </View>
        </View>

        {/* Swelling */}
        <View style={styles.item}>
          <View>
            <Text style={styles.label}>ANKLE SWELLING</Text>
            <Text style={styles.value}>Left foot</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: "#FFE8E8" }]}>
            <Text style={[styles.badgeText, { color: "#D64545" }]}>
              Flagged
            </Text>
          </View>
        </View>
      </View>

      {/* Next Visit */}
      <View style={styles.nextCard}>
        <Text style={styles.label}>NEXT VISIT</Text>

        <Text style={styles.visitTime}>
          Thursday · 10:00 AM
        </Text>

        <View style={styles.row}>
          <Text style={styles.nurse}>Nurse Meron Girma</Text>

          <View style={[styles.badge, { backgroundColor: "#EEF7E9" }]}>
            <Text style={[styles.badgeText, { color: "#6B8E55" }]}>
              Booked
            </Text>
          </View>
        </View>
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>View full report</Text>
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