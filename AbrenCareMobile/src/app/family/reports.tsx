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

const reportMeta = [
  { day: "14", status: "flagged" as const, badge: true },
  { day: "12", status: "done" as const, badge: false },
  { day: "10", status: "note" as const, badge: false },
  { day: "7", status: "done" as const, badge: false },
  { day: "5", status: "done" as const, badge: false },
  { day: "2", status: "done" as const, badge: false },
  { day: "28", status: "note" as const, badge: false },
];

export default function FamilyReports() {
  const { t } = useLanguage();

  const statusStyles = {
    flagged: {
      color: "#E66A6A",
      bg: "#FDECEC",
      label: t.familyReports.flagged,
    },
    done: {
      color: "#5D9C59",
      bg: "#EEF8EC",
      label: t.familyReports.done,
    },
    note: {
      color: "#F2994A",
      bg: "#FFF3E8",
      label: t.familyReports.note,
    },
  };

  return (
    <View style={styles.container}>
      
      <TouchableOpacity style={styles.backButton}>
        <Ionicons name="chevron-back" size={22} color="#444" />
      </TouchableOpacity>

      <Text style={styles.patient}>ATO TADESSE</Text>
      <Text style={styles.title}>{t.familyReports.title}</Text>

     
      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {reportMeta.map((item, index) => {
            const copy = t.familyReports.items[index];
            if (!copy) {
              return null;
            }
            const status = statusStyles[item.status];

            return (
            <View
              key={index}
              style={[
                styles.row,
                index !== reportMeta.length - 1 && styles.separator,
              ]}
            >
              <View style={styles.dateBox}>
                <Text style={styles.day}>{item.day}</Text>
              </View>

              <View style={styles.reportInfo}>
                <View style={styles.dateRow}>
                  <Text style={styles.date}>{copy.date}</Text>

                  {item.badge && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newText}>{t.familyReports.badgeNew}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.description}>{copy.description}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: status.bg },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: status.color },
                  ]}
                >
                  {status.label}
                </Text>
              </View>
            </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>{t.familyReports.requestNew}</Text>
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