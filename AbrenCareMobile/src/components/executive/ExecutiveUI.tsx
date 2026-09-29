import React, { useMemo, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  useExecutiveTheme,
  type ExecutivePalette,
} from '@/theme/executiveTheme';

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useExecutiveTheme();
  const styles = useStyles(c);

  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const c = useExecutiveTheme();
  const styles = useStyles(c);

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {actionLabel ? (
        <Pressable style={styles.sectionAction} onPress={onAction}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={13} color={c.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ScreenHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  const c = useExecutiveTheme();
  const styles = useStyles(c);

  return (
    <View style={styles.screenHeader}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.screenSubtitle}>{subtitle}</Text>
    </View>
  );
}

export type PillTone = 'success' | 'accent' | 'danger' | 'neutral';

export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  const c = useExecutiveTheme();
  const styles = useStyles(c);

  const tones: Record<PillTone, { bg: string; fg: string }> = {
    success: { bg: c.successSoft, fg: c.success },
    accent: { bg: c.accentSoft, fg: c.accent },
    danger: { bg: c.dangerSoft, fg: c.danger },
    neutral: { bg: c.track, fg: c.muted },
  };

  return (
    <View style={[styles.pill, { backgroundColor: tones[tone].bg }]}>
      <Text style={[styles.pillText, { color: tones[tone].fg }]}>{label}</Text>
    </View>
  );
}

export function Ring({
  size,
  thickness,
  value,
  caption,
  color,
  track,
}: {
  size: number;
  thickness: number;
  value: string;
  caption?: string;
  color: string;
  track: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: thickness,
        borderColor: track,
        borderTopColor: color,
        borderRightColor: color,
        borderBottomColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.3,
          fontWeight: '700',
          color,
          lineHeight: size * 0.34,
        }}
      >
        {value}
      </Text>

      {caption ? (
        <Text style={{ fontSize: size * 0.11, color, opacity: 0.75 }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export function SegmentedBar({
  total,
  filled,
  color,
  track,
}: {
  total: number;
  filled: number;
  color: string;
  track: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: index < filled ? color : track,
          }}
        />
      ))}
    </View>
  );
}

export function Avatar({
  initials,
  tone,
  size = 44,
}: {
  initials: string;
  tone: 'accent' | 'success' | 'slate';
  size?: number;
}) {
  const c = useExecutiveTheme();

  const tones = {
    accent: { bg: c.accentSoft, fg: c.accent },
    success: { bg: c.successSoft, fg: c.success },
    slate: { bg: c.slateSoft, fg: c.slate },
  } as const;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: tones[tone].bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.34,
          fontWeight: '700',
          color: tones[tone].fg,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

function useStyles(c: ExecutivePalette) {
  return useMemo(() => createStyles(c), [c]);
}

function createStyles(c: ExecutivePalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 18,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.2,
    },
    sectionAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    sectionActionText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.accent,
    },
    screenHeader: {
      marginBottom: 20,
    },
    kicker: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.4,
      color: c.kicker,
      marginBottom: 6,
    },
    screenTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.6,
    },
    screenSubtitle: {
      fontSize: 13,
      color: c.muted,
      marginTop: 6,
      lineHeight: 19,
    },
    pill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    pillText: {
      fontSize: 10,
      fontWeight: '700',
    },
  });
}
