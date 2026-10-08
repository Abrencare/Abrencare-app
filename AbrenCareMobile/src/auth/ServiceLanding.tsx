import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  type ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BrandLogo from '@/components/ui/BrandLogo';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { dashboardFor, onboardingPath, useServiceTheme } from '@/service/serviceTheme';
import type { CareService } from '@/types/auth';
import { useAppTheme } from '@/context/ThemeContext';
import { useLandingType } from '@/theme/landingType';
import { useThemedStyles } from '@/theme/useThemedStyles';

type IconName = keyof typeof Ionicons.glyphMap;

export type LandingCopy = {
  kicker: string;
  headline: string;
  description: string;
  stayHealthy: string;
  stayAhead: string;
  includedTitle: string;
  includedSubtitle: string;
  howTitle: string;
  howSubtitle: string;
  whyKicker: string;
  whyTitle: string;
  whyBody: string;
  ctaTitle: string;
  ctaBody: string;
  createAccount: string;
  alreadyAccount: string;
  logIn: string;
};

type Item = {
  icon: IconName;
  label?: string;
  title?: string;
  body?: string;
};

/** Replaces the generic "why choose us" page with a single plain-spoken claim. */
export type ManifestoCopy = {
  lead: string;
  emphasis: string;
  lines: string[];
  close: string;
  cta: string;
};

/** Conversation-first proof shown on the Executive intro before any form. */
export type PitchCopy = {
  scarcity: string;
  messageDoctor: string;
  alertCaption: string;
  alertKicker: string;
  alertTitle: string;
  alertBody: string;
  alertTime: string;
  emergencyTitle: string;
  emergencyEta: string;
  emergencyBody: string;
};

/** Pricing and visit types shown on the Consultation intro before signup. */
export type OfferCopy = {
  priceKicker: string;
  priceTitle: string;
  priceSubtitle: string;
  videoTitle: string;
  videoMeta: string;
  messageTitle: string;
  messageMeta: string;
  priceNote: string;
};

type Props = {
  service: CareService;
  copy: LandingCopy;
  heroPhoto: ImageSourcePropType;
  heroItems: Item[];
  included: Item[];
  steps: Item[];
  trust: Item[];
  manifesto?: ManifestoCopy;
  pitch?: PitchCopy;
  offer?: OfferCopy;
};

const THEME = {
  page: '#F7F8F6',
  ink: '#16332C',
  muted: '#5C6B65',
  soft: '#E7EEEA',
  accent: '#1A4A42',
  footer: '#1A3A32',
  card: '#FFFFFF',
  line: '#D5DDD8',
};

