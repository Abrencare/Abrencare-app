import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ConsultationChrome, {
  TealButton,
} from '@/components/consultation/ConsultationChrome';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';

const STEPS = [
  {
    n: '1',
    color: '#E7F5F2',
    icons: [
      { name: 'videocam-outline' as const, labelKey: 'videoTitle' as const },
      { name: 'chatbubble-outline' as const, labelKey: 'message' as const },
    ],
  },
  {
    n: '2',
    color: '#EEF6EA',
    icons: [{ name: 'create-outline' as const, labelKey: null }],
  },
  {
    n: '3',
    color: '#FFF6E8',
    icons: [{ name: 'calendar-outline' as const, labelKey: null }],
  },
  {
    n: '4',
    color: '#F3EEF8',
    icons: [{ name: 'card-outline' as const, labelKey: null }],
  },
  {
    n: '5',
    color: '#FDECF1',
    icons: [{ name: 'document-text-outline' as const, labelKey: null }],
  },
];

export default function ConsultationHowItWorks() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const copy = t.consultationFlow;

  const steps = [
    { title: copy.how1Title, body: copy.how1Body },
    { title: copy.how2Title, body: copy.how2Body },
    { title: copy.how3Title, body: copy.how3Body },
    { title: copy.how4Title, body: copy.how4Body },
    { title: copy.how5Title, body: copy.how5Body },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#FFFFFF' }]}>
      <ConsultationChrome
        onBack={() => router.replace('/service?service=consultation')}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.text }]}>{copy.howTitle}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {copy.howSubtitle}
        </Text>

        {steps.map((step, index) => {
          const visual = STEPS[index];
          return (
            <View
              key={visual.n}
              style={[styles.card, { backgroundColor: visual.color }]}
            >
              <View style={styles.cardCopy}>
                <Text style={[styles.num, { color: theme.accent }]}>
                  {visual.n}
                </Text>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {step.title}
                </Text>
                <Text style={[styles.cardBody, { color: theme.muted }]}>
                  {step.body}
                </Text>
              </View>
              <View style={styles.art}>
                {visual.icons.map((icon) => (
                  <View key={icon.name} style={styles.artItem}>
                    <Ionicons name={icon.name} size={20} color={theme.accent} />
                    {icon.labelKey === 'videoTitle' ? (
                      <Text style={styles.artLabel}>{copy.videoTitle}</Text>
                    ) : icon.labelKey === 'message' ? (
                      <Text style={styles.artLabel}>
                        {t.consultationLanding.messageTitle}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <TealButton
          label={copy.getStarted}
          onPress={() => router.push('/consultation-type')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.6, marginTop: 8 },
  subtitle: { fontSize: 15, marginTop: 6, marginBottom: 18 },
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardCopy: { flex: 1 },
  num: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardBody: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  art: {
    width: 86,
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  artItem: { alignItems: 'center', gap: 2 },
  artLabel: { fontSize: 9, fontWeight: '600', color: '#667384' },
  footer: { paddingBottom: 16 },
});
