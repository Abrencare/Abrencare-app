import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useLanguage } from '@/i18n/LanguageContext';

type Props = {
  /** Route the user lands on once they have an account. */
  redirectTo: string;
};

export default function ServiceAuthGate({ redirectTo }: Props) {
  const router = useRouter();
  const { t } = useLanguage();

  const benefits = [
    { icon: 'calendar-outline' as const, label: t.authGate.benefit1 },
    { icon: 'videocam-outline' as const, label: t.authGate.benefit2 },
    { icon: 'document-text-outline' as const, label: t.authGate.benefit3 },
  ];

  function go(pathname: string) {
    router.push({ pathname, params: { redirect: redirectTo } });
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color="#4A5568" />
        </Pressable>

        <View style={styles.lockCircle}>
          <Ionicons name="lock-closed" size={22} color="#FFFFFF" />
        </View>

        <Text style={styles.label}>{t.authGate.label}</Text>
        <Text style={styles.title}>{t.authGate.title}</Text>
        <Text style={styles.subtitle}>{t.authGate.subtitle}</Text>

        <View style={styles.card}>
          <View style={styles.greenLine} />

          {benefits.map((benefit) => (
            <View key={benefit.label} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon} size={16} color="#2F855A" />
              </View>
              <Text style={styles.benefitText}>{benefit.label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={() => go('/signup')}
        >
          <Text style={styles.primaryText}>{t.authGate.createAccount}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          onPress={() => go('/login')}
        >
          <Text style={styles.secondaryText}>{t.authGate.signIn}</Text>
        </Pressable>

        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#6B8E55" />
          <Text style={styles.trustText}>{t.authGate.secure}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4EF',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 55,
    paddingBottom: 40,
  },

  backButton: {
    marginBottom: 18,
  },

  lockCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#8DA684',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  label: {
    fontSize: 11,
    color: '#7A8A7A',
    letterSpacing: 1,
    fontWeight: '600',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F3A2F',
    marginTop: 4,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6F7F73',
    marginTop: 8,
    marginBottom: 20,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
  },

  greenLine: {
    height: 3,
    backgroundColor: '#6A8D69',
    borderRadius: 20,
    marginBottom: 16,
  },

  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },

  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF2EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  primary: {
    backgroundColor: '#8DA684',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  secondary: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#D6DCD2',
    backgroundColor: '#FFFFFF',
  },

  secondaryText: {
    color: '#4A5D45',
    fontSize: 15,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.85,
  },

  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 22,
  },

  trustText: {
    fontSize: 12,
    color: '#7A8A7A',
  },
});
