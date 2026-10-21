import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import FamilyIconWell from '@/components/family/FamilyIconWell';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import FamilyHealthOverview from '@/components/family/FamilyHealthOverview';
import FamilyMemberHeader from '@/components/family/FamilyMemberHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useThemedStyles } from '@/theme/useThemedStyles';

type Tab = 'reports' | 'prescriptions' | 'labs' | 'history';
type Tone = 'good' | 'warn' | 'bad';

const reportMeta: { tone: Tone }[] = [
  { tone: 'warn' },
  { tone: 'good' },
  { tone: 'good' },
  { tone: 'good' },
];

const prescriptionMeta: { tone: Tone }[] = [
  { tone: 'good' },
  { tone: 'good' },
  { tone: 'good' },
  { tone: 'warn' },
];

const labMeta: { tone: Tone }[] = [
  { tone: 'good' },
  { tone: 'good' },
  { tone: 'warn' },
  { tone: 'bad' },
  { tone: 'good' },
];

const historyMeta: { icon: keyof typeof Ionicons.glyphMap; tone: Tone }[] = [
  { icon: 'heart-outline', tone: 'warn' },
  { icon: 'water-outline', tone: 'warn' },
  { icon: 'eye-outline', tone: 'good' },
  { icon: 'alert-circle-outline', tone: 'bad' },
];

const toneStyles: Record<Tone, { color: string; bg: string }> = {
  good: { color: '#5D9C59', bg: '#EEF8EC' },
  warn: { color: '#F2994A', bg: '#FFF3E8' },
  bad: { color: '#E66A6A', bg: '#FDECEC' },
};

export default function FamilyReports() {

  const styles = useThemedStyles(baseStyles);
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('reports');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'reports', label: t.familyReports.tabReports },
    { id: 'prescriptions', label: t.familyReports.tabPrescriptions },
    { id: 'labs', label: t.familyReports.tabLabs },
    { id: 'history', label: t.familyReports.tabHistory },
  ];

  const reportStatusLabel: Record<Tone, string> = {
    good: t.familyReports.statusCompleted,
    warn: t.familyReports.statusPending,
    bad: t.familyReports.statusPending,
  };

  const actionLabel = {
    reports: t.familyReports.requestNew,
    prescriptions: t.familyReports.requestRefill,
    labs: t.familyReports.downloadResults,
    history: t.familyReports.updateHistory,
  }[tab];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={10}
      >
        <Ionicons name="chevron-back" size={22} color="#444" />
      </TouchableOpacity>

      <FamilyMemberHeader />
      <FamilyHealthOverview />

      <Text style={styles.title}>{t.familyReports.title}</Text>
      <Text style={styles.subtitle}>{t.familyReports.historySubtitle}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((item) => {
          const active = item.id === tab;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(item.id)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.card}>
        <View>
          {tab === 'reports' &&
            reportMeta.map((item, index) => {
              const copy = t.familyReports.items[index];
              if (!copy) {
                return null;
              }

              const tone = toneStyles[item.tone];

              return (
                <View
                  key={copy.date}
                  style={[
                    styles.reportCard,
                    index !== reportMeta.length - 1 && styles.reportGap,
                  ]}
                >
                  <FamilyIconWell name="document-text-outline" box={36} />
                  <View style={styles.rowInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.reportDate}>{copy.date}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.statusText, { color: tone.color }]}>
                          {reportStatusLabel[item.tone]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.rowTitle}>{copy.title}</Text>
                    <Text style={styles.rowMeta}>{copy.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9AA3AF" />
                </View>
              );
            })}

          {tab === 'prescriptions' &&
            prescriptionMeta.map((item, index) => {
              const copy = t.familyReports.prescriptions[index];
              if (!copy) {
                return null;
              }

              const tone = toneStyles[item.tone];

              return (
                <View
                  key={copy.name}
                  style={[
                    styles.row,
                    index !== prescriptionMeta.length - 1 && styles.separator,
                  ]}
                >
                  <FamilyIconWell name="medkit-outline" box={34} size={16} />

                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{copy.name}</Text>
                    <Text style={styles.rowMeta}>{copy.dose}</Text>
                    <Text style={styles.rowMeta}>
                      {t.familyReports.prescribedBy} {copy.doctor}
                    </Text>
                    <Text style={[styles.rowMeta, styles.refill]}>
                      {copy.refill}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.statusText, { color: tone.color }]}>
                      {copy.status}
                    </Text>
                  </View>
                </View>
              );
            })}

          {tab === 'labs' &&
            labMeta.map((item, index) => {
              const copy = t.familyReports.labs[index];
              if (!copy) {
                return null;
              }

              const tone = toneStyles[item.tone];

              return (
                <View
                  key={copy.name}
                  style={[
                    styles.row,
                    index !== labMeta.length - 1 && styles.separator,
                  ]}
                >
                  <FamilyIconWell name="flask-outline" box={34} size={16} />

                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{copy.name}</Text>
                    <Text style={styles.rowMeta}>
                      {copy.date} · {copy.value}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.statusText, { color: tone.color }]}>
                      {copy.status}
                    </Text>
                  </View>
                </View>
              );
            })}

          {tab === 'history' &&
            historyMeta.map((item, index) => {
              const copy = t.familyReports.history[index];
              if (!copy) {
                return null;
              }

              const tone = toneStyles[item.tone];

              return (
                <View
                  key={copy.title}
                  style={[
                    styles.row,
                    index !== historyMeta.length - 1 && styles.separator,
                  ]}
                >
                  <FamilyIconWell name={item.icon} box={34} size={16} />

                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{copy.title}</Text>
                    <Text style={styles.rowMeta}>{copy.detail}</Text>
                  </View>

                  <View style={styles.yearBadge}>
                    <Text style={styles.yearText}>{copy.year}</Text>
                  </View>
                </View>
              );
            })}
        </View>
      </View>

      <TouchableOpacity style={styles.button}>
        <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F3',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 55,
    paddingBottom: 40,
  },

  backButton: {
    marginBottom: 8,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#16332C',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#5C6B65',
    marginBottom: 14,
  },

  tabsRow: {
    flexGrow: 0,
    marginBottom: 14,
  },

  tabsContent: {
    gap: 8,
    paddingRight: 8,
  },

  tab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE8E1',
  },

  tabActive: {
    backgroundColor: '#8B9A7C',
    borderColor: '#8B9A7C',
  },

  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6F6A64',
  },

  tabTextActive: {
    color: '#FFFFFF',
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
  },
  reportGap: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reportIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E7EEEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportDate: {
    fontSize: 12,
    color: '#5C6B65',
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  dateBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  day: {
    color: '#9B9B9B',
    fontWeight: '700',
    fontSize: 12,
  },

  rowInfo: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  rowTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#2D3748',
  },

  rowMeta: {
    fontSize: 12,
    color: '#9AA3AF',
    marginTop: 3,
  },

  refill: {
    color: '#8B9A7C',
    fontWeight: '600',
  },

  newBadge: {
    backgroundColor: '#FFE9C9',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },

  newText: {
    fontSize: 9,
    color: '#C97C00',
    fontWeight: '700',
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 8,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  yearBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F4F4F4',
    marginLeft: 8,
  },

  yearText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F6A64',
  },

  button: {
    backgroundColor: '#1A3A32',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginVertical: 16,
  },

  buttonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
