import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import styles from "./BottomNavigation.styles";
import { useAppTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

export default function BottomNavigation() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors } = useAppTheme();

  const tabs = [
    {
      name: t.tabs.home,
      icon: "home-outline",
      activeIcon: "home",
      active: true,
      route: "/(tabs)",
    },
    {
      name: t.tabs.family,
      icon: "people-outline",
      activeIcon: "people",
      active: false,
      route: "/family",
    },
    {
      name: t.tabs.executive,
      icon: "medkit-outline",
      activeIcon: "medkit",
      active: false,
      route: "/executive",
    },
    {
      name: t.tabs.consultation,
      icon: "chatbubble-outline",
      activeIcon: "chatbubble",
      active: false,
      route: "/consultation",
    },
    {
      name: t.tabs.profile,
      icon: "person-outline",
      activeIcon: "person",
      active: false,
      route: "/family/profile",
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
          key={tab.name}
          style={styles.tab}
          activeOpacity={0.8}
          onPress={() => router.push(tab.route)}
        >
          <Ionicons
            name={(tab.active ? tab.activeIcon : tab.icon) as any}
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