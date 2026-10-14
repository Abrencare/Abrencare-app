import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import { useLanguage } from '@/context/LanguageContext';
import { useLandingType } from '@/theme/landingType';

const INK = '#16332C';
const MUTED = '#5C6B65';
const FILL = '#1A3A32';
const SOFT = '#E7EEEA';

export default function FamilyHowItWorksScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyLanding;
  const type = useLandingType('family');

  const steps = [
    { icon: 'chatbubble-ellipses-outline' as const, title: copy.step1Title, body: copy.step1Body },
    { icon: 'clipboard-outline' as const, title: copy.step2Title, body: copy.step2Body },
    { icon: 'notifications-outline' as const, title: copy.step3Title, body: copy.step3Body },
  ];

  return (
    <FamilyRequestChrome>
      <Text style={[styles.kicker, type.kicker]}>{copy.kicker}</Text>
      <Text style={[styles.title, type.headline]}>{copy.howTitle}</Text>
      <Text style={[styles.subtitle, type.body]}>{copy.howSubtitle}</Text>

      {steps.map((step, index) => (
        <View key={step.title} style={styles.step}>
          <View style={styles.stepIndex}>
            <Text style={[styles.stepNumber, type.caption]}>{index + 1}</Text>
          </View>
          <View style={styles.stepCopy}>
            <View style={styles.stepHead}>
              <Ionicons name={step.icon} size={16} color={FILL} />
              <Text style={[styles.stepTitle, type.label]}>{step.title}</Text>
            </View>
            <Text style={[styles.stepBody, type.bodySmall]}>{step.body}</Text>
          </View>
        </View>
      ))}

      <Text style={[styles.note, type.caption]}>{copy.requestNote}</Text>

      <Pressable
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        onPress={() => router.push('/family-request')}
      >
        <Text style={[styles.primaryText, type.button]}>{copy.createAccount}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>
    </FamilyRequestChrome>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: MUTED,
    marginBottom: 10,
  },
  title: {
    color: INK,
    marginBottom: 8,
  },
  subtitle: {
    color: MUTED,
    marginBottom: 22,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: FILL,
  },
  stepCopy: {
    flex: 1,
  },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepTitle: {
    color: INK,
  },
  stepBody: {
    color: MUTED,
  },
  note: {
    color: MUTED,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  primary: {
    height: 54,
    borderRadius: 27,
    backgroundColor: FILL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
});
