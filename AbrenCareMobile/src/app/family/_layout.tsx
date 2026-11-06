import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import FamilyMemberGate from '@/components/gates/FamilyMemberGate';
import ServiceAccessGate from '@/components/gates/ServiceAccessGate';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

type TabIconProps = { color: string; size: number; focused: boolean };

function TabIcon({
  color,
  size,
  focused,
  name,
  focusedName,
}: TabIconProps & {
  name: keyof typeof Ionicons.glyphMap;
  focusedName: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Ionicons name={focused ? focusedName : name} size={size} color={color} />
  );
}

export default function FamilyLayout() {
  const { t } = useLanguage();
  const { colors, isDark } = useAppTheme();

  return (
    <ServiceAccessGate service="family">
    <FamilyMemberGate>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#5E7A62',
        tabBarInactiveTintColor: colors.navInactive,
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: isDark ? colors.nav : '#FBFCFB',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
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
          tabBarLabel: t.tabs.home,
          tabBarIcon: (props: TabIconProps) => (
            <TabIcon {...props} name="home-outline" focusedName="home" />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t.tabs.myCare,
          tabBarLabel: t.tabs.myCare,
          tabBarIcon: (props: TabIconProps) => (
            <TabIcon {...props} name="heart-outline" focusedName="heart" />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: t.tabs.book,
          tabBarLabel: t.tabs.book,
          tabBarIcon: (props: TabIconProps) => (
            <TabIcon {...props} name="calendar-outline" focusedName="calendar" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarLabel: t.tabs.profile,
          tabBarIcon: (props: TabIconProps) => (
            <TabIcon {...props} name="person-outline" focusedName="person" />
          ),
        }}
      />
      {/* Reached from the dashboard, not a destination of its own. */}
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="call" options={{ href: null }} />
    </Tabs>
    </FamilyMemberGate>
    </ServiceAccessGate>
  );
}
