import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';


import ConsultationChrome, {
  TealButton,
} from '@/components/consultation/ConsultationChrome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import { parseVisitKind, type VisitKind } from '@/data/consultationPricing';
import { doctorsAvailableNow } from '@/data/doctors';
import { useServiceTheme } from '@/service/serviceTheme';

export default function ConsultNowScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const { draft, setDraft } = useConsultations();
  const params = useLocalSearchParams();
  const copy = t.consultationFlow;
  const [checked, setChecked] = useState(false);
  const [checking, setChecking] = useState(false);
  const available = doctorsAvailableNow();
  const [kind, setKind] = useState<VisitKind>(() =>
    parseVisitKind(params.kind || draft.kind),
  );

  function check() {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setChecked(true);
      const doctor = available[0];
      if (!doctor) {
        return;
      }
      setDraft({ kind, doctorId: doctor.id });
      router.push({
        pathname: '/consultation/pay',
        params: {
          doctor: doctor.id,
          kind,
          next: kind === 'message' ? 'chat' : 'call',
        },
      });
    }, 700);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ConsultationChrome />
      <View style={[styles.body, { flex: 1 }]}>
        <Text style={[styles.title, { color: theme.text }]}>{copy.nowTitle}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{copy.nowSubtitle}</Text>

        <View style={[styles.notice, { backgroundColor: theme.accentSoft }]}>
          <Ionicons name="time-outline" size={18} color={theme.accent} />
          <View style={styles.noticeCopy}>
            <Text style={[styles.noticeTitle, { color: theme.text }]}>
              {copy.availability}
            </Text>
            <Text style={[styles.noticeBody, { color: theme.muted }]}>
              {copy.availabilityBody}
            </Text>
          </View>
        </View>

        <Text style={[styles.section, { color: theme.muted }]}>{copy.chooseType}</Text>
        <View style={styles.row}>
          {(['video', 'message'] as VisitKind[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                setKind(item);
                setDraft({ kind: item });
              }}
              style={[
                styles.kind,
                {
                  borderColor: kind === item ? theme.accent : theme.border,
                  backgroundColor: '#FFFFFF',
                },
              ]}
            >
              <Ionicons
                name={item === 'video' ? 'videocam-outline' : 'chatbubble-outline'}
                size={18}
                color={theme.accent}
              />
              <Text style={[styles.kindTitle, { color: theme.text }]}>
                {item === 'video' ? copy.videoConsult : t.consultationLanding.messageTitle}
              </Text>
              <Text style={[styles.kindMeta, { color: theme.muted }]}>
                {item === 'video' ? copy.videoConsultMeta : t.consultationLanding.messageMeta}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.before, { borderColor: theme.border }]}>
          <Text style={[styles.beforeTitle, { color: theme.text }]}>{copy.beforePay}</Text>
          <Text style={[styles.noticeBody, { color: theme.muted }]}>
            {copy.beforePayBody}
          </Text>
        </View>

        {checked && available.length === 0 ? (
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {copy.noneAvailable}
            </Text>
            <Text style={[styles.noticeBody, { color: theme.muted }]}>
              {copy.noneAvailableBody}
            </Text>
          </View>
        ) : null}
      </View>

      {checked && available.length === 0 ? (
        <TealButton
          label={copy.bookInstead}
          onPress={() => router.replace('/consultation/doctors')}
        />
      ) : (
        <TealButton
          label={checking ? copy.checking : copy.checkAvailability}
          disabled={checking}
          onPress={check}
        />
      )}
      <Text style={[styles.note, { color: theme.muted }]}>{copy.notEmergency}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 16 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  noticeCopy: { flex: 1 },
  noticeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  noticeBody: { fontSize: 13, lineHeight: 18 },
  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kind: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  kindTitle: { fontSize: 14, fontWeight: '700' },
  kindMeta: { fontSize: 12 },
  before: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  beforeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  empty: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  note: {
    textAlign: 'center',
    fontSize: 11,
    marginHorizontal: 24,
    marginTop: 10,
    marginBottom: 12,
  },
});
