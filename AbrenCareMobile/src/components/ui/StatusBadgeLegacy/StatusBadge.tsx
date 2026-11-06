import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type StatusBadgeProps = {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
};

const toneColors: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  success: '#5E8A63',
  warning: '#C4A05A',
  danger: '#C2453A',
  neutral: '#60646C',
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
    color: '#000000',
    fontWeight: '600',
    fontSize: 12,
  },
});
