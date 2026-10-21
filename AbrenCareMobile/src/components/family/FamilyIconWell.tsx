import { StyleSheet } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '@/context/ThemeContext';

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  box?: number;
  tone?: 'gold' | 'warn';
};

export default function FamilyIconWell({ name, size = 18, box = 38, tone = 'gold' }: Props) {
  const { isDark } = useAppTheme();
  const warn = tone === 'warn';
  const color = warn ? '#C97A2E' : isDark ? '#E7F3EC' : '#4F7A62';
  const borderColor = warn
    ? isDark
      ? '#6A4A28'
      : '#E8D3B0'
    : isDark
      ? '#6E9A82'
      : '#D7E6DC';
  const colors: [string, string, string] = warn
    ? isDark
      ? ['#3A2C22', '#2A2118', '#241C14']
      : ['#FFFCF8', '#F8EDE0', '#F3E4D2']
    : isDark
      ? ['#3A5246', '#2A3B33', '#22302A']
      : ['#FFFFFF', '#F4FAF6', '#E3EFE8'];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[
        styles.well,
        {
          width: box,
          height: box,
          borderRadius: 12,
          borderColor,
        },
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  well: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5E7A62',
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
