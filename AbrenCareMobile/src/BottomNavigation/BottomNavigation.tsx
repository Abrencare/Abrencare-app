import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import styles from "./BottomNavigation.styles";

export default function BottomNavigation() {
  const tabs = [
    {
      name: "Home",
      icon: "home-outline",
      activeIcon: "home",
      active: true,
    },
    {
      name: "Family",
      icon: "people-outline",
      activeIcon: "people",
      active: false,
    },
    {
      name: "Executive",
      icon: "medkit-outline",
      activeIcon: "medkit",
      active: false,
    },
    {
      name: "Consultation",
      icon: "chatbubble-outline",
      activeIcon: "chatbubble",
      active: false,
    },
    {
      name: "Profile",
      icon: "person-outline",
      activeIcon: "person",
      active: false,
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tab}
          activeOpacity={0.8}
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