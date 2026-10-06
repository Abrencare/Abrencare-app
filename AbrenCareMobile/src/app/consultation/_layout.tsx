import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { ConsultationProvider } from '@/context/ConsultationContext';
import ServiceAccessGate from '@/components/gates/ServiceAccessGate';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

type TabIconProps = { color: string; size: number; focused: boolean };

export default function ConsultationLayout() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();

  return (
    <ServiceAccessGate service="consultation">
    <ConsultationProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#7E93A8',
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
            title: t.tabs.home,
            tabBarIcon: ({ color, size, focused }: TabIconProps) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="mycare"
          options={{
            title: t.tabs.myCare,
            tabBarIcon: ({ color, size, focused }: TabIconProps) => (
              <Ionicons
                name={focused ? 'heart' : 'heart-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="doctors"
          options={{
            title: t.tabs.book,
            tabBarIcon: ({ color, size, focused }: TabIconProps) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t.tabs.profile,
            tabBarIcon: ({ color, size, focused }: TabIconProps) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen name="chat" options={{ href: null }} />
        <Tabs.Screen name="call" options={{ href: null }} />
      </Tabs>
    </ConsultationProvider>
    </ServiceAccessGate>
  );
}
