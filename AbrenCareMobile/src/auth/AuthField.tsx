import React, { memo, useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { glassField } from '@/components/executive/GlassCard';
import { useAppTheme } from '@/context/ThemeContext';
import type { ServiceTheme } from '@/service/serviceTheme';

type Props = {
  theme: ServiceTheme;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'words' | 'sentences';
};

function AuthField({
  theme,
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secure,
  keyboardType,
  autoCapitalize = 'none',
}: Props) {
  const [visible, setVisible] = useState(false);
  const { isDark } = useAppTheme();

  const toggleVisibility = useCallback(() => {
    setVisible(current => !current);
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <View style={[styles.field, glassField(isDark)]}>
        <Ionicons name={icon} size={18} color={theme.accent} style={styles.icon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          secureTextEntry={Boolean(secure) && !visible}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          style={[styles.input, { color: theme.text }]}
          underlineColorAndroid="transparent"
        />
        {secure ? (
          <Pressable onPress={toggleVisibility} hitSlop={10} accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={theme.muted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default memo(AuthField);

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
});
