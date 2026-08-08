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

export default function ExecutiveReports() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color="#D89A32" />
          </TouchableOpacity>

          <View>
            <Text style={styles.month}>JUNE 2026</Text>
            <Text style={styles.title}>Monthly report</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          
          <View style={styles.reportHeader}>
            <View>
              <Text style={styles.reportMonth}>June 2026</Text>
              <Text style={styles.doctor}>Dr. Haile Bekele</Text>
            </View>

            <TouchableOpacity>
              <Text style={styles.download}>Download PDF</Text>
            </TouchableOpacity>
          </View>

          
          <Text style={styles.sectionLabel}>BLOOD PANEL</Text>

          <View style={styles.bloodCard}>
            <LabResult
              label="KIDNEY FUNCTION"
              name="Creatinine"
              value="88 μmol/L"
              status="Normal"
              statusType="normal"
            />

            <LabResult
              label="LIVER ENZYMES"
              name="ALT"
              value="28 U/L"
              status="Normal"
              statusType="normal"
            />

            <LabResult
              label="LDL CHOLESTEROL"
              name="LDL cholesterol"
              value="3.8 mmol/L"
              status="Borderline"
              statusType="borderline"
            />

            <LabResult
              label="HBA1C"
              name="HbA1c"
              value="6.8%"
              status="Elevated"
              statusType="elevated"
              last
            />
          </View>

          
          <Text style={styles.sectionLabel}>VITAL TREND - 30 DAYS</Text>

          <View style={styles.trendCard}>
            <View style={styles.bars}>
              {[18, 20, 22, 24, 22, 21, 20, 18, 19, 20, 22, 24].map(
                (height, index) => (
                  <View
                    key={index}
                    style={[
                      styles.bar,
                      { height },
                      index >= 9 && styles.greenBar,
                    ]}
                  />
                )
              )}
            </View>

            <Text style={styles.trendText}>
              BP improving since medication adjustment. HR within target.
              {"\n"}
              Glucose monitoring ongoing.
            </Text>
          </View>

          
          <Text style={styles.sectionLabel}>NEXT STEPS</Text>

          <View style={styles.nextStepsCard}>
            <NextStep
              title="Blood panel due"
              date="1 July"
              color="#E58B39"
            />

            <NextStep title="Cardiac ECG" date="8 July" color="#668BC1" />

            <NextStep
              title="Executive review"
              date="15 July"
              color="#668BC1"
            />
          </View>

          <View style={{ height: 25 }} />
        </ScrollView>

        
        
      </View>
    </SafeAreaView>
  );
}



type LabResultProps = {
  label: string;
  name: string;
  value: string;
  status: string;
  statusType: "normal" | "borderline" | "elevated";
  last?: boolean;
};

function LabResult({
  label,
  name,
  value,
  status,
  statusType,
  last,
}: LabResultProps) {
  return (
    <View style={[styles.labRow, last && styles.lastLabRow]}>
      <View style={styles.labInfo}>
        <Text style={styles.labCategory}>{label}</Text>

        <Text style={styles.labValue}>
          {name} <Text style={styles.valueBold}>{value}</Text>
        </Text>
      </View>

      <View
        style={[
          styles.statusPill,
          statusType === "normal" && styles.normalPill,
          statusType === "borderline" && styles.borderlinePill,
          statusType === "elevated" && styles.elevatedPill,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            statusType === "normal" && styles.normalText,
            statusType === "borderline" && styles.borderlineText,
            statusType === "elevated" && styles.elevatedText,
          ]}
        >
          {status}
        </Text>
      </View>
    </View>
  );
}



function NextStep({
  title,
  date,
  color,
}: {
  title: string;
  date: string;
  color: string;
}) {
  return (
    <TouchableOpacity style={styles.nextStep}>
      <Text style={styles.nextStepTitle}>{title}</Text>

      <Text style={[styles.nextStepDate, { color }]}>{date}</Text>
    </TouchableOpacity>
  );
}

/* ---------------------------------- */
/* Bottom Navigation                  */
/* ---------------------------------- */




const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },

  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
  },

  backButton: {
    width: 24,
    marginRight: 4,
    alignItems: "flex-start",
  },

  month: {
    fontSize: 7,
    letterSpacing: 1,
    color: "#D08B32",
    fontWeight: "600",
    marginBottom: 2,
  },

  title: {
    fontSize: 17,
    color: "#162D4A",
    fontWeight: "700",
    fontFamily: "serif",
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },

  reportHeader: {
    backgroundColor: "#FFF5E4",
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  reportMonth: {
    fontSize: 8,
    color: "#D08B32",
    fontWeight: "600",
  },

  doctor: {
    fontSize: 7,
    color: "#8E8E8E",
    marginTop: 2,
  },

  download: {
    fontSize: 8,
    color: "#D88B27",
    fontWeight: "600",
  },

  sectionLabel: {
    fontSize: 7,
    letterSpacing: 1,
    color: "#88909A",
    marginBottom: 6,
    marginTop: 2,
  },

  bloodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 11,
    marginBottom: 12,
  },

  labRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  lastLabRow: {
    borderBottomWidth: 0,
  },

  labInfo: {
    flex: 1,
  },

  labCategory: {
    fontSize: 7,
    color: "#8A9198",
    letterSpacing: 0.5,
    marginBottom: 3,
  },

  labValue: {
    fontSize: 10,
    color: "#172A40",
  },

  valueBold: {
    fontWeight: "700",
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  normalPill: {
    backgroundColor: "#EAF7EE",
  },

  borderlinePill: {
    backgroundColor: "#FFF2DE",
  },

  elevatedPill: {
    backgroundColor: "#FFF0DF",
  },

  statusText: {
    fontSize: 7,
    fontWeight: "500",
  },

  normalText: {
    color: "#5F9B6E",
  },

  borderlineText: {
    color: "#D48935",
  },

  elevatedText: {
    color: "#D97D35",
  },

  trendCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
  },

  bars: {
    height: 29,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    marginBottom: 7,
  },

  bar: {
    flex: 1,
    backgroundColor: "#F1E3C7",
    borderRadius: 2,
    minWidth: 7,
  },

  greenBar: {
    backgroundColor: "#8DAF8E",
  },

  trendText: {
    fontSize: 7,
    lineHeight: 10,
    color: "#7C8389",
  },

  nextStepsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },

  nextStep: {
    minHeight: 43,
    paddingHorizontal: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  nextStepTitle: {
    fontSize: 8,
    color: "#26394C",
    fontWeight: "500",
  },

  nextStepDate: {
    fontSize: 8,
    fontWeight: "500",
  },

  bottomNav: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
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