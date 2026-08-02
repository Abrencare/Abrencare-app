import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import colors from '@/theme/colors';
import spacing from '@/theme/spacing';
import typography from '@/theme/typography';

type CardProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ title, description, children, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {title ? <View style={styles.header}>{title ? <Text style={styles.title}>{title}</Text> : null}</View> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.subtext,
    marginBottom: spacing.sm,
  },
  content: {
    gap: spacing.sm,
  },
});
