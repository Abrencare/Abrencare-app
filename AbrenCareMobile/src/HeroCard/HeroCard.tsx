import React from "react";
import { View, Text } from "react-native";
import { Star, HeartPulse, Clock3 } from "lucide-react-native";

import { useLanguage } from "@/i18n/LanguageContext";

import styles from "./HeroCard.styles";

export default function HeroCard() {
  const { t } = useLanguage();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t.home.heroTitle}</Text>

      <Text style={styles.subtitle}>{t.home.heroSubtitle}</Text>

      <View style={styles.badgeContainer}>
        <View style={styles.badge}>
          <Star size={14} color="#FACC15" fill="#FACC15" />
          <Text style={styles.badgeText}>{t.home.rated}</Text>
        </View>

        <View style={styles.badge}>
          <HeartPulse size={14} color="#86EFAC" />
          <Text style={styles.badgeText}>{t.home.care247}</Text>
        </View>

        <View style={styles.badge}>
          <Clock3 size={14} color="#93C5FD" />
          <Text style={styles.badgeText}>{t.home.sameDay}</Text>
        </View>
      </View>
    </View>
  );
}