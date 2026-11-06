import React, { memo, type ReactNode, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { withAlpha } from '@/components/executive/GlassCard';
import { useLandingType } from '@/theme/landingType';
import type { CareService } from '@/types/auth';

const HERO = {
  family: require('@/assets/images/stock-family-hero.jpg'),
  executive: require('@/assets/images/executive-hero-bg.jpg'),
  consultation: require('@/assets/images/stock-consultation-hero.jpg'),
};

const FILL: Record<CareService, string> = {
  family: '#1A3A32',
  executive: '#2B2318',
  consultation: '#243040',
};

const INK: Record<CareService, string> = {
  family: '#F4F6F3',
  executive: '#F8F4EC',
  consultation: '#F4F6F8',
};

const MUTED: Record<CareService, string> = {
  family: 'rgba(232, 237, 228, 0.84)',
  executive: 'rgba(248, 244, 236, 0.84)',
  consultation: 'rgba(244, 246, 248, 0.84)',
};

const KICKER: Record<CareService, string> = {
  family: '#C5D4C8',
  executive: '#E8D5A8',
  consultation: '#C5D0DC',
};

export const FLOW_CHIP = 'rgba(255,255,255,0.12)';
export const FLOW_CHIP_BORDER = 'rgba(255,255,255,0.22)';
export const FLOW_INK = INK;
export const FLOW_MUTED = MUTED;

type Props = {
  service: CareService;
  kicker?: string;
  title?: ReactNode;
  subtitle?: string;
  top?: ReactNode;
  extra?: ReactNode;
};

function FlowGlassHero({
  service,
  kicker,
  title,
  subtitle,
  top,
  extra,
}: Props) {
  const type = useLandingType(service);
  const insets = useSafeAreaInsets();

  // Keep the gradient definition stable between renders.
  const gradientColors = useMemo(
    () => [FILL[service], withAlpha(FILL[service], 0.94), withAlpha(FILL[service], 0.42)],
    [service],
  );

  return (
    <View style={[styles.hero, { paddingTop: insets.top + 12, backgroundColor: FILL[service] }]}>
      <Image source={HERO[service]} style={styles.photo} resizeMode="cover" fadeDuration={0} />
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.fade}
        pointerEvents="none"
      />
      {top}
      {kicker ? (
        <Text style={[styles.kicker, { fontFamily: type.sansSemi, color: KICKER[service] }]}>
          {kicker}
        </Text>
      ) : null}
      {title ? (
        <Text style={[styles.title, { fontFamily: type.display, color: INK[service] }]}>
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.subtitle, { fontFamily: type.sans, color: MUTED[service] }]}>
          {subtitle}
        </Text>
      ) : null}
      {extra}
    </View>
  );
}

export default memo(FlowGlassHero);

const styles = StyleSheet.create({
  hero: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingBottom: 52,
    overflow: 'hidden',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  fade: {
    ...StyleSheet.absoluteFillObject,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 320,
  },
});
