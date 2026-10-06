import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import styles from "./BottomNavigation.styles";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { careRoutesFor, primaryServiceOf } from "@/service/careRoutes";

type Tab = {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  route: string;
};

export default function BottomNavigation() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const { user } = useAuth();

  const routes = careRoutesFor(primaryServiceOf(user));

  const tabs: Tab[] = [
    {
      key: "home",
      name: t.tabs.home,
      icon: "home-outline",
      activeIcon: "home",
      active: true,
      route: "/(tabs)",
    },
    {
      key: "myCare",
      name: t.tabs.myCare,
      icon: "heart-outline",
      activeIcon: "heart",
      active: false,
      route: routes.myCare,
    },
    {
      key: "book",
      name: t.tabs.book,
      icon: "calendar-outline",
      activeIcon: "calendar",
      active: false,
      route: routes.book,
    },
    {
      key: "profile",
      name: t.tabs.profile,
      icon: "person-outline",
      activeIcon: "person",
      active: false,
      route: routes.profile,
    },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.nav, borderColor: colors.navBorder },
      ]}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          activeOpacity={0.8}
          onPress={() =>
            router.push(tab.route as Parameters<typeof router.push>[0])
          }
        >
          <Ionicons
            name={tab.active ? tab.activeIcon : tab.icon}
            size={24}
            color={tab.active ? colors.navActive : colors.navInactive}
          />

          <Text
            style={[
              styles.label,
              { color: colors.navInactive },
              tab.active && { color: colors.navActive, fontWeight: "700" },
            ]}
          >
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
