import React, { memo, type ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLandingType } from '@/theme/landingType';
import type { CareService } from '@/types/auth';

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
  const { width: windowWidth } = useWindowDimensions();
  const isPhone = windowWidth < 430;

  return (
    <View
      style={[
        styles.hero,
        isPhone && styles.heroPhone,
        { paddingTop: insets.top + (isPhone ? 8 : 12), backgroundColor: FILL[service] },
      ]}
    >
      {top}
      {kicker ? (
        <Text style={[styles.kicker, { fontFamily: type.sansSemi, color: KICKER[service] }]}>
          {kicker}
        </Text>
      ) : null}
      {title ? (
        <Text
          style={[
            styles.title,
            isPhone && styles.titlePhone,
            { fontFamily: type.display, color: INK[service] },
          ]}
        >
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            isPhone && styles.subtitlePhone,
            { fontFamily: type.sans, color: MUTED[service] },
          ]}
        >
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
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 52,
    overflow: 'hidden',
  },
  heroPhone: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
  titlePhone: {
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 320,
  },
  subtitlePhone: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: '100%',
  },
});