export default function ServiceLanding({
  service,
  copy,
  heroPhoto,
  heroItems,
  included,
  steps,
  trust,
  manifesto,
  pitch,
  offer,
}: Props) {

  const styles = useThemedStyles(baseStyles);
  const type = useLandingType(service);
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const { user, hasService, needsOnboarding } = useAuth();
  const palette = useServiceTheme(service);
  const ink = isDark ? colors.text : THEME.ink;
  const accent = service === 'executive' ? palette.accent : isDark ? colors.navActive : THEME.accent;
  const line = isDark ? colors.border : THEME.line;
  const ctaFill =
    service === 'executive' || service === 'consultation'
      ? palette.accent
      : THEME.footer;
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const [page, setPage] = useState(0);
  const pages = [0, 1, 2];
  const slideHeight = height - 92;
  const photoSize = Math.min(168, width * 0.42);
  const cardWidth = (width - 56) / 2;

  if (user && hasService(service) && !needsOnboarding(service)) {
    return <Replace href={dashboardFor(service)} />;
  }

  if (user && hasService(service) && needsOnboarding(service)) {
    return <Replace href={onboardingPath(service)} />;
  }

  function goHome() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  }

  function goSignup() {
    router.push({ pathname: '/signup', params: { service } });
  }

  function goPreviewChat() {
    router.push('/executive-preview-chat');
  }

  function goLogin() {
    router.push({ pathname: '/login', params: { service } });
  }

  function goTo(index: number) {
    const next = Math.max(0, Math.min(index, pages.length - 1));
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setPage(next);
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setPage(Math.max(0, Math.min(next, pages.length - 1)));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable
          onPress={page === 0 ? goHome : () => goTo(page - 1)}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={ink} />
        </Pressable>
        <BrandLogo size={36} />
        <View style={styles.dots}>
          {pages.map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  width: page === index ? 20 : 8,
                  backgroundColor: page === index ? accent : line,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(item) => String(item)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width, height: slideHeight }]}>
            {item === 0 && (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.pageScroll}
                showsVerticalScrollIndicator={false}
              >
                <View>
                  <Text style={[styles.kicker, type.kicker]}>{copy.kicker}</Text>
                  <View style={styles.heroRow}>
                    <View style={styles.heroCopy}>
                      <Text style={[styles.headline, type.headline]}>{copy.headline}</Text>
                    </View>
                    <View
                      style={[
                        styles.heroPhotoWrap,
                        { width: photoSize, height: photoSize, borderRadius: photoSize / 2 },
                      ]}
                    >
                      <Image source={heroPhoto} style={styles.heroPhoto} resizeMode="cover" />
                    </View>
                  </View>
                  <Text style={[styles.description, type.body]}>{copy.description}</Text>
                  <Pressable
                    onPress={goSignup}
                    style={[styles.heroButton, { backgroundColor: ctaFill }]}
                  >
                    <Text style={[styles.heroButtonText, type.button]}>{copy.createAccount}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </Pressable>
                  {pitch ? (
                    <>
                      <Text style={[styles.scarcity, type.caption]}>{pitch.scarcity}</Text>
                      <Pressable onPress={goPreviewChat} style={styles.ghostButton}>
                        <Ionicons name="chatbubbles-outline" size={16} color={accent} />
                        <Text style={[styles.ghostButtonText, type.button, { color: accent }]}>
                          {pitch.messageDoctor}
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                  {offer ? (
                    <View style={styles.priceStrip}>
                      <Text style={[styles.priceStripKicker, type.kicker]}>
                        {offer.priceKicker}
                      </Text>
                      <Text style={[styles.priceStripTitle, type.label]}>
                        {offer.videoMeta}
                      </Text>
                      <Text style={[styles.priceStripMeta, type.caption]}>
                        {offer.messageMeta}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.cardGrid, { marginTop: 20 }]}>
                  {heroItems.map((entry) => (
                    <View
                      key={entry.label ?? entry.title}
                      style={[styles.serviceCard, { width: cardWidth }]}
                    >
                      <View style={styles.iconCircle}>
                        <Ionicons name={entry.icon} size={18} color={accent} />
                      </View>
                      <Text style={[styles.serviceTitle, type.label]}>{entry.title ?? entry.label}</Text>
                      {entry.body ? (
                        <Text style={[styles.serviceBody, type.caption]}>{entry.body}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {item === 1 && pitch && (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.pageScroll}
                showsVerticalScrollIndicator={false}
              >
                <View>
                  <Text style={[styles.proofCaption, type.section]}>{pitch.alertCaption}</Text>
                  <View style={styles.alertShot}>
                    <View style={styles.alertShotTop}>
                      <View style={styles.alertDot} />
                      <Text style={[styles.alertKicker, type.kicker]}>{pitch.alertKicker}</Text>
                    </View>
                    <Text style={[styles.alertTitle, type.label]}>{pitch.alertTitle}</Text>
                    <Text style={[styles.alertBody, type.bodySmall]}>{pitch.alertBody}</Text>
                    <Text style={[styles.alertTime, type.caption]}>{pitch.alertTime}</Text>
                  </View>
                </View>

                <View style={styles.emergencyCard}>
                  <View style={styles.emergencyEta}>
                    <Ionicons name="flash" size={18} color="#FFFFFF" />
                    <Text style={[styles.emergencyEtaText, type.kicker]}>{pitch.emergencyEta}</Text>
                  </View>
                  <Text style={[styles.emergencyTitle, type.section]}>{pitch.emergencyTitle}</Text>
                  <Text style={[styles.emergencyBody, type.bodySmall]}>{pitch.emergencyBody}</Text>
                </View>
              </ScrollView>
            )}

            {item === 1 && offer && !pitch && (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.pageScroll}
                showsVerticalScrollIndicator={false}
              >
                <View>
                  <Text style={[styles.kicker, type.kicker]}>{offer.priceKicker}</Text>
                  <Text style={[styles.sectionTitle, type.section]}>{offer.priceTitle}</Text>
                  <Text style={[styles.sectionSubtitle, type.bodySmall]}>
                    {offer.priceSubtitle}
                  </Text>

                  <View style={[styles.offerCard, { borderColor: line }]}>
                    <View style={[styles.iconCircle, { backgroundColor: palette.accentSoft }]}>
                      <Ionicons name="videocam-outline" size={18} color={accent} />
                    </View>
                    <Text style={[styles.offerTitle, type.label]}>{offer.videoTitle}</Text>
                    <Text style={[styles.offerMeta, type.bodySmall]}>{offer.videoMeta}</Text>
                  </View>

                  <View style={[styles.offerCard, { borderColor: line }]}>
                    <View style={[styles.iconCircle, { backgroundColor: palette.accentSoft }]}>
                      <Ionicons name="chatbubbles-outline" size={18} color={accent} />
                    </View>
                    <Text style={[styles.offerTitle, type.label]}>{offer.messageTitle}</Text>
                    <Text style={[styles.offerMeta, type.bodySmall]}>{offer.messageMeta}</Text>
                  </View>
                </View>

                <Text style={[styles.offerNote, type.caption]}>{offer.priceNote}</Text>
              </ScrollView>
            )}

            {item === 1 && !pitch && !offer && (
              <View style={styles.page}>
                <View>
                  <Text style={[styles.sectionTitle, type.section]}>{copy.howTitle}</Text>
                  <Text style={[styles.sectionSubtitle, type.bodySmall]}>{copy.howSubtitle}</Text>
                  <View style={styles.stepRow}>
                    {steps.map((step, index) => (
                      <View key={step.title} style={styles.stepCol}>
                        <View style={styles.stepTrack}>
                          <View style={[styles.stepLine, index === 0 && styles.stepLineHidden]} />
                          <View style={styles.stepBadge}>
                            <Text style={[styles.stepNumber, type.caption]}>{index + 1}</Text>
                          </View>
                          <View
                            style={[
                              styles.stepLine,
                              index === steps.length - 1 && styles.stepLineHidden,
                            ]}
                          />
                        </View>
                        <View style={styles.iconCircle}>
                          <Ionicons name={step.icon} size={16} color={accent} />
                        </View>
                        <Text style={[styles.stepTitle, type.label]}>{step.title}</Text>
                        <Text style={[styles.stepBody, type.caption]}>{step.body}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View>
                  <Text style={[styles.sectionTitle, type.section]}>{copy.includedTitle}</Text>
                  <Text style={[styles.sectionSubtitle, type.bodySmall]}>{copy.includedSubtitle}</Text>
                  <View style={styles.cardGrid}>
                    {included.map((entry) => (
                      <View key={entry.title} style={[styles.serviceCard, { width: cardWidth }]}>
                        <View style={styles.iconCircle}>
                          <Ionicons name={entry.icon} size={18} color={accent} />
                        </View>
                        <Text style={[styles.serviceTitle, type.label]}>{entry.title}</Text>
                        <Text style={[styles.serviceBody, type.caption]}>{entry.body}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {item === 2 && pitch && (
              <View style={styles.page}>
                <View>
                  <Text style={[styles.sectionTitle, type.section]}>{copy.howTitle}</Text>
                  <Text style={[styles.sectionSubtitle, type.bodySmall]}>{copy.howSubtitle}</Text>
                  <View style={styles.stepRow}>
                    {steps.map((step, index) => (
                      <View key={step.title} style={styles.stepCol}>
                        <View style={styles.stepTrack}>
                          <View style={[styles.stepLine, index === 0 && styles.stepLineHidden]} />
                          <View style={styles.stepBadge}>
                            <Text style={[styles.stepNumber, type.caption]}>{index + 1}</Text>
                          </View>
                          <View
                            style={[
                              styles.stepLine,
                              index === steps.length - 1 && styles.stepLineHidden,
                            ]}
                          />
                        </View>
                        <View style={styles.iconCircle}>
                          <Ionicons name={step.icon} size={16} color={accent} />
                        </View>
                        <Text style={[styles.stepTitle, type.label]}>{step.title}</Text>
                        <Text style={[styles.stepBody, type.caption]}>{step.body}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={[styles.ctaBar, { backgroundColor: palette.text }]}>
                  <Text style={[styles.ctaTitle, type.section]}>{copy.ctaTitle}</Text>
                  <Text style={[styles.ctaBody, type.bodySmall]}>{copy.ctaBody}</Text>
                  <Pressable
                    onPress={goSignup}
                    style={[styles.ctaButton, { backgroundColor: '#FFFFFF' }]}
                  >
                    <Text style={[styles.ctaButtonText, type.button, { color: palette.accent }]}>
                      {copy.createAccount}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={palette.accent} />
                  </Pressable>
                </View>
              </View>
            )}

            {item === 2 && manifesto && (
              <View style={styles.manifestoPage}>
                <View>
                  <Text style={[styles.manifestoLead, type.headline]}>{manifesto.lead}</Text>
                  <Text style={[styles.manifestoEmphasis, type.headline]}>
                    {manifesto.emphasis}
                  </Text>

                  <View style={styles.manifestoLines}>
                    {manifesto.lines.map((line) => (
                      <Text key={line} style={[styles.manifestoLine, type.body]}>
                        {line}
                      </Text>
                    ))}
                  </View>

                  <Text style={[styles.manifestoClose, type.section]}>{manifesto.close}</Text>
                </View>

                <Pressable onPress={goSignup} style={styles.manifestoButton}>
                  <Text style={[styles.manifestoButtonText, type.button]}>
                    {manifesto.cta}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            )}

            {item === 2 && !manifesto && !pitch && (
              <View style={styles.page}>
                <View>
                  <Text style={[styles.kicker, type.kicker]}>{copy.whyKicker}</Text>
                  <Text style={[styles.sectionTitle, type.section]}>{copy.whyTitle}</Text>
                  <Text style={[styles.description, type.body]}>{copy.whyBody}</Text>
                  <View style={styles.cardGrid}>
                    {trust.map((entry) => (
                      <View key={entry.label} style={[styles.whyCard, { width: cardWidth }]}>
                        <View style={styles.iconCircle}>
                          <Ionicons name={entry.icon} size={16} color={accent} />
                        </View>
                        <Text style={[styles.whyLabel, type.label]}>{entry.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={[styles.ctaBar, service === 'executive' && { backgroundColor: palette.text }]}>
                  <Text style={[styles.ctaTitle, type.section]}>{copy.ctaTitle}</Text>
                  <Text style={[styles.ctaBody, type.bodySmall]}>{copy.ctaBody}</Text>
                  <Pressable onPress={goSignup} style={[styles.ctaButton, service === 'executive' && { backgroundColor: '#FFFFFF' }]}>
                    <Text style={[styles.ctaButtonText, type.button, service === 'executive' && { color: palette.accent }]}>{copy.createAccount}</Text>
                    <Ionicons name="arrow-forward" size={16} color={service === 'executive' ? palette.accent : THEME.footer} />
                  </Pressable>
                  <Pressable onPress={goLogin} style={styles.loginRow}>
                    <Text style={[styles.loginText, type.caption]}>
                      {copy.alreadyAccount} {copy.logIn} →
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.page,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSpacer: {
    width: 40,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  slide: {
    backgroundColor: THEME.page,
  },
  flex: { flex: 1 },
  pageScroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  page: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  kicker: {
    color: THEME.accent,
    marginBottom: 10,
  },
  manifestoPage: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  manifestoLead: {
    color: THEME.ink,
  },
  manifestoEmphasis: {
    color: THEME.accent,
    marginTop: 2,
  },
  manifestoLines: {
    marginTop: 34,
    gap: 12,
  },
  manifestoLine: {
    color: THEME.muted,
  },
  manifestoClose: {
    color: THEME.ink,
    marginTop: 34,
  },
  manifestoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: THEME.footer,
    paddingVertical: 17,
    borderRadius: 28,
  },
  manifestoButtonText: {
    color: '#FFFFFF',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  heroCopy: {
    flex: 1,
    paddingTop: 4,
  },
  headline: {
    color: THEME.ink,
  },
  description: {
    color: THEME.muted,
    marginBottom: 16,
  },
  scarcity: {
    color: THEME.muted,
    marginTop: 10,
    maxWidth: 280,
  },
  ghostButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
  },
  ghostButtonText: {},
  proofCaption: {
    color: THEME.ink,
    marginBottom: 16,
  },
  alertShot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3D8D4',
    padding: 16,
    shadowColor: '#2A2622',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  alertShotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C2453A',
  },
  alertKicker: {
    color: '#C2453A',
  },
  alertTitle: {
    color: THEME.ink,
    marginBottom: 6,
  },
  alertBody: {
    color: THEME.muted,
  },
  alertTime: {
    color: '#A79B87',
    marginTop: 12,
  },
  emergencyCard: {
    backgroundColor: '#2B2318',
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
  },
  emergencyEta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  emergencyEtaText: {
    color: '#FFFFFF',
  },
  emergencyTitle: {
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emergencyBody: {
    color: 'rgba(243, 232, 208, 0.82)',
  },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.footer,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  heroButtonText: {
    color: '#FFFFFF',
  },
  heroPhotoWrap: {
    overflow: 'hidden',
    backgroundColor: THEME.soft,
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: THEME.ink,
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: THEME.muted,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
  },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.line,
  },
  stepLineHidden: {
    backgroundColor: 'transparent',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.accent,
    backgroundColor: THEME.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: THEME.accent,
  },
  stepTitle: {
    color: THEME.ink,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  stepBody: {
    color: THEME.muted,
    textAlign: 'center',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    backgroundColor: THEME.card,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  serviceTitle: {
    color: THEME.ink,
    marginTop: 8,
    marginBottom: 4,
  },
  serviceBody: {
    color: THEME.muted,
  },
  whyCard: {
    backgroundColor: THEME.soft,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  whyLabel: {
    color: THEME.ink,
  },
  ctaBar: {
    backgroundColor: THEME.footer,
    borderRadius: 22,
    padding: 18,
  },
  ctaTitle: {
    color: '#FFFFFF',
    marginBottom: 6,
  },
  ctaBody: {
    color: '#C9D4CE',
    marginBottom: 14,
  },
  ctaButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.card,
    paddingVertical: 13,
    borderRadius: 24,
  },
  ctaButtonText: {
    color: THEME.footer,
  },
  loginRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  loginText: {
    color: '#C9D4CE',
  },
  priceStrip: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.line,
  },
  priceStripKicker: {
    color: THEME.accent,
    marginBottom: 6,
  },
  priceStripTitle: {
    color: THEME.ink,
    marginBottom: 4,
  },
  priceStripMeta: {
    color: THEME.muted,
  },
  offerCard: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  offerTitle: {
    color: THEME.ink,
    marginTop: 10,
    marginBottom: 4,
  },
  offerMeta: {
    color: THEME.muted,
  },
  offerNote: {
    color: THEME.muted,
    marginTop: 8,
  },
});
