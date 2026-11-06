import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { activeFamilyMember, memberInitials } from '@/utilities/familyMember';

type Props = {
  size?: number;
  name?: string;
  style?: StyleProp<ViewStyle>;
};

const FILL = '#1A3A32';

export default function FamilyProfilePhoto({ size = 48, name, style }: Props) {
  const { isDark } = useAppTheme();
  const { user } = useAuth();
  const member = activeFamilyMember(user);
  const initials = memberInitials(name || member?.name || user?.name || '');
  const radius = Math.round(size * 0.28);

  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: isDark ? '#243028' : '#EEF3EF',
          borderColor: isDark ? '#2C3833' : '#D7E3DC',
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize: Math.round(size * 0.34),
            color: isDark ? '#D7E6DC' : FILL,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
