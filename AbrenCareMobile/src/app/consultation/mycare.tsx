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

export default function ConsultationMyCare() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>
            DIGITAL CONSULTATION
          </Text>

          <Text style={styles.headerTitle}>
            My consultations
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          
          <View style={styles.consultationCard}>

            <ConsultationItem
              initials="HA"
              doctor="Dr. Haile"
              date="14 June"
              specialty="Cardiology · hypertension"
              status="Report"
              statusType="report"
            />

            <ConsultationItem
              initials="SA"
              doctor="Dr. Sara"
              date="2 June"
              specialty="Paediatrics · child fever"
              status="Done"
              statusType="done"
            />

            <ConsultationItem
              initials="ME"
              doctor="Dr. Mekdes"
              date="20 May"
              specialty="General · prescription renewal"
              status="Done"
              statusType="done"
            />

            <ConsultationItem
              initials="HA"
              doctor="Dr. Haile"
              date="5 May"
              specialty="Cardiology · initial assessment"
              status="Done"
              statusType="done"
              last
            />

          </View>

          
          <TouchableOpacity style={styles.newConsultationButton}>
            <Text style={styles.newConsultationText}>
              Book new consultation
            </Text>
          </TouchableOpacity>

          <View style={{ height: 25 }} />

        </ScrollView>

        {/* Bottom Navigation */}
        

      </View>
    </SafeAreaView>
  );
}



type ConsultationItemProps = {
  initials: string;
  doctor: string;
  date: string;
  specialty: string;
  status: string;
  statusType: "report" | "done";
  last?: boolean;
};

function ConsultationItem({
  initials,
  doctor,
  date,
  specialty,
  status,
  statusType,
  last,
}: ConsultationItemProps) {
  return (
    <View
      style={[
        styles.consultationItem,
        last && styles.lastConsultationItem,
      ]}
    >

      
      <View style={styles.doctorAvatar}>
        <Text style={styles.avatarText}>
          {initials}
        </Text>
      </View>

      {/* Doctor Information */}
      <View style={styles.consultationInfo}>

        <View style={styles.doctorNameRow}>
          <Text style={styles.doctorName}>
            {doctor}
          </Text>

          <Text style={styles.date}>
            · {date}
          </Text>
        </View>

        <Text style={styles.specialty}>
          {specialty}
        </Text>

      </View>

      
      <View
        style={[
          styles.statusPill,
          statusType === "report"
            ? styles.reportPill
            : styles.donePill,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            statusType === "report"
              ? styles.reportText
              : styles.doneText,
          ]}
        >
          {status}
        </Text>
      </View>

    </View>
  );
}



function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.navItem}>

      <Ionicons
        name={icon}
        size={17}
        color={active ? "#6F89B9" : "#A5A5A5"}
      />

      <Text
        style={[
          styles.navLabel,
          active && styles.activeNavLabel,
        ]}
      >
        {label}
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
    paddingHorizontal: 14,
    paddingTop: 5,
    paddingBottom: 10,
  },

  headerLabel: {
    fontSize: 7,
    letterSpacing: 0.8,
    color: "#6F89B9",
    fontWeight: "600",
    marginBottom: 2,
  },

  headerTitle: {
    fontSize: 17,
    color: "#172B42",
    fontWeight: "500",
    fontFamily: "serif",
  },

  /* Content */
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 80,
  },

  /* Consultation Card */
  consultationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    paddingHorizontal: 11,
    marginBottom: 11,
  },

  consultationItem: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  lastConsultationItem: {
    borderBottomWidth: 0,
  },

  /* Avatar */
  doctorAvatar: {
    width: 29,
    height: 29,
    borderRadius: 8,
    backgroundColor: "#202B35",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "600",
  },

  /* Doctor Information */
  consultationInfo: {
    flex: 1,
    justifyContent: "center",
  },

  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },

  doctorName: {
    fontSize: 8,
    color: "#26394C",
    fontWeight: "600",
  },

  date: {
    fontSize: 6,
    color: "#9A9A9A",
    marginLeft: 3,
  },

  specialty: {
    fontSize: 6.5,
    color: "#8B9095",
  },

 
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
    marginLeft: 5,
  },

  reportPill: {
    backgroundColor: "#FFF0DD",
  },

  donePill: {
    backgroundColor: "#E7F5E9",
  },

  statusText: {
    fontSize: 6,
    fontWeight: "500",
  },

  reportText: {
    color: "#D58A32",
  },

  doneText: {
    color: "#579561",
  },

  
  newConsultationButton: {
    height: 33,
    backgroundColor: "#6F89B9",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  newConsultationText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
  },

  /* Bottom Navigation */
  

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
    color: "#6F89B9",
    fontWeight: "600",
  },
});