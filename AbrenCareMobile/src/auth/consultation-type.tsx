import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ConsultationChrome from '@/components/consultation/ConsultationChrome';
import { useAuth } from '@/context/AuthContext';
import { useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import { type VisitKind } from '@/data/consultationPricing';
import { onboardingPath, useServiceTheme } from '@/service/serviceTheme';

export default function ConsultationTypeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const { user, hasService, needsOnboarding } = useAuth();
  const { draft, setDraft } = useConsultations();
  const copy = t.consultationFlow;
  const [kind, setKind] = useState<VisitKind>(draft.kind || 'video');

  function pick(next: VisitKind) {
    setKind(next);
    setDraft({ kind: next });
    if (user && hasService('consultation')) {
      router.replace(
        needsOnboarding('consultation')
          ? onboardingPath('consultation')
          : '/consultation/doctors',
      );
      return;
    }
    router.push({ pathname: '/signup', params: { service: 'consultation' } });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#FFFFFF' }]}>
      <ConsultationChrome kicker={copy.typeKicker} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]}>{copy.typeTitle}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{copy.typeSubtitle}</Text>

        <TypeCard
          selected={kind === 'video'}
          icon="videocam-outline"
          title={copy.videoTitle}
          meta={copy.videoMeta}
          onPress={() => pick('video')}
        />
        <TypeCard
          selected={kind === 'message'}
          icon="chatbubble-outline"
          title={t.consultationLanding.messageTitle}
          meta={t.consultationLanding.messageMeta}
          onPress={() => pick('message')}
        />

        <Text style={[styles.note, { color: theme.muted }]}>{copy.typeNote}</Text>
      </View>
    </SafeAreaView>
  );
}

function TypeCard({
  selected,
  icon,
  title,
  meta,
  onPress,
}: {
  selected: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta: string;
  onPress: () => void;
}) {
  const theme = useServiceTheme('consultation');

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          borderColor: selected ? theme.accent : theme.border,
          backgroundColor: '#FFFFFF',
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
        <Ionicons name={icon} size={20} color={theme.accent} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.cardMeta, { color: theme.muted }]}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 22 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardMeta: { fontSize: 13, marginTop: 4 },
  note: { fontSize: 13, lineHeight: 20, marginTop: 16 },
});
