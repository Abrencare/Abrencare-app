import { ReactNode } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import BrandLogo from '@/components/ui/BrandLogo';
import { useLanguage } from '@/context/LanguageContext';
import { useLandingType } from '@/theme/landingType';
import type { CareService } from '@/types/auth';

type Props = {
  service: CareService;
  photo: ImageSourcePropType;
  kicker: string;
  title: ReactNode;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  note: string;
  loginPrefix: string;
  loginLabel: string;
  primaryColor: string;
  onPrimary: () => void;
  onSecondary: () => void;
  extra?: ReactNode;
};

export default function ServiceHeroLanding({
  service,
  photo,
  kicker,
  title,
  subtitle,
  primaryLabel,
  secondaryLabel,
  note,
  loginPrefix,
  loginLabel,
  primaryColor,
  onPrimary,
  onSecondary,
  extra,
}: Props) {
  const router = useRouter();
  const type = useLandingType(service);
  const { language, setLanguage } = useLanguage();

  return (
    <View style={styles.root}>
      <Image source={photo} resizeMode="cover" style={styles.photo} />
      <LinearGradient
        colors={[
          'rgba(8, 10, 9, 0.16)',
          'rgba(8, 10, 9, 0)',
          'rgba(8, 10, 9, 0.22)',
          'rgba(8, 10, 9, 0.72)',
          'rgba(8, 10, 9, 0.96)',
        ]}
        locations={[0, 0.26, 0.46, 0.64, 1]}
        style={styles.overlay}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.ui} pointerEvents="box-none">
        <View style={styles.top} pointerEvents="box-none">
          <BrandLogo size={48} />
          <View style={styles.language}>
            <Pressable onPress={() => setLanguage('en')} hitSlop={10}>
              <Text style={[styles.langText, language === 'en' && { color: primaryColor, fontWeight: '700' }]}>
                English
              </Text>
            </Pressable>
            <Text style={styles.langDot}>·</Text>
            <Pressable onPress={() => setLanguage('am')} hitSlop={10}>
              <Text style={[styles.langText, language === 'am' && { color: primaryColor, fontWeight: '700' }]}>
                አማርኛ
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.bottom} pointerEvents="box-none">
          <LinearGradient
            colors={['rgba(8, 10, 9, 0)', 'rgba(8, 10, 9, 0.72)', 'rgba(8, 10, 9, 0.94)']}
            locations={[0, 0.22, 1]}
            style={styles.textCover}
            pointerEvents="box-none"
          >
            <Text style={[styles.kicker, type.kicker]}>{kicker}</Text>
            <Text style={[styles.title, type.headline]}>{title}</Text>
            <Text style={[styles.subtitle, type.body]} numberOfLines={2}>
              {subtitle}
            </Text>

            <Pressable
              onPress={onPrimary}
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: primaryColor },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.primaryText, type.button]}>{primaryLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onSecondary}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={[styles.secondaryText, type.button]}>{secondaryLabel}</Text>
            </Pressable>

            {extra}

            <Pressable
              onPress={() => router.push({ pathname: '/login', params: { service } })}
            >
              <Text style={styles.login}>
                {loginPrefix} <Text style={styles.loginLink}>{loginLabel}</Text>
              </Text>
            </Pressable>

            <Text style={styles.note}>{note}</Text>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  photo: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  ui: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  language: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
  },
  langText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  langDot: {
    color: '#9CA3AF',
    fontSize: 15,
    marginHorizontal: 8,
  },
  bottom: {
    width: '100%',
  },
  textCover: {
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 22,
  },
  kicker: {
    color: '#E6D3A8',
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.82)',
    marginBottom: 16,
    maxWidth: 340,
  },
  primary: {
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondary: {
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  login: {
    color: 'rgba(255, 255, 255, 0.78)',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 13,
  },
  loginLink: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  note: {
    color: 'rgba(255, 255, 255, 0.62)',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.88,
  },
});
