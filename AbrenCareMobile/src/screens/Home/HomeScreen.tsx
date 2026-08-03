// src/screens/HomeScreen.tsx

import React from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from "react-native";

import Header from "@/Header/Header";
import HeroCard from "@/HeroCard/HeroCard";
import MetricCard from "@/MetricCard/MetricCard";
import ServiceCard from "@/ServiceCard/ServiceCard";
import DoctorCard from "@/DoctorCard/DoctorCard";
import BottomNavigation from "@/BottomNavigation/BottomNavigation";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* Header */}
        <Header />


        {/* Welcome Section */}
        <View style={styles.welcome}>
          <Text style={styles.title}>
            Good Morning 👋
          </Text>

          <Text style={styles.subtitle}>
            Monitor your health and stay safe
          </Text>
        </View>


        {/* Main Hero Card */}
        <HeroCard />


        {/* Health Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Health Overview
          </Text>

          <Text style={styles.view}>
            View all
          </Text>
        </View>


        <View style={styles.metrics}>

          <MetricCard
            title="Heart Rate"
            value="72"
            unit="BPM"
            icon="❤️"
          />

          <MetricCard
            title="Blood Pressure"
            value="120/80"
            unit="mmHg"
            icon="🩸"
          />

        </View>


        <View style={styles.metrics}>

          <MetricCard
            title="Temperature"
            value="36.5"
            unit="°C"
            icon="🌡️"
          />

          <MetricCard
            title="Steps"
            value="5,230"
            unit="steps"
            icon="🚶"
          />

        </View>



        {/* Services */}

        <Text style={styles.sectionTitle}>
          Our Services
        </Text>


        <ServiceCard
          title="Doctor Consultation"
          description="Talk with licensed doctors anytime"
          icon="👨‍⚕️"
        />


        <ServiceCard
          title="Caregiver Visit"
          description="Professional health monitoring"
          icon="🏥"
        />



        {/* Doctor */}

        <Text style={styles.sectionTitle}>
          Your Doctor
        </Text>


        <DoctorCard
          name="Dr. Hanna"
          specialty="Cardiologist"
          rating="4.9"
        />


      </ScrollView>


      {/* Bottom Navigation */}
      <BottomNavigation />

    </SafeAreaView>
  );
}



const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:"#F7F9FC",
  },


  content:{
    padding:20,
    paddingBottom:100,
  },


  welcome:{
    marginTop:15,
    marginBottom:20,
  },


  title:{
    fontSize:26,
    fontWeight:"700",
    color:"#111827",
  },


  subtitle:{
    marginTop:5,
    fontSize:15,
    color:"#6B7280",
  },


  sectionHeader:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    marginTop:25,
    marginBottom:15,
  },


  sectionTitle:{
    fontSize:20,
    fontWeight:"700",
    color:"#111827",
    marginTop:25,
    marginBottom:15,
  },


  view:{
    color:"#2563EB",
    fontSize:14,
  },


  metrics:{
    flexDirection:"row",
    justifyContent:"space-between",
    marginBottom:15,
  },

});