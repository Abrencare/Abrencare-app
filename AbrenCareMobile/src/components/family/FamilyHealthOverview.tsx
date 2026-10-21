import { StyleSheet, Text, View } from 'react-native';

import FamilyIconWell from '@/components/family/FamilyIconWell';
import { Ionicons } from '@expo/vector-icons';

import { fromDateKey } from '@/context/AppointmentsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useVisit } from '@/context/VisitContext';
import { useThemedStyles } from '@/theme/useThemedStyles';

export default function FamilyHealthOverview() {
  const styles = useThemedStyles(baseStyles);
  const { t } = useLanguage();
  const copy = t.familyCareHealth;
  const { visit, status } = useVisit();
  const concern = visit.concern;
  const showFollowUp = status !== 'upcoming' && !!concern && concern.review !== 'reviewed';
  const measured = fromDateKey(visit.dateKey);
  const measuredLabel = `${measured.getDate()} ${t.calendar.months[measured.getMonth()].slice(0, 3)} ${measured.getFullYear()}`;

  const followUpBody =
    concern?.review === 'notified' && concern.reviewerName
      ? t.family.concernNotified.replace('{reviewer}', concern.reviewerName)
      : copy.followUpBody;

  const readings = [
    {
      icon: 'heart-outline' as const,
      label: copy.bp,
      value: copy.bpValue,
      status: copy.bpStatus,
      tone: 'warn' as const,
    },
    {
      icon: 'pulse-outline' as const,
      label: copy.heart,
      value: copy.heartValue,
      status: copy.heartStatus,
      tone: 'good' as const,
    },
    {
      icon: 'water-outline' as const,
      label: copy.oxygen,
      value: copy.oxygenValue,
      status: copy.oxygenStatus,
      tone: 'good' as const,
    },
    {
      icon: 'thermometer-outline' as const,
      label: copy.temp,
      value: copy.tempValue,
      status: copy.tempStatus,
      tone: 'good' as const,
    },
  ];

  return (
    <View>
      {showFollowUp ? (
        <View>
          <Text style={styles.section}>{copy.latestUpdate}</Text>
          <View style={styles.followCard}>
            <FamilyIconWell name="warning-outline" tone="warn" box={34} size={16} />
            <View style={styles.followCopy}>
              <Text style={styles.followTitle}>{copy.followUp}</Text>
              <Text style={styles.followBody}>{followUpBody}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C45C4A" />
          </View>
        </View>
      ) : null}

      <Text style={styles.section}>{copy.measurements}</Text>
      <Text style={styles.date}>{measuredLabel}</Text>
      <View style={styles.grid}>
        {readings.map((item) => (
          <View key={item.label} style={styles.measure}>
            <View style={styles.measureTop}>
              <FamilyIconWell name={item.icon} box={28} size={14} />
              <Text style={styles.measureLabel}>{item.label}</Text>
            </View>
            <Text style={styles.measureValue}>{item.value}</Text>
            <Text style={item.tone === 'warn' ? styles.statusWarn : styles.statusGood}>
              {item.status}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.privacy}>
        <FamilyIconWell name="lock-closed-outline" box={34} size={16} />
        <Text style={styles.privacyText}>{copy.privacy}</Text>
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  section: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#16332C',
  },
  date: {
    marginTop: -4,
    marginBottom: 10,
    fontSize: 13,
    color: '#5C6B65',
  },
  followCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF6F2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  followCopy: {
    flex: 1,
  },
  followTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C45C4A',
    marginBottom: 4,
  },
  followBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5C4426',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  measure: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EAE2',
    padding: 12,
  },
  measureTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  measureLabel: {
    flex: 1,
    fontSize: 12,
    color: '#5C6B65',
    fontWeight: '600',
  },
  measureValue: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#16332C',
  },
  statusGood: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#2F9E6B',
  },
  statusWarn: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#C45C4A',
  },
  privacy: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E7EEEA',
    borderRadius: 16,
    padding: 14,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#16332C',
  },
});
