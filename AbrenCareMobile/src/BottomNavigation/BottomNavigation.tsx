import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import styles from "./BottomNavigation.styles";
import { useLanguage } from "@/i18n/LanguageContext";

export default function BottomNavigation() {
  const router = useRouter();
  const { t } = useLanguage();

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
    <View style={styles.container}>
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
            color={tab.active ? "#7DA46B" : "#A8A8A8"}
          />

          <Text
            style={[
              styles.label,
              tab.active && styles.activeLabel,
            ]}
          >
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}