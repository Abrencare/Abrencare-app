import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/i18n/LanguageContext';
import colors from '@/theme/colors';
import spacing from '@/theme/spacing';

export function SettingsScreen() {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.settings.title}</Text>
      <Text style={styles.subtitle}>{t.settings.subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.subtext, marginTop: spacing.sm },
});
