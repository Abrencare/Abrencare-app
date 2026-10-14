import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import Replace from '@/components/gates/Replace';
import PhoneField from '@/components/ui/PhoneField';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { COUNTRIES, detectCountry, isPhoneValueComplete, type CountryId } from '@/data/countries';
import {
  saveFamilyInquiry,
  type FamilyCityId,
  type FamilyContactId,
  type FamilySupportId,
} from '@/data/familyInquiry';
import { dashboardFor, onboardingPath, useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';

const FILL = '#1A3A32';

const CITIES: FamilyCityId[] = [
  'addis',
  'direDawa',
  'hawassa',
  'bahirDar',
  'mekelle',
  'gondar',
  'other',
];
const SUPPORTS: FamilySupportId[] = [
  'checkins',
  'nursing',
  'afterVisit',
  'medication',
  'unsure',
];
const CONTACTS: FamilyContactId[] = ['whatsapp', 'call', 'email'];

export default function FamilyRequestScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyRequest;
  const theme = useServiceTheme('family');
  const type = useLandingType('family');
  const { user, hasService, needsOnboarding } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<CountryId>(detectCountry().id);
  const [city, setCity] = useState<FamilyCityId>('addis');
  const [support, setSupport] = useState<FamilySupportId>('unsure');
  const [contact, setContact] = useState<FamilyContactId>('whatsapp');
  const [open, setOpen] = useState<'country' | 'city' | 'support' | null>(null);
  const [sending, setSending] = useState(false);

  if (user && hasService('family') && !needsOnboarding('family')) {
    return <Replace href={dashboardFor('family')} />;
  }

  if (user && hasService('family') && needsOnboarding('family')) {
    return <Replace href={onboardingPath('family')} />;
  }

  const emailOk = contact !== 'email' || email.includes('@');
  const canSubmit =
    name.trim().length > 1 && isPhoneValueComplete(phone) && emailOk && !sending;

  return (
    <FamilyRequestChrome>
      <Text style={[styles.title, type.headline, { color: theme.text }]}>{copy.title}</Text>
      <Text style={[styles.subtitle, type.body, { color: theme.muted }]}>{copy.subtitle}</Text>

      <FieldLabel type={type} color={theme.text} label={copy.name} />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={copy.namePlaceholder}
        placeholderTextColor={theme.muted}
        autoCapitalize="words"
        style={[
          styles.input,
          type.body,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.field },
        ]}
      />

      <PhoneField
        theme={theme}
        label={copy.phone}
        labelStyle="plain"
        radius={22}
        value={phone}
        onChange={setPhone}
        placeholder={copy.phonePlaceholder}
      />

      <Select
        label={copy.country}
        value={t.countries[country]}
        open={open === 'country'}
        onToggle={() => setOpen(open === 'country' ? null : 'country')}
        options={COUNTRIES.map((item) => ({
          id: item.id,
          label: t.countries[item.id],
        }))}
        onSelect={(id) => {
          setCountry(id as CountryId);
          setOpen(null);
        }}
        theme={theme}
        type={type}
      />

      <Select
        label={copy.city}
        value={copy.cities[city]}
        open={open === 'city'}
        onToggle={() => setOpen(open === 'city' ? null : 'city')}
        options={CITIES.map((id) => ({ id, label: copy.cities[id] }))}
        onSelect={(id) => {
          setCity(id as FamilyCityId);
          setOpen(null);
        }}
        theme={theme}
        type={type}
      />

      <Select
        label={copy.support}
        value={copy.supports[support]}
        open={open === 'support'}
        onToggle={() => setOpen(open === 'support' ? null : 'support')}
        options={SUPPORTS.map((id) => ({ id, label: copy.supports[id] }))}
        onSelect={(id) => {
          setSupport(id as FamilySupportId);
          setOpen(null);
        }}
        theme={theme}
        type={type}
      />

      <FieldLabel type={type} color={theme.text} label={copy.contact} />
      <View style={styles.contactRow}>
        {CONTACTS.map((id) => {
          const active = contact === id;
          return (
            <Pressable
              key={id}
              onPress={() => setContact(id)}
              style={[
                styles.contactChip,
                { borderColor: theme.border, backgroundColor: theme.field },
                active && { borderColor: FILL, backgroundColor: '#E7EEEA' },
              ]}
            >
              <Text style={[type.caption, { color: active ? FILL : theme.muted }]}>
                {copy.contacts[id]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {contact === 'email' ? (
        <>
          <FieldLabel type={type} color={theme.text} label={copy.email} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={copy.emailPlaceholder}
            placeholderTextColor={theme.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[
              styles.input,
              type.body,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.field },
            ]}
          />
        </>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          pressed && styles.pressed,
          !canSubmit && styles.disabled,
        ]}
        disabled={!canSubmit}
        onPress={() => {
          if (!canSubmit) {
            return;
          }
          setSending(true);
          saveFamilyInquiry({
            name,
            phone,
            email,
            country,
            city,
            support,
            contact,
          }).then(() => {
            router.replace('/family-request-status');
          });
        }}
      >
        <Text style={[styles.primaryText, type.button]}>{copy.send}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>
    </FamilyRequestChrome>
  );
}

function FieldLabel({
  label,
  color,
  type,
}: {
  label: string;
  color: string;
  type: ReturnType<typeof useLandingType>;
}) {
  return <Text style={[styles.label, type.label, { color }]}>{label}</Text>;
}

function Select({
  label,
  value,
  open,
  onToggle,
  options,
  onSelect,
  theme,
  type,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  theme: ReturnType<typeof useServiceTheme>;
  type: ReturnType<typeof useLandingType>;
}) {
  return (
    <View style={styles.selectWrap}>
      <FieldLabel type={type} color={theme.text} label={label} />
      <Pressable
        onPress={onToggle}
        style={[
          styles.input,
          styles.select,
          { borderColor: theme.border, backgroundColor: theme.field },
        ]}
      >
        <Text style={[type.body, { color: theme.text, flex: 1 }]}>{value}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.muted} />
      </Pressable>
      {open ? (
        <View
          style={[
            styles.menu,
            { borderColor: theme.border, backgroundColor: theme.field },
          ]}
        >
          {options.map((option) => (
            <Pressable
              key={option.id}
              style={styles.menuItem}
              onPress={() => onSelect(option.id)}
            >
              <Text style={[type.body, { color: theme.text }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 22,
  },
  label: {
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'none',
    letterSpacing: 0.1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 22,
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 15,
  },
  selectWrap: {
    marginBottom: 2,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menu: {
    borderWidth: 1,
    borderRadius: 16,
    marginTop: -8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  contactChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primary: {
    height: 52,
    borderRadius: 26,
    backgroundColor: FILL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 14,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});
