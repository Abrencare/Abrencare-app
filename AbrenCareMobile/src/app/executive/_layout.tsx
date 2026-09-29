import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import ServiceAccessGate from '@/components/gates/ServiceAccessGate';
import {
  ExecutiveAlertsProvider,
  useExecutiveAlerts,
} from '@/context/ExecutiveAlertsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useExecutiveTheme } from '@/theme/executiveTheme';

type TabIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

export default function ExecutiveLayout() {
  return (
    <ServiceAccessGate service="executive">
      <ExecutiveAlertsProvider>
        <ExecutiveTabs />
      </ExecutiveAlertsProvider>
    </ServiceAccessGate>
  );
}

function ExecutiveTabs() {
  const { t } = useLanguage();
  const c = useExecutiveTheme();
  const { unreadCount } = useExecutiveAlerts();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: {
          height: 70,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: c.card,
          borderTopWidth: 1,
          borderTopColor: c.cardBorder,
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
        name="health"
        options={{
          title: t.tabs.health,
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
        name="consultation"
        options={{
          title: t.tabs.consultation,
          tabBarIcon: ({ color, size, focused }: TabIconProps) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t.tabs.alerts,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: c.danger,
            color: c.card,
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, size, focused }: TabIconProps) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
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

      {/* Reachable from the dashboard, alerts and profile cards */}
      <Tabs.Screen name="programme" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="emergency" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen
        name="call"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}
