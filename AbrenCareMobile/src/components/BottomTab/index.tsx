import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import colors from '@/theme/colors';
import spacing from '@/theme/spacing';
import typography from '@/theme/typography';

type BottomTabProps = {
  items: Array<{ label: string; active?: boolean; onPress?: () => void }>;
};

export function BottomTab({ items }: BottomTabProps) {
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <Pressable key={item.label} onPress={item.onPress} style={styles.item}>
          <Text style={[styles.label, item.active && styles.activeLabel]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  item: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.body,
    color: colors.subtext,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
});
