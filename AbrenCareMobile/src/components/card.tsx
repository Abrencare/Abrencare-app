import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type CardProps = {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ title, description, children, footer, style }: CardProps) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {(title || description) && (
        <ThemedView style={styles.header}>
          {title ? (
            <ThemedText type="smallBold" style={styles.title}>
              {title}
            </ThemedText>
          ) : null}
          {description ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
              {description}
            </ThemedText>
          ) : null}
        </ThemedView>
      )}

      {children ? <ThemedView style={styles.content}>{children}</ThemedView> : null}
      {footer ? <ThemedView style={styles.footer}>{footer}</ThemedView> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  header: {
    gap: Spacing.half,
  },
  title: {
    fontSize: 18,
  },
  description: {
    lineHeight: 22,
  },
  content: {
    gap: Spacing.two,
  },
  footer: {
    marginTop: Spacing.half,
  },
});
