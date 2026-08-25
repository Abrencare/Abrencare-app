import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/i18n/LanguageContext';
import type { Language } from '@/i18n/translations';
import colors from '@/theme/colors';

type Props = {
  compact?: boolean;
};

export function LanguageToggle({ compact = false }: Props) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.container, compact && styles.compactContainer]}
    >
      <ToggleOption
        compact={compact}
        label={t.common.english}
        selected={language === 'en'}
        onPress={() => setLanguage('en')}
      />
      <ToggleOption
        compact={compact}
        label={t.common.amharic}
        selected={language === 'am'}
        onPress={() => setLanguage('am')}
      />
    </View>
  );
}

function ToggleOption({
  label,
  selected,
  compact,
  onPress,
}: {
  label: string;
  selected: boolean;
  compact: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.option,
        compact && styles.compactOption,
        selected && styles.optionSelected,
      ]}
    >
      <Text
        style={[
          styles.label,
          compact && styles.compactLabel,
          selected && styles.labelSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export type { Language };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 4,
  },
  compactContainer: {
    borderRadius: 10,
    padding: 3,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  compactOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    flex: 0,
  },
  optionSelected: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  compactLabel: {
    fontSize: 12,
  },
  labelSelected: {
    color: colors.white,
  },
});
