import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BrandLogo, { BrandHomeLink } from '@/components/ui/BrandLogo';
import { useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  SPECIALTIES,
  filterDoctors,
  specialtyLabel,
  to12Hour,
  type Doctor,
  type SpecialtyId,
} from '@/data/doctors';

const BLUE = '#7E93A8';

export default function ConsultationDoctors() {
  const { t } = useLanguage();
  const router = useRouter();
  const { setDraft } = useConsultations();
  const copy = t.doctorsPage;

  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState<SpecialtyId | null>(null);

  const matches = useMemo(
    () => filterDoctors({ query, specialty }, t),
    [query, specialty, t],
  );

  function openDoctor(doctor: Doctor) {
    setDraft({ doctorId: doctor.id });
    router.push('/consultation');
  }

  function clearFilters() {
    setQuery('');
    setSpecialty(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandHomeLink style={styles.brandRow}>
          <BrandLogo size={34} link={false} />
        </BrandHomeLink>
        <Text style={styles.headerLabel}>{t.consultation.headerLabel}</Text>
        <Text style={styles.headerTitle}>{copy.title}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color="#9AA3AF" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor="#A8AEB4"
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={17} color="#C4C9CE" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label={t.consultation.allSpecialties}
            selected={specialty === null}
            onPress={() => setSpecialty(null)}
          />
          {SPECIALTIES.map((id) => (
            <FilterChip
              key={id}
              label={specialtyLabel(id, t)}
              selected={specialty === id}
              onPress={() => setSpecialty(specialty === id ? null : id)}
            />
          ))}
        </ScrollView>

        {matches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={24} color="#B4BAC1" />
            <Text style={styles.emptyTitle}>{copy.noResults}</Text>
            <Text style={styles.emptyHint}>{copy.noResultsHint}</Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>{copy.clearFilters}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          matches.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onPress={() => openDoctor(doctor)}
            />
          ))
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DoctorCard({
  doctor,
  onPress,
}: {
  doctor: Doctor;
  onPress: () => void;
}) {
  const { t } = useLanguage();
  const copy = t.doctorsPage;

  return (
    <View style={styles.doctorCard}>
      <View style={styles.doctorTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{doctor.initials}</Text>
        </View>

        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.doctorSpecialty}>
            {specialtyLabel(doctor.specialty, t)}
          </Text>
          <Text style={styles.experience}>
            {doctor.years}+ {copy.yearsExperience}
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            doctor.online ? styles.onlinePill : styles.busyPill,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: doctor.online ? '#5A9964' : '#C4626A' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: doctor.online ? '#4E8A58' : '#A84E55' },
            ]}
          >
            {doctor.online ? copy.online : copy.offline}
          </Text>
        </View>
      </View>

      <View style={styles.doctorFooter}>
        <View style={styles.nextRow}>
          <Ionicons name="time-outline" size={15} color={BLUE} />
          <Text style={styles.nextText}>
            {copy.nextLabel} · {to12Hour(doctor.slots[0] ?? '09:00')}
          </Text>
        </View>

        <TouchableOpacity style={styles.viewButton} onPress={onPress}>
          <Text style={styles.viewButtonText}>{copy.view}</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  brandRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 1.3,
    color: BLUE,
    fontWeight: '700',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 24,
    color: '#172B42',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 13,
    height: 46,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#172B42',
    padding: 0,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    justifyContent: 'center',
    backgroundColor: '#EAF0F7',
    borderRadius: 17,
  },
  chipSelected: {
    backgroundColor: '#243040',
  },
  chipText: {
    fontSize: 13,
    color: '#34475D',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 22,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C646C',
    marginTop: 9,
  },
  emptyHint: {
    fontSize: 12,
    color: '#98A0A8',
    textAlign: 'center',
    marginTop: 4,
  },
  clearButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#EAF0F7',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },
  doctorTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E4EAF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#243040',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#172B42',
  },
  doctorSpecialty: {
    fontSize: 13,
    color: '#667384',
    marginTop: 2,
  },
  experience: {
    fontSize: 12,
    color: '#98A0A8',
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  onlinePill: {
    backgroundColor: '#E8F5EA',
  },
  busyPill: {
    backgroundColor: '#FCEEEF',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  doctorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextText: {
    fontSize: 13,
    color: '#667384',
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#243040',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
