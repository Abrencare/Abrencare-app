import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ConsultationProfile() {
  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <TouchableOpacity style={styles.backButton}>
        <Ionicons name="chevron-back" size={22} color="#4A5568" />
      </TouchableOpacity>

      <Text style={styles.smallTitle}>ACCOUNT</Text>
      <Text style={styles.title}>Profile</Text>

      {/* User Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AT</Text>
        </View>

        <Text style={styles.name}>Ato Tadesse</Text>

        <Text style={styles.subtitle}>
          Family Care Member
        </Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Active Plan</Text>
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>

        <View style={styles.row}>
          <Ionicons name="person-outline" size={20} color="#8AA07D" />
          <View style={styles.info}>
            <Text style={styles.label}>Full Name</Text>
            <Text style={styles.value}>Ato Tadesse</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={20} color="#8AA07D" />
          <View style={styles.info}>
            <Text style={styles.label}>Age</Text>
            <Text style={styles.value}>74 Years</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.row}>
          <Ionicons name="location-outline" size={20} color="#8AA07D" />
          <View style={styles.info}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>Addis Ababa</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.row}>
          <Ionicons name="call-outline" size={20} color="#8AA07D" />
          <View style={styles.info}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>+251 91 234 5678</Text>
          </View>
        </View>
      </View>

      {/* Emergency Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EMERGENCY CONTACT</Text>

        <View style={styles.row}>
          <Ionicons name="people-outline" size={20} color="#8AA07D" />
          <View style={styles.info}>
            <Text style={styles.label}>Coordinator</Text>
            <Text style={styles.value}>Marta Tesfaye</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.row}>
          <Ionicons name="medkit-outline" size={20} color="#8AA07D" />
          <View style={styles.info}>
            <Text style={styles.label}>Assigned Nurse</Text>
            <Text style={styles.value}>Meron Girma</Text>
          </View>
        </View>
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.primaryButton}>
        <Text style={styles.primaryText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Manage Account</Text>
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
    color: "#27352A",
    marginBottom: 18,
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    alignItems: "center",
    padding: 22,
    marginBottom: 18,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#9BE38C",
    fontWeight: "700",
    fontSize: 22,
  },

  name: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "700",
    color: "#27352A",
  },

  subtitle: {
    color: "#8A8A8A",
    marginTop: 4,
  },

  statusBadge: {
    marginTop: 14,
    backgroundColor: "#EAF4E8",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    color: "#5D9C59",
    fontWeight: "600",
    fontSize: 12,
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
    color: "#27352A",
  },

  separator: {
    height: 1,
    backgroundColor: "#EEEEEE",
  },

  primaryButton: {
    backgroundColor: "#8FA585",
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
    marginBottom: 30,
  },

  secondaryText: {
    color: "#27352A",
    fontWeight: "600",
    fontSize: 15,
  },
});