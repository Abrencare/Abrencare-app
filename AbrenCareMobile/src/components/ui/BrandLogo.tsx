import { type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useLanguage } from '@/context/LanguageContext';

const LOGO = require('@/assets/images/abrencare-logo.png');
const HOME = '/(tabs)' as const;

type Props = {
  size?: number;
  style?: ViewStyle;
  /** When false, the mark is display-only. Wrap it in BrandHomeLink instead. */
  link?: boolean;
};

export function BrandHomeLink({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.header.brand}
      hitSlop={8}
      onPress={() => router.replace(HOME)}
      style={style}
    >
      {children}
    </Pressable>
  );
}

export default function BrandLogo({ size = 40, style, link = true }: Props) {
  const mark = (
    <View style={[{ width: size, height: size }, style]}>
      <Image source={LOGO} style={styles.image} resizeMode="contain" />
    </View>
  );

  if (!link) {
    return mark;
  }

  return <BrandHomeLink>{mark}</BrandHomeLink>;
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});
