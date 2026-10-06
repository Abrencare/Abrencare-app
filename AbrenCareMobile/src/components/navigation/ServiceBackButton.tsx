import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useLanguage } from '@/context/LanguageContext';

type Props = {
  /** Icon colour; pass the hero text colour on dark headers. */
  color: string;
  /** Screens that theme through a stylesheet can pass `style` instead. */
  background?: string;
  borderColor?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Leaves a service dashboard and returns to the service picker. `replace` keeps
 * the history clean: the dashboard is a destination, not a step in a flow.
 */
export default function ServiceBackButton({
  color,
  background,
  borderColor,
  size = 34,
  style,
}: Props) {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.common.back}
      hitSlop={8}
      onPress={() => router.replace('/(tabs)')}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 2.8),
          backgroundColor: background ?? 'transparent',
          borderColor: borderColor ?? 'transparent',
        },
        style,
      ]}
    >
      <Ionicons name="chevron-back" size={Math.round(size * 0.58)} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
