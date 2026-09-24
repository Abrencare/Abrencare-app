import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import colors from '@/theme/colors';
import spacing from '@/theme/spacing';
import typography from '@/theme/typography';

type HealthCardProps = {
  title: string;
  value: string;
  status?: string;
};

export function HealthCard({ title, value, status }: HealthCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: spacing.lg,
  },
  title: {
    ...typography.body,
    color: colors.subtext,
  },
  value: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.xs,
  },
  status: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.xs,
  },
});
