import { useMemo, useState } from 'react';
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

import { useLanguage } from '@/context/LanguageContext';
import {
  COUNTRIES,
  detectCountry,
  joinPhone,
  splitPhone,
  type Country,
} from '@/data/countries';
import type { ServiceTheme } from '@/service/serviceTheme';

type Props = {
  theme: ServiceTheme;
  label: string;
  /** Stored in E.164 form, e.g. +46701234567. */
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string | null;
  radius?: number;
  labelStyle?: 'caps' | 'plain';
};

export default function PhoneField({
  theme,
  label,
  value,
  onChange,
  placeholder,
  error,
  radius = 12,
  labelStyle = 'caps',
}: Props) {
  const { t } = useLanguage();
  const detected = useMemo(detectCountry, []);
  const initial = useMemo(() => splitPhone(value, detected), [detected, value]);

  const [country, setCountry] = useState<Country>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);

  const names = t.countries;

  function pick(next: Country) {
    setCountry(next);
    setOpen(false);
    onChange(joinPhone(next, national));
  }

  function type(text: string) {
    setNational(text);
    onChange(joinPhone(country, text));
  }

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
          {
            backgroundColor: theme.field,
            borderColor: error ? DANGER : theme.border,
            borderRadius: radius,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.countryCode}
          style={[styles.code, { borderRightColor: theme.border }]}
          onPress={() => setOpen(true)}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={[styles.codeText, { color: theme.text }]}>
            {country.dialCode || '+'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.muted} />
        </Pressable>

        <TextInput
          value={national}
          onChangeText={type}
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          keyboardType="phone-pad"
          autoCorrect={false}
          style={[styles.input, { color: theme.text }]}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

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
              { backgroundColor: theme.field, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              {t.common.countryCode}
            </Text>

            <ScrollView>
              {COUNTRIES.map((item) => {
                const selected =
                  item.id === country.id && item.dialCode === country.dialCode;

                return (
                  <Pressable
                    key={item.id}
                    style={styles.row}
                    onPress={() => pick(item)}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={[styles.rowName, { color: theme.text }]}>
                      {names[item.id]}
                    </Text>
                    <Text style={[styles.rowCode, { color: theme.muted }]}>
                      {item.dialCode}
                    </Text>
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={17}
                        color={theme.accent}
                      />
                    ) : null}
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

const DANGER = '#D64545';

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
    fontWeight: '600',
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
  },
  flag: {
    fontSize: 16,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  error: {
    color: DANGER,
    fontSize: 12,
    marginTop: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 22, 19, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    maxHeight: 420,
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
  rowName: {
    flex: 1,
    fontSize: 15,
  },
  rowCode: {
    fontSize: 14,
    fontWeight: '600',
  },
});
