import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from './ServiceCard.styles';

type ServiceCardProps = {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  icon: keyof typeof Ionicons.glyphMap;
  bgColor?: string;
};

export function ServiceCard({
  title,
  subtitle,
  description,
  features,
  icon,
  bgColor = '#E8F5E9',
}: ServiceCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}> 
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color="#2C3E50" />
        </View>
        <Text style={styles.tag}>{title}</Text>
      </View>

      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.featuresContainer}>
        {features.map((feature) => (
          <View key={feature} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Learn More →</Text>
      </TouchableOpacity>
    </View>
  );
}
