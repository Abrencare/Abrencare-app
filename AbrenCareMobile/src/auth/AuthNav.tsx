import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BrandLogo from '@/components/ui/BrandLogo';
import type { CareService } from '@/types/auth';
import { useLanguage } from '@/context/LanguageContext';

type Active = 'intro' | 'signup' | 'signin';

type Props = {
  service: CareService;
  active: Active;
  accent: string;
  muted: string;
  card: string;
};

export default function AuthNav({ service, active, accent, muted, card }: Props) {
  const router = useRouter();
  const { t } = useLanguage();

  function goHome() {
    if (active === 'intro') {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace('/(tabs)');
      return;
    }

    router.replace({ pathname: '/service', params: { service } });
  }

  function go(mode: 'signup' | 'signin') {
    const pathname = mode === 'signup' ? '/signup' : '/login';

    if (active === mode) {
      return;
    }

    if (active === 'intro') {
      router.push({ pathname, params: { service } });
      return;
    }

    router.replace({ pathname, params: { service } });
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={goHome}
        hitSlop={12}
        style={[styles.backButton, { backgroundColor: card }]}
      >
        <Ionicons name="chevron-back" size={20} color={muted} />
      </Pressable>

      <BrandLogo size={36} />

      <View style={[styles.toggle, { backgroundColor: card }]}>
        <Pressable onPress={() => go('signup')} hitSlop={10}>
          <Text
            style={[
              styles.toggleText,
              { color: muted },
              active === 'signup' && { color: accent, fontWeight: '700' },
            ]}
          >
            {t.auth.signUp}
          </Text>
        </Pressable>
        <Text style={[styles.divider, { color: muted }]}>·</Text>
        <Pressable onPress={() => go('signin')} hitSlop={10}>
          <Text
            style={[
              styles.toggleText,
              { color: muted },
              active === 'signin' && { color: accent, fontWeight: '700' },
            ]}
          >
            {t.auth.signIn}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  toggleText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    color: '#9CA3AF',
    fontSize: 15,
    marginHorizontal: 10,
  },
});
