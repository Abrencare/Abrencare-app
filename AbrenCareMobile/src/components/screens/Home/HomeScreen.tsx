import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '@/components/navigation/Header/Header';
import HeroCard from '@/components/cards/HeroCard/HeroCard';
import ServiceCard from '@/components/cards/ServiceCard/ServiceCard';
import BottomNavigation from '@/components/navigation/BottomNavigation/BottomNavigation';
import { withAlpha } from '@/components/executive/GlassCard';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useHomeNotifications } from '@/hooks/useHomeNotifications';
import { dashboardFor, onboardingPath } from '@/service/serviceTheme';
import type { CareService } from '@/types/auth';

import { styles } from './Home.styles';

const HERO = require('@/assets/images/welcome-care-room.jpg');
const FILL = '#1A3A32';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user, hasService, needsOnboarding } = useAuth();
  const notices = useHomeNotifications();
  const accessNotices = notices.filter(
    (notice) =>
      notice.id.endsWith('plan-approved') ||
      notice.id.endsWith('care-accepted') ||
      notice.id.endsWith('plan-ready'),
  );
  const activeService = (['family', 'executive', 'consultation'] as CareService[]).find(
    (service) => hasService(service),
  );

  function continueCare() {
    if (!activeService) {
      return;
    }
    if (needsOnboarding(activeService)) {
      router.push(onboardingPath(activeService));
      return;
    }
    router.push(dashboardFor(activeService));
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.page }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <Image source={HERO} style={styles.heroPhoto} resizeMode="cover" />
          <LinearGradient
            colors={[FILL, withAlpha(FILL, 0.94), withAlpha(FILL, 0.42)]}
            locations={[0, 0.52, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.heroFade}
          />
          <View style={styles.headerWrap}>
            <Header tone="hero" />
          </View>
        </View>

        <View style={styles.body}>
          <HeroCard />

          {accessNotices.map((notice) => (
            <Pressable
              key={notice.id}
              onPress={() => router.push(notice.href as Parameters<typeof router.push>[0])}
              style={[
                styles.continueCard,
                {
                  backgroundColor: notice.id.includes('executive') ? '#C4A05A' : colors.continue,
                },
              ]}
            >
              <View style={styles.continueIcon}>
                <Ionicons name={notice.icon} size={16} color={colors.continueTitle} />
              </View>
              <View style={styles.continueCopy}>
                <Text style={[styles.continueKicker, { color: colors.continueKicker }]}>
                  {t.header.notifications}
                </Text>
                <Text style={[styles.continueTitle, { color: colors.continueTitle }]}>
                  {notice.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.continueChevron} />
            </Pressable>
          ))}

          {user && activeService ? (
            <Pressable
              onPress={continueCare}
              style={[styles.continueCard, { backgroundColor: colors.continue }]}
            >
              <View style={styles.continueIcon}>
                <Ionicons name="arrow-forward" size={16} color={colors.continueTitle} />
              </View>
              <View style={styles.continueCopy}>
                <Text style={[styles.continueKicker, { color: colors.continueKicker }]}>
                  {t.home.continueCare}
                </Text>
                <Text style={[styles.continueTitle, { color: colors.continueTitle }]}>
                  {activeService === 'family'
                    ? t.home.familyTitle
                    : activeService === 'executive'
                      ? t.home.executiveTitle
                      : t.home.consultationTitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.continueChevron} />
            </Pressable>
          ) : null}

          <ServiceCard />

          <View style={styles.legalRow}>
            <Pressable
              onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}
              hitSlop={8}
            >
              <Text style={[styles.legalLink, { color: colors.muted }]}>
                {t.auth.termsLink}
              </Text>
            </Pressable>
            <Text style={[styles.legalDot, { color: colors.muted }]}>·</Text>
            <Pressable
              onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}
              hitSlop={8}
            >
              <Text style={[styles.legalLink, { color: colors.muted }]}>
                {t.auth.privacyLink}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}
