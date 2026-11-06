import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';

import { glassField, glassTints } from '@/components/executive/GlassCard';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ServiceTheme } from '@/service/serviceTheme';

const DANGER = '#D64545';

type Props = {
  theme: ServiceTheme;
  label: string;
  /** ISO date YYYY-MM-DD when complete and valid, otherwise ''. */
  value: string;
  onChange: (isoDate: string) => void;
  error?: string | null;
  hint?: string | null;
  radius?: number;
  labelStyle?: 'caps' | 'plain';
};

function digitsOnly(value: string, max: number) {
  return value.replace(/\D/g, '').slice(0, max);
}

function pad2(value: string) {
  return value.padStart(2, '0');
}

function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return { day: '', month: '', year: '' };
  }
  return { year: match[1], month: match[2], day: match[3] };
}

function buildIso(day: string, month: string, year: string) {
  if (!day || !month || year.length !== 4) {
    return '';
  }
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) {
    return '';
  }
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) {
    return '';
  }

  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return '';
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date.getTime() > today.getTime()) {
    return '';
  }
  return `${y}-${pad2(String(m))}-${pad2(String(d))}`;
}

export function isValidIsoDateOfBirth(value: string) {
  const parts = parseIso(value);
  return buildIso(parts.day, parts.month, parts.year) === value.trim();
}

function DateOfBirthField({
  theme,
  label,
  value,
  onChange,
  error,
  hint,
  radius = 12,
  labelStyle = 'caps',
}: Props) {
  const { t } = useLanguage();
  const { isDark } = useAppTheme();
  const glass = useMemo(() => glassTints(isDark), [isDark]);
  const field = useMemo(() => glassField(isDark), [isDark]);
  const initial = useMemo(() => parseIso(value), [value]);

  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [touched, setTouched] = useState(false);

  const monthRef = useRef<TextInputType>(null);
  const yearRef = useRef<TextInputType>(null);

  // Sync from parent only when it supplies a different complete ISO date.
  useEffect(() => {
    if (!value) {
      return;
    }
    const parsed = parseIso(value);
    if (!parsed.year) {
      return;
    }
    const current = `${year}-${pad2(month)}-${pad2(day)}`;
    if (value === current) {
      return;
    }
    setDay(parsed.day);
    setMonth(parsed.month);
    setYear(parsed.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from parent value only
  }, [value]);

  const emit = useCallback(
    (nextDay: string, nextMonth: string, nextYear: string) => {
      onChange(buildIso(nextDay, nextMonth, nextYear));
    },
    [onChange],
  );

  const onDay = useCallback(
    (text: string) => {
      const next = digitsOnly(text, 2);
      setDay(next);
      setTouched(true);
      emit(next, month, year);
      if (next.length === 2) {
        monthRef.current?.focus();
      }
    },
    [emit, month, year],
  );

  const onMonth = useCallback(
    (text: string) => {
      const next = digitsOnly(text, 2);
      setMonth(next);
      setTouched(true);
      emit(day, next, year);
      if (next.length === 2) {
        yearRef.current?.focus();
      }
    },
    [day, emit, year],
  );

  const onYear = useCallback(
    (text: string) => {
      const next = digitsOnly(text, 4);
      setYear(next);
      setTouched(true);
      emit(day, month, next);
    },
    [day, emit, month],
  );

  const invalid =
    Boolean(error) ||
    (touched && Boolean(day || month || year) && !isValidIsoDateOfBirth(value));

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          labelStyle === 'caps' ? styles.labelCaps : styles.labelPlain,
          { color: labelStyle === 'caps' ? theme.muted : theme.text },
        ]}
      >
        {labelStyle === 'caps' ? label.toUpperCase() : label}
      </Text>

      <View
        style={[
          styles.field,
          field,
          {
            borderRadius: radius,
            borderColor: invalid ? DANGER : glass.wellBorder,
            backgroundColor: invalid ? 'rgba(214,69,69,0.06)' : glass.well,
          },
        ]}
      >
        <TextInput
          value={day}
          onChangeText={onDay}
          onBlur={() => setTouched(true)}
          placeholder="DD"
          placeholderTextColor={theme.muted}
          keyboardType="number-pad"
          maxLength={2}
          style={[styles.segment, { color: invalid ? DANGER : theme.text }]}
        />
        <Text style={[styles.sep, { color: theme.muted }]}>/</Text>
        <TextInput
          ref={monthRef}
          value={month}
          onChangeText={onMonth}
          onBlur={() => setTouched(true)}
          placeholder="MM"
          placeholderTextColor={theme.muted}
          keyboardType="number-pad"
          maxLength={2}
          style={[styles.segment, { color: invalid ? DANGER : theme.text }]}
        />
        <Text style={[styles.sep, { color: theme.muted }]}>/</Text>
        <TextInput
          ref={yearRef}
          value={year}
          onChangeText={onYear}
          onBlur={() => setTouched(true)}
          placeholder="YYYY"
          placeholderTextColor={theme.muted}
          keyboardType="number-pad"
          maxLength={4}
          style={[styles.year, { color: invalid ? DANGER : theme.text }]}
        />
      </View>

      {invalid ? (
        <Text style={styles.error}>{error || t.validation.required}</Text>
      ) : (
        <Text style={[styles.hint, { color: theme.muted }]}>
          {hint || t.validation.dobHint}
        </Text>
      )}
    </View>
  );
}

export default memo(DateOfBirthField);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  labelCaps: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  labelPlain: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segment: {
    width: 36,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 0,
  },
  year: {
    width: 56,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 0,
  },
  sep: {
    fontSize: 15,
    marginHorizontal: 4,
  },
  error: {
    color: DANGER,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
});
