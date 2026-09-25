import { useMemo } from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/context/ThemeContext';

type StyleValue = ViewStyle | TextStyle;

const PAGE = '#0E1412';
const CARD = '#1A221F';
const TEXT = '#F1F5F3';
const MUTED = '#A3B0AA';
const FAINT = '#7A8681';
const BORDER = '#2C3833';
const SAGE = '#243028';
const GOLD = '#2A2418';
const BLUE = '#1E2630';
const ROSE = '#2A1C1C';
const GREEN = '#1C2A1F';

const backgrounds: Record<string, string> = {
  '#f6f2ea': PAGE,
  '#f8f4ec': PAGE,
  '#f4f6f8': PAGE,
  '#f7f8f6': PAGE,
  '#f4f0e8': PAGE,
  '#f6f0e3': PAGE,
  '#eef2f6': PAGE,
  '#ffffff': CARD,
  '#fff': CARD,
  '#e8ede4': SAGE,
  '#f3e8d0': GOLD,
  '#e4eaf1': BLUE,
  '#eaf0f7': BLUE,
  '#eef2ff': BLUE,
  '#e8eeff': BLUE,
  '#fff8ec': GOLD,
  '#fbebd4': GOLD,
  '#f1f1ee': '#222A27',
  '#f3f3f1': '#222A27',
  '#e7eeea': SAGE,
  '#ffe7e7': ROSE,
  '#fdecec': ROSE,
  '#ffe8e8': ROSE,
  '#eaf6ea': GREEN,
  '#eaf6ec': GREEN,
};

const foregrounds: Record<string, string> = {
  '#2a2622': TEXT,
  '#1b2230': TEXT,
  '#1e1e1e': TEXT,
  '#16332c': TEXT,
  '#243040': TEXT,
  '#1f2937': TEXT,
  '#222': TEXT,
  '#222222': TEXT,
  '#5c4426': TEXT,
  '#6f6a64': MUTED,
  '#6b7280': MUTED,
  '#7a6f5d': MUTED,
  '#667384': MUTED,
  '#5c6b65': MUTED,
  '#4a5568': MUTED,
  '#7b7b7b': MUTED,
  '#8a7454': MUTED,
  '#7f8c8d': MUTED,
  '#60646c': MUTED,
  '#374151': MUTED,
  '#9ca3af': FAINT,
  '#8a929b': FAINT,
  '#a0aec0': FAINT,
  '#8e8e93': FAINT,
  '#a8a8a8': FAINT,
};

const borders: Record<string, string> = {
  '#e5e0d6': BORDER,
  '#e8dfcc': BORDER,
  '#dde3ea': BORDER,
  '#e7eeea': BORDER,
  '#d5ddd8': BORDER,
  '#d3e4d5': BORDER,
  '#ececec': BORDER,
  '#e5e7eb': BORDER,
  '#f0dcbb': '#3A3220',
  '#d6d3d1': BORDER,
  '#e8ede4': SAGE,
  '#ffffff': BORDER,
  '#fff': BORDER,
};

function norm(color: string) {
  return color.replace(/\s/g, '').toLowerCase();
}

function remapStyle(style: StyleValue): StyleValue {
  const next = { ...style } as Record<string, unknown>;

  if (typeof next.backgroundColor === 'string') {
    const mapped = backgrounds[norm(next.backgroundColor)];
    if (mapped) {
      next.backgroundColor = mapped;
    }
  }

  if (typeof next.color === 'string') {
    const mapped = foregrounds[norm(next.color)];
    if (mapped) {
      next.color = mapped;
    }
  }

  for (const key of [
    'borderColor',
    'borderTopColor',
    'borderBottomColor',
    'borderLeftColor',
    'borderRightColor',
  ] as const) {
    if (typeof next[key] === 'string') {
      const mapped = borders[norm(next[key] as string)];
      if (mapped) {
        next[key] = mapped;
      }
    }
  }

  return next as StyleValue;
}

export function useThemedStyles<T>(sheet: T): T {
  const { isDark } = useAppTheme();

  return useMemo(() => {
    if (!isDark) {
      return sheet;
    }

    const themed = {} as T;
    for (const key of Object.keys(sheet as object) as (keyof T)[]) {
      themed[key] = remapStyle(
        StyleSheet.flatten((sheet as Record<string, StyleValue>)[key as string]) as StyleValue,
      ) as T[keyof T];
    }
    return themed;
  }, [isDark, sheet]);
}
