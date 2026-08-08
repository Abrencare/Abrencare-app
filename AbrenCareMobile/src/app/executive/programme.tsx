import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ExecutiveProgramme() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>EXECUTIVE HEALTH</Text>
          <Text style={styles.headerTitle}>My programme</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <SummaryCard
              number="6"
              label="Active items"
            />

            <SummaryCard
              number="2"
              label="Due soon"
            />

            <SummaryCard
              number="1"
              label="Booked"
            />
          </View>

          {/* Health Programme */}
          <Text style={styles.sectionLabel}>
            HEALTH PROGRAMME
          </Text>

          <View style={styles.programmeCard}>

            <ProgrammeItem
              title="Vital monitoring"
              subtitle="Daily · wearable active"
              status="On"
              statusType="active"
            />

            <ProgrammeItem
              title="Blood panel"
              subtitle="Next: 1 July 2026"
              status="Soon"
              statusType="soon"
            />

            <ProgrammeItem
              title="Cardiac ECG"
              subtitle="Booked: 8 July"
              status="Booked"
              statusType="booked"
            />

            <ProgrammeItem
              title="Full body scan"
              subtitle="Annual · Oct 2026"
              status="On track"
              statusType="track"
            />

            <ProgrammeItem
              title="Dental review"
              subtitle="Semi-annual · Sep 2026"
              status="On track"
              statusType="track"
            />

            <ProgrammeItem
              title="Eye screening"
              subtitle="Annual · Nov 2026"
              status="Scheduled"
              statusType="scheduled"
              last
            />

          </View>

          {/* Dedicated Physician */}
          <Text style={styles.sectionLabel}>
            DEDICATED PHYSICIAN
          </Text>

          <TouchableOpacity style={styles.doctorCard}>

            {/* Doctor Avatar */}
            <View style={styles.doctorAvatar}>
              <Text style={styles.avatarText}>DH</Text>
            </View>

            {/* Doctor Details */}
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>
                Dr. Haile Bekele
              </Text>

              <Text style={styles.doctorSubtitle}>
                Your physician · always available
              </Text>
            </View>

            {/* Ready Status */}
            <View style={styles.readyPill}>
              <Text style={styles.readyText}>
                Ready
              </Text>
            </View>

          </TouchableOpacity>

          <View style={{ height: 25 }} />

        </ScrollView>

        

      </View>
    </SafeAreaView>
  );
}

/* ================================= */
/* Summary Card                      */
/* ================================= */

function SummaryCard({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <View style={styles.summaryCard}>

      <Text style={styles.summaryNumber}>
        {number}
      </Text>

      <Text style={styles.summaryLabel}>
        {label}
      </Text>

    </View>
  );
}

/* ================================= */
/* Programme Item                    */
/* ================================= */

type ProgrammeItemProps = {
  title: string;
  subtitle: string;
  status: string;
  statusType:
    | "active"
    | "soon"
    | "booked"
    | "track"
    | "scheduled";
  last?: boolean;
};

function ProgrammeItem({
  title,
  subtitle,
  status,
  statusType,
  last,
}: ProgrammeItemProps) {
  return (
    <View
      style={[
        styles.programmeItem,
        last && styles.lastProgrammeItem,
      ]}
    >

      <View style={styles.programmeInfo}>

        <Text style={styles.programmeTitle}>
          {title}
        </Text>

        <Text style={styles.programmeSubtitle}>
          {subtitle}
        </Text>

      </View>

      <View
        style={[
          styles.statusPill,

          statusType === "active" &&
            styles.activePill,

          statusType === "soon" &&
            styles.soonPill,

          statusType === "booked" &&
            styles.bookedPill,

          statusType === "track" &&
            styles.trackPill,

          statusType === "scheduled" &&
            styles.scheduledPill,
        ]}
      >

        <Text
          style={[
            styles.statusText,

            statusType === "active" &&
              styles.activeText,

            statusType === "soon" &&
              styles.soonText,

            statusType === "booked" &&
              styles.bookedText,

            statusType === "track" &&
              styles.trackText,

            statusType === "scheduled" &&
              styles.scheduledText,
          ]}
        >
          {status}
        </Text>

      </View>

    </View>
  );
}

