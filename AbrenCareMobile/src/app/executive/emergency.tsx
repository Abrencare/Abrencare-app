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

export default function ExecutiveEmergency() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Emergency Header */}
        <View style={styles.emergencyHeader}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="chevron-back" size={14} color="#FFFFFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.activeRow}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>
              EMERGENCY RESPONSE ACTIVE
            </Text>
          </View>

          <Text style={styles.headerTitle}>
            Coordinator notified
          </Text>

          <Text style={styles.eta}>
            ETA 12 min
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* Response Timeline */}
          <Text style={styles.sectionLabel}>
            RESPONSE TIMELINE
          </Text>

          <View style={styles.timelineCard}>

            <TimelineItem
              text="Alert detected"
              time="14:03"
              status="completed"
            />

            <TimelineItem
              text="Dr. Bekele notified"
              time="14:03"
              status="completed"
            />

            <TimelineItem
              text="Coordinator dispatched"
              time="14:04"
              status="completed"
            />

            <TimelineItem
              text="Family notified"
              time=""
              status="progress"
              subText="In progress..."
            />

            <TimelineItem
              text="Hospital coordination"
              time="—"
              status="pending"
              last
            />

          </View>

          {/* Call Coordinator */}
          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons
              name="call-outline"
              size={14}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              Call coordinator now
            </Text>
          </TouchableOpacity>

          {/* Call Doctor */}
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons
              name="call-outline"
              size={14}
              color="#D89426"
            />

            <Text style={styles.secondaryButtonText}>
              Call Dr. Bekele
            </Text>
          </TouchableOpacity>

          {/* Protocol Status */}
          <Text style={styles.protocolText}>
            Emergency protocol activated · 14 June 2026, 14:03
          </Text>

        </ScrollView>

        {/* Bottom Navigation */}
        
      </View>
    </SafeAreaView>
  );
}

/* ================================= */
/* Timeline Item                     */
/* ================================= */

type TimelineItemProps = {
  text: string;
  time: string;
  status: "completed" | "progress" | "pending";
  subText?: string;
  last?: boolean;
};

function TimelineItem({
  text,
  time,
  status,
  subText,
  last,
}: TimelineItemProps) {
  return (
    <View style={[styles.timelineItem, last && styles.lastTimelineItem]}>

      {/* Timeline Indicator */}
      <View style={styles.indicatorContainer}>
        <View
          style={[
            styles.timelineDot,

            status === "completed" &&
              styles.completedDot,

            status === "progress" &&
              styles.progressDot,

            status === "pending" &&
              styles.pendingDot,
          ]}
        />

        {!last && <View style={styles.timelineLine} />}
      </View>

      {/* Content */}
      <View style={styles.timelineContent}>
        <Text
          style={[
            styles.timelineText,
            status === "pending" && styles.pendingText,
          ]}
        >
          {text}
        </Text>

        {subText && (
          <Text style={styles.timelineSubText}>
            {subText}
          </Text>
        )}
      </View>

      {/* Time */}
      <Text
        style={[
          styles.timelineTime,
          status === "pending" && styles.pendingTime,
        ]}
      >
        {time}
      </Text>

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
  /* Emergency Header                 */
  /* ------------------------------- */

  emergencyHeader: {
    backgroundColor: "#D94F52",
    paddingHorizontal: 13,
    paddingTop: 5,
    paddingBottom: 11,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    marginBottom: 8,
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 7,
    marginLeft: 1,
  },

  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 5,
  },

  activeText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "500",
    fontFamily: "serif",
    marginBottom: 2,
  },

  eta: {
    color: "#FFFFFF",
    fontSize: 8,
  },

  /* ------------------------------- */
  /* Content                          */
  /* ------------------------------- */

  scrollContent: {
    paddingHorizontal: 13,
    paddingTop: 20,
    paddingBottom: 90,
  },

  sectionLabel: {
    fontSize: 7,
    color: "#88909A",
    letterSpacing: 0.9,
    marginBottom: 7,
  },

  /* ------------------------------- */
  /* Timeline                         */
  /* ------------------------------- */

  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 10,
  },

  timelineItem: {
    minHeight: 31,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  lastTimelineItem: {
    borderBottomWidth: 0,
  },

  indicatorContainer: {
    width: 14,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  timelineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    zIndex: 2,
  },

  completedDot: {
    backgroundColor: "#5BA667",
  },

  progressDot: {
    backgroundColor: "#D9932E",
  },

  pendingDot: {
    backgroundColor: "#BDBDBD",
  },

  timelineLine: {
    position: "absolute",
    width: 1,
    height: 24,
    backgroundColor: "#E4E4E4",
    top: 20,
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 6,
  },

  timelineText: {
    fontSize: 8,
    color: "#26394C",
  },

  pendingText: {
    color: "#A2A2A2",
  },

  timelineSubText: {
    fontSize: 7,
    color: "#D9912C",
    marginTop: 1,
  },

  timelineTime: {
    fontSize: 7,
    color: "#62976B",
  },

  pendingTime: {
    color: "#B1B1B1",
  },

  /* ------------------------------- */
  /* Buttons                          */
  /* ------------------------------- */

  primaryButton: {
    height: 33,
    backgroundColor: "#D94F52",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
    marginLeft: 5,
  },

  secondaryButton: {
    height: 34,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9932E",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: "#D9932E",
    fontSize: 9,
    fontWeight: "500",
    marginLeft: 5,
  },

  /* ------------------------------- */
  /* Protocol                         */
  /* ------------------------------- */

  protocolText: {
    textAlign: "center",
    fontSize: 6.5,
    color: "#A5A5A5",
    marginTop: 9,
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