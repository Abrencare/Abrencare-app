import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

type StatusBadgeProps = {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
};

const toneColors: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  success: Colors.success,
  warning: Colors.warning,
  danger: Colors.danger,
  neutral: Colors.subtitle,
};

export default function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: `${toneColors[tone]}20` }]}> 
      <Text style={[styles.text, { color: toneColors[tone] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
});
