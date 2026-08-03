import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default function ConsultationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Consultation</Text>
      <Text style={styles.subtitle}>Access ongoing consultations and care guidance.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.subtitle,
  },
});
