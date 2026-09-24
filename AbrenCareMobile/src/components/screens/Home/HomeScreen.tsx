import React from 'react';
import { SafeAreaView, ScrollView } from 'react-native';

import Header from '@/components/navigation/Header/Header';
import HeroCard from '@/components/cards/HeroCard/HeroCard';
import ServiceCard from '@/components/cards/ServiceCard/ServiceCard';
import BottomNavigation from '@/components/navigation/BottomNavigation/BottomNavigation';

import { styles } from './Home.styles';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Header />
        <HeroCard />
        <ServiceCard />
      </ScrollView>

      <BottomNavigation />
    </SafeAreaView>
  );
}