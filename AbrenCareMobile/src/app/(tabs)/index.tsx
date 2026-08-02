import React from 'react';
import { StyleSheet, Text, View, TextStyle, ViewStyle } from 'react-native';

import { Colors, Spacing, Fonts, Typography } from '@/constants/theme';
import Header from '@/components/Header/Header';

type HeaderProps = {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
};


// ADD THIS - Default export for the screen
export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <Header/>
      {/* Add your screen content here */}
    </View>
  );
}

const styles = StyleSheet.create<{
  container: ViewStyle;
  textContainer: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
}>({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...Typography.title as TextStyle,
    color: Colors.light.text,
  },
  subtitle: {
    ...Typography.subtitle as TextStyle,
    color: Colors.light.textSecondary,
    marginTop: Spacing.five,
  },
});