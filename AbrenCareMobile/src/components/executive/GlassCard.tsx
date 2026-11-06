import React, { memo, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const glassBlur: ViewStyle =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(8px) saturate(1.05)',
        WebkitBackdropFilter: 'blur(8px) saturate(1.05)',
      } as ViewStyle)
    : {};

const WEB_GLASS = glassBlur;

export function glassField(isDark: boolean) {
  const tints = glassTints(isDark);
  return {
    backgroundColor: tints.well,
    borderColor: tints.wellBorder,
    borderWidth: 1,
  };
}

export function glassShadow(service: 'executive' | 'family' | 'consultation' = 'executive') {
  if (service === 'family') return '#16332C';
  if (service === 'consultation') return '#243040';
  return '#6B5A3D';
}

export function glassTints(
  isDark: boolean,
  service: 'executive' | 'family' | 'consultation' = 'executive',
) {
  if (service === 'consultation') {
    return {
      sheen: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.12)',
      border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(221, 227, 234, 0.98)',
      card: isDark ? 'rgba(22, 30, 38, 0.98)' : 'rgba(255, 255, 255, 0.98)',
      update: isDark ? 'rgba(36, 48, 64, 0.92)' : 'rgba(236, 241, 246, 0.96)',
      attention: isDark ? 'rgba(72, 40, 36, 0.9)' : 'rgba(255, 246, 240, 0.96)',
      well: isDark ? 'rgba(30, 38, 46, 0.98)' : 'rgba(255,255,255,0.98)',
      wellBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(221, 227, 234, 0.98)',
    };
  }

  if (service === 'family') {
    return {
      sheen: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.12)',
      border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(220, 230, 224, 0.98)',
      card: isDark ? 'rgba(22, 30, 27, 0.98)' : 'rgba(255, 255, 255, 0.98)',
      update: isDark ? 'rgba(46, 72, 52, 0.9)' : 'rgba(236, 242, 234, 0.96)',
      attention: isDark ? 'rgba(72, 40, 36, 0.9)' : 'rgba(255, 246, 240, 0.96)',
      well: isDark ? 'rgba(30, 40, 36, 0.98)' : 'rgba(255,255,255,0.98)',
      wellBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(220, 230, 224, 0.98)',
    };
  }

  return {
    sheen: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.12)',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(232, 224, 212, 0.98)',
    card: isDark ? 'rgba(28, 24, 18, 0.98)' : 'rgba(255, 253, 248, 0.98)',
    update: isDark ? 'rgba(46, 72, 52, 0.9)' : 'rgba(240, 244, 234, 0.96)',
    attention: isDark ? 'rgba(72, 40, 36, 0.9)' : 'rgba(255, 246, 240, 0.96)',
    well: isDark ? 'rgba(36, 32, 26, 0.98)' : 'rgba(255,255,255,0.98)',
    wellBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(232, 224, 212, 0.98)',
  };
}

type GlassCardProps = {
  children: ReactNode;
  tint: string;
  border: string;
  sheen: string;
  shadowColor?: string;
  clip?: boolean;
  style?: StyleProp<ViewStyle>;
};

const GlassCard = memo(function GlassCard({
  children,
  tint,
  border,
  sheen,
  shadowColor = '#6B5A3D',
  clip = true,
  style,
}: GlassCardProps) {
  return (
    <View style={[shell(tint, border, shadowColor, clip), style]}>
      <View style={styles.sheenClip} pointerEvents="none">
        <LinearGradient
          colors={[sheen, 'rgba(255,255,255,0.015)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {children}
    </View>
  );
});

export { GlassCard };
export default GlassCard;

export function withAlpha(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shell(
  tint: string,
  border: string,
  shadowColor: string,
  clip: boolean,
): ViewStyle {
  return {
    backgroundColor: tint,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: border,
    padding: 16,
    overflow: clip ? 'hidden' : 'visible',
    // Softer shadow: large native shadows are expensive during scrolling.
    shadowColor,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.OS === 'android' ? 2 : 0,
    ...WEB_GLASS,
  };
}

const styles = StyleSheet.create({
  sheenClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 26,
  },
});
