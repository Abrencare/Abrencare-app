import { Image, type ImageStyle, type StyleProp } from 'react-native';

const SOURCE = require('@/assets/images/family-plan-profile.png');

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export default function FamilyProfilePhoto({ size = 48, style }: Props) {
  return (
    <Image
      source={SOURCE}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}
