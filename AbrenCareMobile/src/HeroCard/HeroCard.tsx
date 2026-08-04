import React from "react";
import { View, Text } from "react-native";
import { Star, HeartPulse, Clock3 } from "lucide-react-native";

import styles from "./HeroCard.styles";

export default function HeroCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        How can we{"\n"}
        help you today?
      </Text>

      <Text style={styles.subtitle}>
        World-class Ethiopian healthcare — wherever you are.
      </Text>

      <View style={styles.badgeContainer}>
        <View style={styles.badge}>
          <Star size={14} color="#FACC15" fill="#FACC15" />
          <Text style={styles.badgeText}>4.9 rated</Text>
        </View>

        <View style={styles.badge}>
          <HeartPulse size={14} color="#86EFAC" />
          <Text style={styles.badgeText}>24/7 care</Text>
        </View>

        <View style={styles.badge}>
          <Clock3 size={14} color="#93C5FD" />
          <Text style={styles.badgeText}>Same-day</Text>
        </View>
      </View>
    </View>
  );
}