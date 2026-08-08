import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const reports = [
  {
    day: "14",
    date: "14 June",
    badge: "NEW",
    description: "AI good · ankle flag",
    status: "Flagged",
    statusColor: "#E66A6A",
    statusBg: "#FDECEC",
  },
  {
    day: "12",
    date: "12 June",
    description: "All vitals good",
    status: "Done",
    statusColor: "#5D9C59",
    statusBg: "#EEF8EC",
  },
  {
    day: "10",
    date: "10 June",
    description: "BP slightly elevated",
    status: "Note",
    statusColor: "#F2994A",
    statusBg: "#FFF3E8",
  },
  {
    day: "7",
    date: "7 June",
    description: "Blood results received",
    status: "Done",
    statusColor: "#5D9C59",
    statusBg: "#EEF8EC",
  },
  {
    day: "5",
    date: "5 June",
    description: "All vitals good",
    status: "Done",
    statusColor: "#5D9C59",
    statusBg: "#EEF8EC",
  },
  {
    day: "2",
    date: "2 June",
    description: "BP improving trend",
    status: "Done",
    statusColor: "#5D9C59",
    statusBg: "#EEF8EC",
  },
  {
    day: "28",
    date: "28 May",
    description: "Medication adjusted",
    status: "Note",
    statusColor: "#F2994A",
    statusBg: "#FFF3E8",
  },
];

export default function FamilyReports() {
  return (
    <View style={styles.container}>
      
      <TouchableOpacity style={styles.backButton}>
        <Ionicons name="chevron-back" size={22} color="#444" />
      </TouchableOpacity>

      <Text style={styles.patient}>ATO TADESSE</Text>
      <Text style={styles.title}>Report history</Text>

     
      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {reports.map((item, index) => (
            <View
              key={index}
              style={[
                styles.row,
                index !== reports.length - 1 && styles.separator,
              ]}
            >
              <View style={styles.dateBox}>
                <Text style={styles.day}>{item.day}</Text>
              </View>

              <View style={styles.reportInfo}>
                <View style={styles.dateRow}>
                  <Text style={styles.date}>{item.date}</Text>

                  {item.badge && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newText}>{item.badge}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.description}>{item.description}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: item.statusBg },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: item.statusColor },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Request new report</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F5F0",
    paddingHorizontal: 14,
    paddingTop: 55,
  },

  backButton: {
    marginBottom: 8,
  },

  patient: {
    fontSize: 10,
    color: "#8A8A8A",
    letterSpacing: 1,
    fontWeight: "600",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#27352A",
    marginBottom: 18,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flex: 1,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  separator: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  dateBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F4F4F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  day: {
    color: "#9B9B9B",
    fontWeight: "700",
    fontSize: 12,
  },

  reportInfo: {
    flex: 1,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  date: {
    fontWeight: "700",
    fontSize: 15,
    color: "#2D3748",
  },

  newBadge: {
    backgroundColor: "#FFE9C9",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },

  newText: {
    fontSize: 9,
    color: "#C97C00",
    fontWeight: "700",
  },

  description: {
    fontSize: 12,
    color: "#9AA3AF",
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  button: {
    backgroundColor: "#91A887",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
  },

  buttonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
});