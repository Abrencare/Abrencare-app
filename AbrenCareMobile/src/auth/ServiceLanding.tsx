import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  type ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
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
import { dashboardFor, onboardingPath } from '@/service/serviceTheme';
import type { CareService } from '@/types/auth';
import { useAppTheme } from '@/context/ThemeContext';
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

type Props = {
  service: CareService;
  copy: LandingCopy;
  heroPhoto: ImageSourcePropType;
  heroItems: Item[];
  included: Item[];
  steps: Item[];
  trust: Item[];
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
}: Props) {

  const styles = useThemedStyles(baseStyles);
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const { user, hasService, needsOnboarding } = useAuth();
  const ink = isDark ? colors.text : THEME.ink;
  const accent = isDark ? colors.navActive : THEME.accent;
  const line = isDark ? colors.border : THEME.line;
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
              <View style={styles.page}>
                <View>
                  <Text style={styles.kicker}>{copy.kicker}</Text>
                  <View style={styles.heroRow}>
                    <View style={styles.heroCopy}>
                      <Text style={styles.headline}>{copy.headline}</Text>
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
                  <Text style={styles.description}>{copy.description}</Text>
                  <Pressable onPress={goSignup} style={styles.heroButton}>
                    <Text style={styles.heroButtonText}>{copy.createAccount}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={styles.cardGrid}>
                  {heroItems.map((entry) => (
                    <View
                      key={entry.label ?? entry.title}
                      style={[styles.serviceCard, { width: cardWidth }]}
                    >
                      <View style={styles.iconCircle}>
                        <Ionicons name={entry.icon} size={18} color={accent} />
                      </View>
                      <Text style={styles.serviceTitle}>{entry.title ?? entry.label}</Text>
                      {entry.body ? (
                        <Text style={styles.serviceBody}>{entry.body}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {item === 1 && (
              <View style={styles.page}>
                <View>
                  <Text style={styles.sectionTitle}>{copy.howTitle}</Text>
                  <Text style={styles.sectionSubtitle}>{copy.howSubtitle}</Text>
                  <View style={styles.stepRow}>
                    {steps.map((step, index) => (
                      <View key={step.title} style={styles.stepCol}>
                        <View style={styles.stepTrack}>
                          <View style={[styles.stepLine, index === 0 && styles.stepLineHidden]} />
                          <View style={styles.stepBadge}>
                            <Text style={styles.stepNumber}>{index + 1}</Text>
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
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Text style={styles.stepBody}>{step.body}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View>
                  <Text style={styles.sectionTitle}>{copy.includedTitle}</Text>
                  <Text style={styles.sectionSubtitle}>{copy.includedSubtitle}</Text>
                  <View style={styles.cardGrid}>
                    {included.map((entry) => (
                      <View key={entry.title} style={[styles.serviceCard, { width: cardWidth }]}>
                        <View style={styles.iconCircle}>
                          <Ionicons name={entry.icon} size={18} color={accent} />
                        </View>
                        <Text style={styles.serviceTitle}>{entry.title}</Text>
                        <Text style={styles.serviceBody}>{entry.body}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {item === 2 && (
              <View style={styles.page}>
                <View>
                  <Text style={styles.kicker}>{copy.whyKicker}</Text>
                  <Text style={styles.sectionTitle}>{copy.whyTitle}</Text>
                  <Text style={styles.description}>{copy.whyBody}</Text>
                  <View style={styles.cardGrid}>
                    {trust.map((entry) => (
                      <View key={entry.label} style={[styles.whyCard, { width: cardWidth }]}>
                        <View style={styles.iconCircle}>
                          <Ionicons name={entry.icon} size={16} color={accent} />
                        </View>
                        <Text style={styles.whyLabel}>{entry.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.ctaBar}>
                  <Text style={styles.ctaTitle}>{copy.ctaTitle}</Text>
                  <Text style={styles.ctaBody}>{copy.ctaBody}</Text>
                  <Pressable onPress={goSignup} style={styles.ctaButton}>
                    <Text style={styles.ctaButtonText}>{copy.createAccount}</Text>
                    <Ionicons name="arrow-forward" size={16} color={THEME.footer} />
                  </Pressable>
                  <Pressable onPress={goLogin} style={styles.loginRow}>
                    <Text style={styles.loginText}>
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
  page: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  kicker: {
    color: THEME.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
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
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  description: {
    color: THEME.muted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: THEME.muted,
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 11,
    fontWeight: '700',
  },
  stepTitle: {
    color: THEME.ink,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  stepBody: {
    color: THEME.muted,
    fontSize: 11,
    lineHeight: 15,
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
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  serviceBody: {
    color: THEME.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  whyCard: {
    backgroundColor: THEME.soft,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  whyLabel: {
    color: THEME.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  ctaBar: {
    backgroundColor: THEME.footer,
    borderRadius: 22,
    padding: 18,
  },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  ctaBody: {
    color: '#C9D4CE',
    fontSize: 13,
    lineHeight: 19,
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
    fontSize: 14,
    fontWeight: '700',
  },
  loginRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  loginText: {
    color: '#C9D4CE',
    fontSize: 13,
  },
});
