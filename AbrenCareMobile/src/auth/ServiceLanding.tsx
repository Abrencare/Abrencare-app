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

import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { dashboardFor, onboardingPath, serviceThemes } from '@/service/serviceTheme';
import type { CareService } from '@/types/auth';

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
  midPhoto: ImageSourcePropType;
  doctorPhoto: ImageSourcePropType;
  kickerIcon: IconName;
  ctaIcon: IconName;
  heroItems: Item[];
  included: Item[];
  steps: Item[];
  trust: Item[];
};

export default function ServiceLanding({
  service,
  copy,
  heroPhoto,
  midPhoto,
  doctorPhoto,
  kickerIcon,
  ctaIcon,
  heroItems,
  included,
  steps,
  trust,
}: Props) {
  const router = useRouter();
  const { user, hasService, needsOnboarding } = useAuth();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const [page, setPage] = useState(0);
  const pages = [0, 1, 2];
  const palette = serviceThemes[service];
  const theme = {
    ink: palette.text,
    muted: palette.muted,
    soft: palette.accentSoft,
    icon: palette.accent,
    page: palette.background,
    footer: palette.accent,
    accentLine: palette.accent,
    card: palette.card,
    field: palette.field,
    border: palette.border,
  };

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

  const styles = makeStyles(theme, width, height);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable
          onPress={page === 0 ? goHome : () => goTo(page - 1)}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={theme.ink} />
        </Pressable>
        <View style={styles.dots}>
          {pages.map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  width: page === index ? 20 : 8,
                  backgroundColor: page === index ? theme.icon : theme.soft,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.topSpacer} />
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
          <View style={{ width }}>
            <ScrollView
              style={styles.slide}
              contentContainerStyle={styles.slideContent}
              showsVerticalScrollIndicator={false}
            >
              {item === 0 && (
                <View>
                  <View style={styles.kickerRow}>
                    <Ionicons name={kickerIcon} size={13} color={theme.icon} />
                    <Text style={styles.kicker}>{copy.kicker}</Text>
                  </View>
                  <Text style={styles.headline}>{copy.headline}</Text>
                  <Text style={styles.description}>{copy.description}</Text>
                  <View style={styles.heroItems}>
                    {heroItems.map((entry) => (
                      <View key={entry.label} style={styles.heroItem}>
                        <View style={styles.heroIcon}>
                          <Ionicons name={entry.icon} size={16} color={theme.icon} />
                        </View>
                        <Text style={styles.heroItemLabel}>{entry.label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.heroVisual}>
                    <Image source={heroPhoto} style={styles.heroPhoto} resizeMode="cover" />
                    <View style={styles.stayCard}>
                      <Text style={styles.stayText}>{copy.stayHealthy}</Text>
                      <Text style={styles.stayText}>{copy.stayAhead}</Text>
                      <View style={styles.accentLine} />
                    </View>
                  </View>
                </View>
              )}

              {item === 1 && (
                <View>
                  <Image source={midPhoto} style={styles.midPhoto} resizeMode="cover" />
                  <Text style={styles.sectionTitle}>{copy.includedTitle}</Text>
                  <Text style={styles.sectionSubtitle}>{copy.includedSubtitle}</Text>
                  <View style={styles.includedGrid}>
                    {included.map((entry) => (
                      <View key={entry.title} style={styles.includeCard}>
                        <View style={styles.filledIcon}>
                          <Ionicons name={entry.icon} size={18} color="#FFFFFF" />
                        </View>
                        <Text style={styles.includeTitle}>{entry.title}</Text>
                        <Text style={styles.includeBody}>{entry.body}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.sectionTitle, styles.sectionFollow]}>{copy.howTitle}</Text>
                  <Text style={styles.sectionSubtitle}>{copy.howSubtitle}</Text>
                  <View style={styles.steps}>
                    {steps.map((step, index) => (
                      <View key={step.title} style={styles.step}>
                        <View style={styles.stepTop}>
                          <View style={styles.stepBadge}>
                            <Text style={styles.stepNumber}>{index + 1}</Text>
                          </View>
                          <View style={styles.stepIcon}>
                            <Ionicons name={step.icon} size={18} color={theme.icon} />
                          </View>
                        </View>
                        <View style={styles.stepCopy}>
                          <Text style={styles.stepTitle}>{step.title}</Text>
                          <Text style={styles.stepBody}>{step.body}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {item === 2 && (
                <View>
                  <Image source={doctorPhoto} style={styles.doctorPhoto} resizeMode="cover" />
                  <Text style={styles.whyKicker}>{copy.whyKicker}</Text>
                  <Text style={styles.whyTitle}>{copy.whyTitle}</Text>
                  <Text style={styles.whyBody}>{copy.whyBody}</Text>
                  <View style={styles.trustRow}>
                    {trust.map((entry) => (
                      <View key={entry.label} style={styles.trustItem}>
                        <Ionicons name={entry.icon} size={16} color={theme.icon} />
                        <Text style={styles.trustLabel}>{entry.label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.ctaCard}>
                    <View style={styles.ctaTitleRow}>
                      <Ionicons name={ctaIcon} size={18} color="#FFFFFF" />
                      <Text style={styles.ctaTitle}>{copy.ctaTitle}</Text>
                    </View>
                    <Text style={styles.ctaBody}>{copy.ctaBody}</Text>
                    <Pressable onPress={goSignup} style={styles.ctaButton}>
                      <Text style={styles.ctaButtonText}>{copy.createAccount}</Text>
                      <Ionicons name="arrow-forward" size={16} color={theme.icon} />
                    </Pressable>
                    <Pressable onPress={goLogin} style={styles.loginRow}>
                      <Text style={styles.loginText}>
                        {copy.alreadyAccount} {copy.logIn} →
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function makeStyles(
  theme: {
    ink: string;
    muted: string;
    soft: string;
    icon: string;
    page: string;
    footer: string;
    accentLine: string;
    card: string;
    field: string;
    border: string;
  },
  width: number,
  height: number,
) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.page,
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
      backgroundColor: theme.field,
      borderWidth: 1,
      borderColor: theme.border,
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
      flex: 1,
    },
    slideContent: {
      paddingHorizontal: 22,
      paddingTop: 8,
      paddingBottom: 40,
    },
    kickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    kicker: {
      color: theme.icon,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.4,
    },
    headline: {
      color: theme.ink,
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 38,
      marginBottom: 12,
    },
    description: {
      color: theme.muted,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 20,
    },
    heroItems: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    heroItem: {
      alignItems: 'center',
      width: (width - 44) / 3,
    },
    heroIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.soft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    heroItemLabel: {
      color: theme.ink,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 15,
    },
    heroVisual: {
      borderRadius: 20,
      overflow: 'hidden',
      height: Math.min(280, height * 0.34),
      backgroundColor: theme.card,
      position: 'relative',
    },
    heroPhoto: {
      width: '100%',
      height: '100%',
    },
    stayCard: {
      position: 'absolute',
      top: 16,
      right: 16,
      alignItems: 'flex-end',
      backgroundColor: 'rgba(255,255,255,0.88)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    stayText: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: '600',
    },
    accentLine: {
      marginTop: 6,
      width: 28,
      height: 2,
      backgroundColor: theme.accentLine,
      borderRadius: 1,
    },
    sectionTitle: {
      color: theme.ink,
      fontSize: 26,
      fontWeight: '700',
      marginBottom: 6,
    },
    sectionFollow: {
      marginTop: 28,
    },
    sectionSubtitle: {
      color: theme.muted,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 18,
    },
    includedGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    includeCard: {
      width: (width - 56) / 2,
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 14,
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: `${theme.icon}99`,
    },
    filledIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.icon,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    includeTitle: {
      color: theme.ink,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 6,
    },
    includeBody: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
    },
    steps: {
      gap: 16,
    },
    step: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    stepTop: {
      alignItems: 'center',
      gap: 8,
    },
    stepBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: theme.icon,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.field,
    },
    stepNumber: {
      color: theme.icon,
      fontSize: 11,
      fontWeight: '700',
    },
    stepIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCopy: {
      flex: 1,
      paddingTop: 2,
    },
    stepTitle: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    stepBody: {
      color: theme.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    midPhoto: {
      width: '100%',
      height: Math.min(210, height * 0.26),
      borderRadius: 18,
      marginBottom: 18,
      backgroundColor: theme.card,
    },
    doctorPhoto: {
      width: '100%',
      height: Math.min(210, height * 0.26),
      borderRadius: 18,
      marginBottom: 18,
      backgroundColor: theme.card,
    },
    whyKicker: {
      color: theme.icon,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.3,
      marginBottom: 8,
    },
    whyTitle: {
      color: theme.ink,
      fontSize: 26,
      fontWeight: '700',
      marginBottom: 10,
    },
    whyBody: {
      color: theme.muted,
      fontSize: 15,
      lineHeight: 23,
      marginBottom: 16,
    },
    trustRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 22,
    },
    trustItem: {
      width: (width - 56) / 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    trustLabel: {
      color: theme.ink,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    ctaCard: {
      backgroundColor: theme.footer,
      borderRadius: 22,
      padding: 20,
    },
    ctaTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    ctaTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '700',
      flex: 1,
    },
    ctaBody: {
      color: 'rgba(255,255,255,0.86)',
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 16,
    },
    ctaButton: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.field,
      paddingVertical: 14,
      borderRadius: 24,
    },
    ctaButtonText: {
      color: theme.icon,
      fontSize: 15,
      fontWeight: '700',
    },
    loginRow: {
      marginTop: 14,
      alignItems: 'center',
    },
    loginText: {
      color: 'rgba(255,255,255,0.86)',
      fontSize: 13,
    },
  });
}
