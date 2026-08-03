import { StyleSheet } from 'react-native';

import { Colors } from '@/theme/colors';
import { Spacing } from '@/theme/spacing';
import typography from '@/theme/typography';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  item: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  label: {
    ...typography.body,
    color: Colors.subtitle,
  },
  activeLabel: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
