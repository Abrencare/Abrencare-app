import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import ServiceAccessGate from '@/components/gates/ServiceAccessGate';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export default function ExecutiveLayout() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();

  return (
    <ServiceAccessGate service="executive">
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C4A05A',
        tabBarInactiveTintColor: colors.navInactive,
        tabBarStyle: {
          height: 70,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: colors.nav,
          borderTopWidth: 1,
          borderTopColor: colors.navBorder,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.dashboard,
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons name={focused ? 'medkit' : 'medkit-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="programme"
        options={{
          title: t.tabs.programme,
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons name={focused ? 'layers' : 'layers-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t.tabs.reports,
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: t.tabs.emergency,
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons name={focused ? 'warning' : 'warning-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </ServiceAccessGate>
  );
}
