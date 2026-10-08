import { Image, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

import styles from './HeroCard.styles';

const HERO_PHOTO = require('@/assets/images/home-hero-instruments.jpg');

export default function HeroCard() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={HERO_PHOTO} style={styles.backgroundPhoto} resizeMode="cover" />
      <LinearGradient
        colors={colors.heroFade}
        locations={[0, 0.42, 0.72, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.fade}
      />

      <View style={styles.copy}>
        <Text style={[styles.greeting, { color: colors.navActive }]}>
          {t.home.greeting}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>{t.home.heroTitle}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>{t.home.heroSubtitle}</Text>

        <View style={styles.badgeContainer}>
          <View style={[styles.badge, { backgroundColor: colors.chip }]}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.navActive} />
            <Text style={[styles.badgeText, { color: colors.text }]}>{t.home.rated}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.chip }]}>
            <Ionicons name="heart-outline" size={13} color={colors.navActive} />
            <Text style={[styles.badgeText, { color: colors.text }]}>{t.home.care247}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.chip }]}>
            <Ionicons name="time-outline" size={13} color={colors.navActive} />
            <Text style={[styles.badgeText, { color: colors.text }]}>{t.home.sameDay}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
