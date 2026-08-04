import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import styles from "./ServiceCard.styles";

type ServiceItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  category: string;
  description: string;
  features: string[];
  accentColor: string;
  iconBackground: string;
  tags?: string[];
  route: string; // Expo Router route path
};

type Props = {
  services?: ServiceItem[];
};

const defaultServices: ServiceItem[] = [
  {
    id: 'family',
    icon: 'people',
    title: 'Family care',
    category: 'FOR DIASPORA FAMILIES',
    description: 'Care visits, health monitoring and doctor consultations for your parent in Ethiopia.',
    features: ['Home visits', 'Vital monitoring', 'Lab tests', 'Dr. coordination'],
    accentColor: '#2F80ED',
    iconBackground: '#EAF6FF',
    tags: ['Home visits', 'Vital monitoring'],
    route: '/family-care' // Expo Router route
  },
  {
    id: 'executive',
    icon: 'medal',
    title: 'Executive health',
    category: 'FOR ETHIOPIAN LEADERS',
    description: 'Continuous monitoring, blood panels, cardiac screening and a dedicated personal physician.',
    features: ['Confidential', 'Blood panels', 'Cardiac ECG', 'Dedicated MD'],
    accentColor: '#8B5CF6',
    iconBackground: '#F3E8FF',
    tags: ['Confidential', 'Dedicated MD'],
    route: '/executive-health' // Expo Router route
  },
  {
    id: 'consultation',
    icon: 'videocam',
    title: 'See a doctor now',
    category: 'FOR ETHIOPIANS IN ETHIOPIA',
    description: 'Licensed doctor on video, in Amharic, within hours. No travel. Pay in ETB.',
    features: ['In Amharic', 'Video call', 'Pay in ETB', 'Licensed MDs'],
    accentColor: '#10B981',
    iconBackground: '#D1FAE5',
    tags: ['Video call', 'Licensed MDs'],
    route: '/consultation' // Expo Router route
  }
];

// Stats Section Component
const StatsSection = () => (
  <View style={styles.statsContainer}>
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>+500</Text>
      <Text style={styles.statLabel}>Families served</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>24/7</Text>
      <Text style={styles.statLabel}>Support available</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>16yr</Text>
      <Text style={styles.statLabel}>Gap closing</Text>
    </View>
  </View>
);

export default function ServiceCard({
  services = defaultServices,
}: Props) {
  const handlePress = (route: string) => {
    router.push(route); // Expo Router navigation
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>OUR SERVICES</Text>
      </View>

      {/* Service Cards */}
      {services.map((service) => (
        <TouchableOpacity
          key={service.id}
          activeOpacity={0.9}
          style={[styles.card, { borderLeftColor: service.accentColor }]}
          onPress={() => handlePress(service.route)}
        >
          <View style={styles.topRow}>
            <View style={[styles.iconBox, { backgroundColor: service.iconBackground }]}>
              <Ionicons name={service.icon} size={28} color={service.accentColor} />
            </View>

            <View style={styles.content}>
              <Text style={[styles.category, { color: service.accentColor }]}>
                {service.category}
              </Text>

              <Text style={styles.title}>{service.title}</Text>

              <Text style={styles.description}>{service.description}</Text>

              <View style={styles.features}>
                {service.features.map((feature) => (
                  <View key={feature} style={styles.featureItem}>
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color={service.accentColor} 
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.tags}>
                {service.tags?.map((tag) => (
                  <View 
                    key={tag} 
                    style={[styles.tag, { borderColor: service.accentColor + '40' }]}
                  >
                    <Text style={[styles.tagText, { color: service.accentColor }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color="#B7BDC7"
              style={styles.chevron}
            />
          </View>
        </TouchableOpacity>
      ))}

      {/* Stats Section */}
      <StatsSection />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Serving Ethiopian families across 3 continents
        </Text>
      </View>
    </ScrollView>
  );
}