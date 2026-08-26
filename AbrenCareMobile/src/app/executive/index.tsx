import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ExecutiveOverview() {
  const { t } = useLanguage();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.smallTitle}>{t.executive.confidential}</Text>
      <Text style={styles.title}>{t.executive.title}</Text>

      {/* Alert */}
      <View style={styles.alertCard}>
        <View style={styles.alertRow}>
          <View style={styles.dot} />

          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>
              {t.executive.alertTitle}
            </Text>

            <Text style={styles.alertSubtitle}>
              {t.executive.alertSubtitle}
            </Text>
          </View>
        </View>
      </View>

      {/* Health Card */}
      <View style={styles.card}>
        <View style={styles.item}>
          <View>
            <Text style={styles.label}>{t.executive.bloodPressure}</Text>
            <Text style={styles.value}>158/96 mmHg</Text>
          </View>

          <View style={[styles.badge, styles.red]}>
            <Text style={styles.redText}>{t.executive.high}</Text>
          </View>
        </View>

        <View style={styles.item}>
          <View>
            <Text style={styles.label}>{t.executive.heartRate}</Text>
            <Text style={styles.value}>91 bpm</Text>
          </View>

          <View style={[styles.badge, styles.orange]}>
            <Text style={styles.orangeText}>{t.executive.elevated}</Text>
          </View>
        </View>

        <View style={styles.item}>
          <View>
            <Text style={styles.label}>{t.executive.oxygen}</Text>
            <Text style={styles.value}>97%</Text>
          </View>

          <View style={[styles.badge, styles.green]}>
            <Text style={styles.greenText}>{t.executive.normal}</Text>
          </View>
        </View>

        <View style={styles.itemLast}>
          <View>
            <Text style={styles.label}>{t.executive.glucose}</Text>
            <Text style={styles.value}>7.4 mmol/L</Text>
          </View>

          <View style={[styles.badge, styles.orange]}>
            <Text style={styles.orangeText}>{t.executive.watch}</Text>
          </View>
        </View>
      </View>

      {/* Physician */}
      <Text style={styles.sectionTitle}>{t.executive.yourPhysician}</Text>

      <View style={styles.doctorCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>DH</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.doctorName}>
            Dr. Haile Bekele
          </Text>

          <Text style={styles.specialty}>
            {t.executive.specialty}
          </Text>
        </View>

        <View style={styles.readyBadge}>
          <Text style={styles.readyText}>{t.executive.ready}</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.primaryButton}>
          <Ionicons
            name="call-outline"
            size={18}
            color="white"
          />

          <Text style={styles.primaryText}>
            {t.executive.callDoctor}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>
            {t.executive.monthlyReport}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.emergencyButton}>
        <Ionicons
          name="warning-outline"
          size={16}
          color="#D9534F"
        />

        <Text style={styles.emergencyText}>
          {t.executive.emergencyProtocol}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F5F0",
    padding: 16,
  },

  smallTitle: {
    color: "#C28A1D",
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "600",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#2D2D2D",
    marginBottom: 14,
  },

  alertCard: {
    backgroundColor: "#FFF6EC",
    borderWidth: 1,
    borderColor: "#F0C37A",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },

  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E59C2D",
    marginTop: 5,
    marginRight: 10,
  },

  alertTitle: {
    fontWeight: "700",
    color: "#4A3A23",
    fontSize: 13,
  },

  alertSubtitle: {
    color: "#8A7254",
    fontSize: 11,
    marginTop: 3,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 18,
    marginBottom: 20,
  },

  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },

  itemLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },

  label: {
    color: "#A0A0A0",
    fontSize: 10,
    letterSpacing: 1,
  },

  value: {
    marginTop: 5,
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },

  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  red: {
    backgroundColor: "#FFE7E7",
  },

  redText: {
    color: "#D9534F",
    fontWeight: "600",
    fontSize: 11,
  },

  orange: {
    backgroundColor: "#FFF2E3",
  },

  orangeText: {
    color: "#E59C2D",
    fontWeight: "600",
    fontSize: 11,
  },

  green: {
    backgroundColor: "#EAF6EA",
  },

  greenText: {
    color: "#57A35A",
    fontWeight: "600",
    fontSize: 11,
  },

  sectionTitle: {
    color: "#9A9A9A",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
  },

  doctorCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 18,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#D7A64A",
    fontWeight: "700",
  },

  doctorName: {
    fontWeight: "700",
    color: "#1F2937",
  },

  specialty: {
    marginTop: 3,
    fontSize: 12,
    color: "#8A8A8A",
  },

  readyBadge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  readyText: {
    color: "#7C8CD6",
    fontSize: 11,
    fontWeight: "600",
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  primaryButton: {
    flex: 1,
    height: 54,
    backgroundColor: "#D79A24",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  primaryText: {
    color: "#FFF",
    fontWeight: "700",
    marginLeft: 6,
  },

  secondaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D79A24",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    backgroundColor: "#FFF",
  },

  secondaryText: {
    color: "#D79A24",
    fontWeight: "700",
  },

  emergencyButton: {
    height: 48,
    backgroundColor: "#FDECEC",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 30,
  },

  emergencyText: {
    color: "#D9534F",
    fontWeight: "600",
    marginLeft: 6,
  },
});