import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { glassBlur, glassField, glassTints } from '@/components/executive/GlassCard';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  COUNTRIES,
  detectCountry,
  isPhoneComplete,
  joinPhone,
  limitNationalInput,
  nationalInputMaxLength,
  phoneIssueFor,
  splitPhone,
  type Country,
} from '@/data/countries';
import type { ServiceTheme } from '@/service/serviceTheme';

type Props = {
  theme: ServiceTheme;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  radius?: number;
  labelStyle?: 'caps' | 'plain';
  showValidation?: boolean;
};

function PhoneField({
  theme,
  label,
  value,
  onChange,
  placeholder,
  error,
  radius = 12,
  labelStyle = 'caps',
  showValidation = false,
}: Props) {
  const { t } = useLanguage();
  const { isDark } = useAppTheme();
  const glass = useMemo(() => glassTints(isDark), [isDark]);
  const detected = useMemo(() => detectCountry(), []);
  const initial = useMemo(() => splitPhone(value, detected), [detected, value]);

  const [country, setCountry] = useState<Country>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const names = t.countries;

  // Sync from parent only when the stored E.164 value does not match local state,
  // and only call setState when country/national actually change (avoids update loops).
  useEffect(() => {
    const currentValue = joinPhone(country, national);
    if (value === currentValue) {
      return;
    }
    const next = splitPhone(value || '', country);
    if (
      next.country.id !== country.id ||
      next.country.dialCode !== country.dialCode
    ) {
      setCountry(next.country);
    }
    if (next.national !== national) {
      setNational(next.national);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from parent value only
  }, [value]);

  const pick = useCallback((next: Country) => {
    const limited = limitNationalInput(next, national);
    setCountry(next);
    setNational(limited.national);
    setOpen(false);
    onChange(joinPhone(next, limited.national));
  }, [national, onChange]);

  const type = useCallback((text: string) => {
    const limited = limitNationalInput(country, text);
    setNational(limited.national);
    setTouched(true);
    onChange(joinPhone(country, limited.national));
  }, [country, onChange]);

  const issue = phoneIssueFor(country, national);
  const invalid =
    (showValidation && touched && issue !== null && issue !== 'empty') ||
    Boolean(error);
  const message =
    error ||
    (showValidation && touched && (issue === 'incomplete' || issue === 'tooLong')
      ? t.validation.phoneInvalid
      : null);

  return (
    <View style={styles.wrap}>
      <Text style={[
        labelStyle === 'caps' ? styles.labelCaps : styles.labelPlain,
        { color: labelStyle === 'caps' ? theme.muted : theme.text },
      ]}>
        {labelStyle === 'caps' ? label.toUpperCase() : label}
      </Text>

      <View style={[
        styles.field,
        glassField(isDark),
        {
          borderColor: invalid ? DANGER : glass.wellBorder,
          borderRadius: radius,
          backgroundColor: invalid ? 'rgba(214,69,69,0.06)' : glass.well,
        },
      ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.countryCode}
          style={[
            styles.code,
            { borderRightColor: invalid ? 'rgba(214,69,69,0.35)' : theme.border },
          ]}
          onPress={() => setOpen(true)}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={[styles.codeText, { color: theme.text }]}>
            {country.dialCode || '+'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={theme.muted} />
        </Pressable>

        <TextInput
          value={national}
          onChangeText={type}
          onBlur={() => setTouched(true)}
          placeholder={placeholder ?? '9XXXXXXXX'}
          placeholderTextColor={theme.muted}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoCorrect={false}
          maxLength={nationalInputMaxLength(country)}
          style={[styles.input, { color: invalid ? DANGER : theme.text }]}
        />
      </View>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.sheet,
              glassBlur,
              { backgroundColor: glass.card, borderColor: glass.border },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              {t.common.countryCode}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {COUNTRIES.map(item => {
                const selected =
                  item.id === country.id && item.dialCode === country.dialCode;
                return (
                  <Pressable key={`${item.id}-${item.dialCode}`} style={styles.row}
                    onPress={() => pick(item)}>
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={[styles.rowName, { color: theme.text }]}>
                      {names[item.id]}
                    </Text>
                    <Text style={[styles.rowCode, { color: theme.muted }]}>
                      {item.dialCode || '—'}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={17} color={theme.accent} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default memo(PhoneField);

export function phoneFieldIsValid(value: string) {
  if (!value.trim()) return false;
  const { country, national } = splitPhone(value);
  return isPhoneComplete(country, national);
}

const DANGER = '#D64545';

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  labelCaps: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  labelPlain: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 50,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 14,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  flag: { fontSize: 18 },
  codeText: { fontSize: 15, fontWeight: '600' },
  input: {
    flex: 1,
    fontSize: 16,
    letterSpacing: 0.3,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  error: {
    color: DANGER,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 22, 19, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingTop: 14,
    paddingBottom: 24,
    paddingHorizontal: 8,
    maxHeight: '55%',
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  rowName: { flex: 1, fontSize: 15 },
  rowCode: { fontSize: 14, fontWeight: '600' },
});
