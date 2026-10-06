import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import AuthScaffold from '@/auth/AuthScaffold';
import {
  loadExecutiveInquiry,
  type ExecutiveInquiry,
} from '@/data/executiveInquiry';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';

export default function ExecutiveAdvisorScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('executive');
  const { hasService } = useAuth();
  const copy = t.executiveSignup;
  const [inquiry, setInquiry] = useState<ExecutiveInquiry | null>(null);

  useEffect(() => {
    loadExecutiveInquiry().then(setInquiry);
  }, []);

  const steps = [copy.inquiryStep1, copy.inquiryStep2, copy.inquiryStep3];

  return (
    <AuthScaffold
      theme={theme}
      serviceLabel={copy.service}
      title={copy.inquiryTitle}
      subtitle={
        inquiry?.name
          ? copy.inquiryHello.replace('{name}', inquiry.name.split(' ')[0])
          : copy.inquirySubtitle
      }
    >
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.field }]}>
        <Text style={[styles.cardLabel, { color: theme.muted }]}>
          {copy.inquiryNext.toUpperCase()}
        </Text>
        {steps.map((line, index) => (
          <View key={line} style={styles.step}>
            <View style={[styles.stepIndex, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.stepIndexText, { color: theme.accent }]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[styles.stepText, { color: theme.text }]}>{line}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.note, { color: theme.muted }]}>{copy.inquiryNote}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.accent },
          pressed && styles.pressed,
        ]}
        onPress={() => router.push('/executive-preview-chat')}
      >
        <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
        <Text style={styles.buttonText}>{copy.inquiryMessage}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: theme.border },
          pressed && styles.pressed,
        ]}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={[styles.secondaryText, { color: theme.text }]}>
          {copy.inquiryHome}
        </Text>
      </Pressable>

      {hasService('executive') ? (
        <Pressable
          onPress={() => router.replace('/executive-ready')}
          style={styles.spoken}
        >
          <Text style={[styles.spokenText, { color: theme.muted }]}>
            {copy.inquirySpoken}
          </Text>
        </Pressable>
      ) : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    paddingTop: 3,
  },
  note: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
  },
  button: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondary: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
  spoken: {
    marginTop: 18,
    alignItems: 'center',
  },
  spokenText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
