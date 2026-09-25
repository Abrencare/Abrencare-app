import { Image, StyleSheet, View, type ViewStyle } from 'react-native';

const LOGO = require('@/assets/images/abrencare-logo.png');

type Props = {
  size?: number;
  style?: ViewStyle;
};

export default function BrandLogo({ size = 40, style }: Props) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image source={LOGO} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});