/* ================================= */
/* Bottom Navigation                 */
/* ================================= */


/* ================================= */
/* Styles                            */
/* ================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },

  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },

  /* ------------------------------- */
  /* Header                           */
  /* ------------------------------- */

  header: {
    paddingHorizontal: 13,
    paddingTop: 5,
    paddingBottom: 10,
  },

  headerLabel: {
    fontSize: 7,
    letterSpacing: 0.8,
    color: "#D9912C",
    fontWeight: "600",
    marginBottom: 2,
  },

  headerTitle: {
    fontSize: 17,
    color: "#172B42",
    fontWeight: "500",
    fontFamily: "serif",
  },

  /* ------------------------------- */
  /* Scroll                          */
  /* ------------------------------- */

  scrollContent: {
    paddingHorizontal: 11,
    paddingBottom: 80,
  },

  /* ------------------------------- */
  /* Summary Cards                   */
  /* ------------------------------- */

  summaryRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 12,
  },

  summaryCard: {
    flex: 1,
    height: 41,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryNumber: {
    fontSize: 11,
    color: "#D8912D",
    fontWeight: "500",
    marginBottom: 2,
  },

  summaryLabel: {
    fontSize: 6,
    color: "#929292",
  },

  /* ------------------------------- */
  /* Section Label                   */
  /* ------------------------------- */

  sectionLabel: {
    fontSize: 7,
    color: "#87909A",
    letterSpacing: 0.8,
    marginBottom: 7,
  },

  /* ------------------------------- */
  /* Programme Card                  */
  /* ------------------------------- */

  programmeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 11,
    marginBottom: 12,
  },

  programmeItem: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  lastProgrammeItem: {
    borderBottomWidth: 0,
  },

  programmeInfo: {
    flex: 1,
  },

  programmeTitle: {
    fontSize: 8,
    color: "#26394C",
    fontWeight: "500",
    marginBottom: 2,
  },

  programmeSubtitle: {
    fontSize: 6.5,
    color: "#929292",
  },

  /* ------------------------------- */
  /* Status Pills                    */
  /* ------------------------------- */

  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },

  statusText: {
    fontSize: 6,
    fontWeight: "500",
  },

  activePill: {
    backgroundColor: "#E8F5E9",
  },

  activeText: {
    color: "#599761",
  },

  soonPill: {
    backgroundColor: "#FFF1DC",
  },

  soonText: {
    color: "#D99335",
  },

  bookedPill: {
    backgroundColor: "#E9EFF9",
  },

  bookedText: {
    color: "#6884B5",
  },

  trackPill: {
    backgroundColor: "#E7F5EA",
  },

  trackText: {
    color: "#579560",
  },

  scheduledPill: {
    backgroundColor: "#E7F5EA",
  },

  scheduledText: {
    color: "#579560",
  },

  /* ------------------------------- */
  /* Doctor Card                     */
  /* ------------------------------- */

  doctorCard: {
    height: 45,
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
  },

  doctorAvatar: {
    width: 29,
    height: 29,
    borderRadius: 8,
    backgroundColor: "#202C35",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  avatarText: {
    color: "#D8912D",
    fontSize: 9,
    fontWeight: "700",
  },

  doctorInfo: {
    flex: 1,
  },

  doctorName: {
    fontSize: 8,
    color: "#26394C",
    fontWeight: "600",
    marginBottom: 2,
  },

  doctorSubtitle: {
    fontSize: 6.5,
    color: "#8E8E8E",
  },

  readyPill: {
    backgroundColor: "#E9EFF9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
  },

  readyText: {
    color: "#6681B1",
    fontSize: 6,
  },

  /* ------------------------------- */
  /* Bottom Navigation                */
  /* ------------------------------- */

  bottomNav: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 3,
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 55,
  },

  navLabel: {
    fontSize: 6,
    color: "#A5A5A5",
    marginTop: 3,
  },

  activeNavLabel: {
    color: "#D8912D",
    fontWeight: "600",
  },
});