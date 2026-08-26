import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ConsultationOverview() {
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>
            {t.consultation.headerLabel}
          </Text>

          <Text style={styles.headerTitle}>
            {t.consultation.title}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* Specialty */}
          <Text style={styles.sectionLabel}>
            {t.consultation.chooseSpecialty}
          </Text>

          <View style={styles.specialtyGrid}>
            <SpecialtyButton title={t.consultation.general} />
            <SpecialtyButton title={t.consultation.cardiology} selected />
            <SpecialtyButton title={t.consultation.paediatrics} />
            <SpecialtyButton title={t.consultation.neurology} />
            <SpecialtyButton title={t.consultation.diabetes} />
            <SpecialtyButton title={t.consultation.respiratory} />
          </View>

          {/* Available Doctor */}
          <Text style={styles.sectionLabel}>
            {t.consultation.availableDoctor}
          </Text>

          <TouchableOpacity style={styles.doctorCard}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.avatarText}>
                DH
              </Text>
            </View>

            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>
                Dr. Haile Bekele
              </Text>

              <Text style={styles.doctorDetails}>
                {t.consultation.doctorDetails}
              </Text>
            </View>

            <View style={styles.availablePill}>
              <Text style={styles.availableText}>
                {t.consultation.available}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Time */}
          <Text style={styles.sectionLabel}>
            {t.consultation.selectTime}
          </Text>

          <View style={styles.timeGrid}>
            <TimeButton title="9:00" />
            <TimeButton title="10:00" selected />
            <TimeButton title="11:00" />
            <TimeButton title="1:00" />
            <TimeButton title="2:00" />
            <TimeButton title="3:00" />
          </View>

          {/* Confirm */}
          <TouchableOpacity style={styles.confirmButton}>
            <Text style={styles.confirmText}>
              {t.consultation.confirm}
            </Text>
          </TouchableOpacity>

          {/* Consultation Info */}
          <Text style={styles.infoText}>
            {t.consultation.info}
          </Text>

          <View style={{ height: 25 }} />

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ================================= */
/* Specialty Button                  */
/* ================================= */

function SpecialtyButton({
  title,
  selected = false,
}: {
  title: string;
  selected?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.specialtyButton,
        selected && styles.selectedSpecialty,
      ]}
    >
      <Text
        style={[
          styles.specialtyText,
          selected && styles.selectedSpecialtyText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/* ================================= */
/* Time Button                       */
/* ================================= */

function TimeButton({
  title,
  selected = false,
}: {
  title: string;
  selected?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.timeButton,
        selected && styles.selectedTime,
      ]}
    >
      <Text
        style={[
          styles.timeText,
          selected && styles.selectedTimeText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },

  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },

  /* Header */
  header: {
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 10,
  },

  headerLabel: {
    fontSize: 7,
    letterSpacing: 0.8,
    color: "#6E88B8",
    fontWeight: "600",
    marginBottom: 2,
  },

  headerTitle: {
    fontSize: 17,
    color: "#172B42",
    fontWeight: "500",
    fontFamily: "serif",
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 80,
  },

  /* Section labels */
  sectionLabel: {
    fontSize: 7,
    color: "#8A929B",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 1,
  },

  /* Specialty */
  specialtyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 11,
  },

  specialtyButton: {
    width: "31.8%",
    height: 23,
    backgroundColor: "#EAF0F7",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedSpecialty: {
    backgroundColor: "#6F89B9",
  },

  specialtyText: {
    fontSize: 6.5,
    color: "#34475D",
  },

  selectedSpecialtyText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },

  /* Doctor */
  doctorCard: {
    height: 47,
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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

  doctorDetails: {
    fontSize: 6.5,
    color: "#8D9297",
  },

  availablePill: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
  },

  availableText: {
    fontSize: 6,
    color: "#5A9964",
  },

  /* Time */
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 11,
  },

  timeButton: {
    width: "31.8%",
    height: 27,
    backgroundColor: "#EAF0F7",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedTime: {
    backgroundColor: "#6F89B9",
  },

  timeText: {
    fontSize: 7,
    color: "#34475D",
  },

  selectedTimeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  /* Confirm */
  confirmButton: {
    height: 33,
    backgroundColor: "#6F89B9",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
  },

  infoText: {
    textAlign: "center",
    color: "#A4A4A4",
    fontSize: 6,
    marginTop: 7,
  },
});