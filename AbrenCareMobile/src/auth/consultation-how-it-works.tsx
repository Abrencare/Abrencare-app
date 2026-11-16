import type { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import ConsultationChrome, {
  TealButton,
} from '@/components/consultation/ConsultationChrome';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';

const NAVY = '#24406B';
const TEAL = '#0F8F80';
const LINE = '#D5DDE8';

// One entry per step: card wash, number badge and illustration backdrop colors.
const STEPS = [
  { n: '1', tint: '#EAF3FC', wash: '#F7FBFF', badge: '#D3E6F8', ink: '#2C6CB5', disc: '#D9EAFA' },
  { n: '2', tint: '#E6F6F1', wash: '#F6FCFA', badge: '#C9EDE3', ink: '#117F6D', disc: '#CFEFE6' },
  { n: '3', tint: '#FFF3DE', wash: '#FFFAF1', badge: '#FAE0AE', ink: '#BE8410', disc: '#FCE8BF' },
  { n: '4', tint: '#EFEAFA', wash: '#F9F7FE', badge: '#DCD1F3', ink: '#5A43A6', disc: '#E2D9F5' },
  { n: '5', tint: '#FCEAF0', wash: '#FFF7FA', badge: '#F7D0DD', ink: '#B5305D', disc: '#F9D9E4' },
] as const;

/* ------------------------------------------------------------------ */
/* Illustrations, drawn with plain views so they stay sharp at any     */
/* screen density and follow the step colors.                          */
/* ------------------------------------------------------------------ */

function Backdrop({ color }: { color: string }) {
  return <View style={[art.disc, { backgroundColor: color }]} />;
}

function PhoneArt({
  disc,
  videoLabel,
  audioLabel,
}: {
  disc: string;
  videoLabel: string;
  audioLabel: string;
}) {
  return (
    <View style={art.stage}>
      <Backdrop color={disc} />
      <View style={art.phone}>
        <View style={art.phoneNotch} />
        <View style={art.tile}>
          <Ionicons name="videocam" size={15} color={NAVY} />
          <Text style={art.tileLabel} numberOfLines={1}>
            {videoLabel}
          </Text>
        </View>
        <View style={art.tile}>
          <Ionicons name="call" size={14} color="#3B82D6" />
          <Text style={art.tileLabel} numberOfLines={1}>
            {audioLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

function FormArt({ disc }: { disc: string }) {
  return (
    <View style={art.stage}>
      <Backdrop color={disc} />
      <View style={art.formCard}>
        <View style={[art.formLine, { width: '88%' }]} />
        <View style={[art.formLine, { width: '70%' }]} />
        <View style={[art.formLine, { width: '52%' }]} />
        <View style={art.cursor} />
      </View>
      <View style={[art.badge, art.badgeBottomRight, art.badgeWhite]}>
        <Ionicons name="document-text-outline" size={16} color={NAVY} />
      </View>
    </View>
  );
}

function CalendarArt({ disc }: { disc: string }) {
  const cells = Array.from({ length: 12 }, (_, i) => i);
  return (
    <View style={art.stage}>
      <Backdrop color={disc} />
      <View style={art.calendar}>
        <View style={art.calendarTop}>
          <View style={art.ring} />
          <View style={art.ring} />
        </View>
        <View style={art.calendarGrid}>
          {cells.map((i) => (
            <View
              key={i}
              style={[art.calendarCell, i === 6 && { backgroundColor: TEAL }]}
            />
          ))}
        </View>
      </View>
      <View style={[art.badge, art.badgeBottomRight, art.badgeWhite]}>
        <Ionicons name="time-outline" size={18} color={NAVY} />
      </View>
    </View>
  );
}

function PaymentArt({ disc }: { disc: string }) {
  return (
    <View style={art.stage}>
      <Backdrop color={disc} />
      <View style={art.payCard}>
        <View style={art.chip} />
        <View style={[art.payLine, { width: '70%' }]} />
        <View style={[art.payLine, { width: '45%', opacity: 0.6 }]} />
      </View>
      <View style={[art.badge, art.badgeTopRight, art.badgeNavy]}>
        <Ionicons name="shield-checkmark" size={15} color="#FFFFFF" />
      </View>
    </View>
  );
}

function SummaryArt({ disc }: { disc: string }) {
  return (
    <View style={art.stage}>
      <Backdrop color={disc} />
      <View style={art.doc}>
        <View style={art.plusV} />
        <View style={art.plusH} />
        <View style={[art.docLine, { width: '82%' }]} />
        <View style={[art.docLine, { width: '64%' }]} />
        <View style={[art.docLine, { width: '74%' }]} />
      </View>
      <View style={[art.badge, art.badgeBottomRight, art.badgeGreen]}>
        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
      </View>
    </View>
  );
}

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

  const illustrations: ReactNode[] = [
    <PhoneArt
      key="1"
      disc={STEPS[0].disc}
      videoLabel={copy.videoTitle}
      audioLabel={copy.audioTitle}
    />,
    <FormArt key="2" disc={STEPS[1].disc} />,
    <CalendarArt key="3" disc={STEPS[2].disc} />,
    <PaymentArt key="4" disc={STEPS[3].disc} />,
    <SummaryArt key="5" disc={STEPS[4].disc} />,
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
              style={[styles.cardShadow, { backgroundColor: visual.tint }]}
            >
              <LinearGradient
                colors={[visual.tint, visual.wash]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.card}
              >
                <View style={[styles.numBadge, { backgroundColor: visual.badge }]}>
                  <Text style={[styles.num, { color: visual.ink }]}>{visual.n}</Text>
                </View>

                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {step.title}
                  </Text>
                  <Text style={[styles.cardBody, { color: theme.muted }]}>
                    {step.body}
                  </Text>
                </View>

                <View style={styles.artSlot}>{illustrations[index]}</View>
              </LinearGradient>
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
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 8 },
  subtitle: { fontSize: 15, lineHeight: 21, marginTop: 6, marginBottom: 20 },
  cardShadow: {
    borderRadius: 24,
    marginBottom: 12,
    shadowColor: '#1B2F4B',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
    minHeight: 104,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  numBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { fontSize: 19, fontWeight: '800' },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800', letterSpacing: -0.2 },
  cardBody: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  artSlot: { width: 104, height: 84, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingBottom: 16 },
});

const SOFT_SHADOW = {
  shadowColor: '#1B2F4B',
  shadowOpacity: 0.14,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
} as const;

const art = StyleSheet.create({
  stage: { width: 104, height: 84, alignItems: 'center', justifyContent: 'center' },
  disc: { position: 'absolute', width: 80, height: 80, borderRadius: 40 },

  // Step 1: phone with the two visit types
  phone: {
    width: 60,
    height: 80,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: NAVY,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 6,
    ...SOFT_SHADOW,
  },
  phoneNotch: {
    position: 'absolute',
    top: 3,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: NAVY,
  },
  tile: {
    width: 46,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F6F9FD',
    borderWidth: 1,
    borderColor: '#DCE6F2',
    gap: 1,
  },
  tileLabel: { fontSize: 7, fontWeight: '700', color: NAVY },

  // Step 2: form card
  formCard: {
    width: 76,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    justifyContent: 'center',
    gap: 6,
    marginRight: 6,
    ...SOFT_SHADOW,
  },
  formLine: { height: 4, borderRadius: 2, backgroundColor: LINE },
  cursor: {
    position: 'absolute',
    left: 9,
    bottom: 8,
    width: 2,
    height: 9,
    borderRadius: 1,
    backgroundColor: NAVY,
  },

  // Step 3: calendar
  calendar: {
    width: 66,
    height: 62,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginRight: 8,
    ...SOFT_SHADOW,
  },
  calendarTop: {
    height: 14,
    backgroundColor: NAVY,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
  },
  ring: {
    width: 4,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: -1,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
    paddingTop: 6,
    gap: 4,
  },
  calendarCell: {
    width: 11,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#E3E9F1',
  },

  // Step 4: payment card with a shield
  payCard: {
    width: 74,
    height: 48,
    borderRadius: 10,
    backgroundColor: TEAL,
    padding: 8,
    justifyContent: 'flex-end',
    gap: 4,
    ...SOFT_SHADOW,
  },
  chip: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 16,
    height: 11,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  payLine: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)' },

  // Step 5: summary document
  doc: {
    width: 54,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingTop: 28,
    gap: 5,
    marginRight: 4,
    ...SOFT_SHADOW,
  },
  plusV: {
    position: 'absolute',
    top: 8,
    left: 24,
    width: 6,
    height: 16,
    borderRadius: 2,
    backgroundColor: NAVY,
  },
  plusH: {
    position: 'absolute',
    top: 13,
    left: 19,
    width: 16,
    height: 6,
    borderRadius: 2,
    backgroundColor: NAVY,
  },
  docLine: { height: 3, borderRadius: 2, backgroundColor: LINE },

  // Round badges that sit on the corners of the illustrations
  badge: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...SOFT_SHADOW,
  },
  badgeBottomRight: { right: 4, bottom: 4 },
  badgeTopRight: { right: 2, top: 2 },
  badgeWhite: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: NAVY },
  badgeNavy: { backgroundColor: NAVY },
  badgeGreen: { backgroundColor: TEAL },
});
