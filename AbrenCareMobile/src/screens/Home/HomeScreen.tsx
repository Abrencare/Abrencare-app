import React from 'react';
import { SafeAreaView, ScrollView } from 'react-native';

import Header from '@/Header/Header';
import HeroCard from '@/HeroCard/HeroCard';
import ServiceCard from '@/screens/ServiceCard/ServiceCard';
import BottomNavigation from '@/BottomNavigation/BottomNavigation';

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