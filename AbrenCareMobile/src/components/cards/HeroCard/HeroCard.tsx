import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard, glassTints } from '@/components/executive/GlassCard';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

import styles from './HeroCard.styles';

export default function HeroCard() {
  const { t } = useLanguage();
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const glass = glassTints(isDark, 'family');
  const firstName = user?.name?.split(' ')[0];

  return (
    <GlassCard
      tint={glass.card}
      border={glass.border}
      sheen={glass.sheen}
      shadowColor="#16332C"
      style={styles.card}
    >
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
    </GlassCard>
  );
}
