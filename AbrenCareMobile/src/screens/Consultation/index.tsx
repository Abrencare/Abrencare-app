import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import colors from '@/theme/colors';
import spacing from '@/theme/spacing';

export function ConsultationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Consultation</Text>
      <Text style={styles.subtitle}>Book and manage appointments here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.subtext, marginTop: spacing.sm },
});
