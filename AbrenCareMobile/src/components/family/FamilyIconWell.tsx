import { StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/context/ThemeContext';

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  box?: number;
  tone?: 'gold' | 'warn';
};

const FILL = '#1A3A32';

export default function FamilyIconWell({ name, size = 16, box = 36, tone = 'gold' }: Props) {
  const { isDark } = useAppTheme();
  const warn = tone === 'warn';

  const color = warn ? '#B86A1C' : isDark ? '#D7E6DC' : FILL;
  const backgroundColor = warn
    ? isDark
      ? '#2A2418'
      : '#F7F1E6'
    : isDark
      ? '#243028'
      : '#EEF3EF';
  const borderColor = warn
    ? isDark
      ? '#4A3A24'
      : '#E4D4B8'
    : isDark
      ? '#2C3833'
      : '#D7E3DC';

  return (
    <View
      style={[
        styles.well,
        {
          width: box,
          height: box,
          borderRadius: 10,
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
