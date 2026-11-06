import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BrandLogo, { BrandHomeLink } from '@/components/ui/BrandLogo';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';

type Props = {
  kicker?: string;
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
  showBrand?: boolean;
};

export default function ConsultationChrome({
  kicker,
  title,
  onBack,
  right,
  showBrand = true,
}: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');

  function goBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/consultation');
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={goBack}
          style={[styles.back, { backgroundColor: theme.accentSoft }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>

        {showBrand ? (
          <BrandHomeLink style={styles.brand}>
            <BrandLogo size={28} link={false} />
            <View>
              <Text style={[styles.brandName, { color: theme.accent }]}>
                {t.auth.brand}
              </Text>
              <Text style={[styles.kicker, { color: theme.muted }]}>
                {kicker ?? t.consultationFlow.digital}
              </Text>
            </View>
          </BrandHomeLink>
        ) : (
          <Text style={[styles.plainKicker, { color: theme.muted }]}>
            {kicker ?? t.consultationFlow.digital}
          </Text>
        )}

        {right ?? <View style={styles.back} />}
      </View>
      {title ? (
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      ) : null}
    </View>
  );
}

export function TealButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useServiceTheme('consultation');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.accent },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
      <Text style={styles.buttonText}>{label}</Text>
      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const theme = useServiceTheme('consultation');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ghost,
        { borderColor: theme.border },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.ghostText, { color: theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  kicker: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    textAlign: 'center',
  },
  plainKicker: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  button: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ghost: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
  },
  ghostText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.45,
  },
});
