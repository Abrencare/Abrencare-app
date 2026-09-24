import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

type Props = {
  title: string;
  subtitle: string;
  highlight?: string;
  details?: string;
};

export default function SectionPage({ title, subtitle, highlight, details }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {highlight ? <Text style={styles.highlight}>{highlight}</Text> : null}
      {details ? <Text style={styles.details}>{details}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.light.background,
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 22,
    lineHeight: 24,
  },
  highlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 14,
  },
  details: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
});