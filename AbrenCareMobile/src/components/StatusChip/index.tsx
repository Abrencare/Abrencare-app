import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import colors from '@/theme/colors';
import spacing from '@/theme/spacing';
import typography from '@/theme/typography';

type StatusChipProps = {
  label: string;
  tone?: 'success' | 'warning' | 'danger';
};

export function StatusChip({ label, tone = 'success' }: StatusChipProps) {
  const toneColors = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  } as const;

  return (
    <View style={[styles.chip, { backgroundColor: `${toneColors[tone]}20` }]}> 
      <Text style={[styles.text, { color: toneColors[tone] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
});
