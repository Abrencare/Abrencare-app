import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import colors from '@/theme/colors';
import spacing from '@/theme/spacing';
import typography from '@/theme/typography';

type HeaderProps = {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
};

export function Header({ title, subtitle, rightElement }: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement ? <View>{rightElement}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
});
