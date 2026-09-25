import React from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import Header from '@/components/navigation/Header/Header';
import HeroCard from '@/components/cards/HeroCard/HeroCard';
import ServiceCard from '@/components/cards/ServiceCard/ServiceCard';
import BottomNavigation from '@/components/navigation/BottomNavigation/BottomNavigation';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { dashboardFor, onboardingPath } from '@/service/serviceTheme';
import type { CareService } from '@/types/auth';

import { styles } from './Home.styles';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors, isDark } = useAppTheme();
  const { user, hasService, needsOnboarding } = useAuth();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.page }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.headerWrap}>
        <Header />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <HeroCard />

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
      </ScrollView>

      <BottomNavigation />
    </SafeAreaView>
  );
}
