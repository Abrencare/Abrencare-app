import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ExecutiveWizardChrome from '@/auth/ExecutiveWizardChrome';
import Replace from '@/components/gates/Replace';
import { glassField } from '@/components/executive/GlassCard';
import PhoneField from '@/components/ui/PhoneField';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { detectCountry, isPhoneValueComplete } from '@/data/countries';
import {
  emptyExecutiveDraft,
  loadExecutiveRequestDraft,
  saveExecutiveRequestDraft,
  type ExecutiveContactId,
  type ExecutiveLocationPref,
  type ExecutiveReachDay,
  type ExecutiveReachSlot,
  type ExecutiveRequestDraft,
} from '@/data/executiveInquiry';
import { dashboardFor, onboardingPath, useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';
import { useExecutiveTheme } from '@/theme/executiveTheme';

const METHODS: { id: ExecutiveContactId; icon: keyof typeof Ionicons.glyphMap; label: 'contactPhone' | 'contactEmail' | 'contactWhatsapp' }[] = [
  { id: 'call', icon: 'call-outline', label: 'contactPhone' },
  { id: 'email', icon: 'mail-outline', label: 'contactEmail' },
  { id: 'whatsapp', icon: 'logo-whatsapp', label: 'contactWhatsapp' },
];

const DAYS: ExecutiveReachDay[] = ['weekdays', 'weekends', 'anytime'];
const SLOTS: ExecutiveReachSlot[] = ['morning', 'midday', 'afternoon', 'evening'];
const DAY_LABEL: Record<ExecutiveReachDay, 'reachWeekdays' | 'reachWeekends' | 'reachAnytime'> = {
  weekdays: 'reachWeekdays',
  weekends: 'reachWeekends',
  anytime: 'reachAnytime',
};
const SLOT_LABEL: Record<ExecutiveReachSlot, 'slotMorning' | 'slotMidday' | 'slotAfternoon' | 'slotEvening'> = {
  morning: 'slotMorning',
  midday: 'slotMidday',
  afternoon: 'slotAfternoon',
  evening: 'slotEvening',
};

export default function ExecutiveRequestScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const flow = t.executiveFlow;
  const theme = useServiceTheme('executive');
  const c = useExecutiveTheme();
  const type = useLandingType('executive');
  const { isDark } = useAppTheme();
  const field = glassField(isDark);
  const { user, hasService, needsOnboarding } = useAuth();
  const detected = detectCountry().id;

  const [draft, setDraft] = useState<ExecutiveRequestDraft>(emptyExecutiveDraft(detected));
  const [open, setOpen] = useState<'day' | 'slot' | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadExecutiveRequestDraft().then((stored) => {
      if (stored) {
        setDraft(stored);
      }
      setReady(true);
    });
  }, []);

  if (user && hasService('executive') && !needsOnboarding('executive')) {
    return <Replace href={dashboardFor('executive')} />;
  }

  if (user && hasService('executive') && needsOnboarding('executive')) {
    return <Replace href={onboardingPath('executive')} />;
  }

  const canNext =
    ready &&
    draft.name.trim().length > 1 &&
    isPhoneValueComplete(draft.phone) &&
    draft.email.includes('@');

  function patch(update: Partial<ExecutiveRequestDraft>) {
    setDraft((current) => ({ ...current, ...update }));
  }

  if (!ready) {
    return (
      <ExecutiveWizardChrome
        step={1}
        total={3}
        title={flow.contactTitle}
        subtitle={flow.contactBody}
      >
        {null}
      </ExecutiveWizardChrome>
    );
  }

  return (
    <ExecutiveWizardChrome
      step={1}
      total={3}
      title={flow.contactTitle}
      subtitle={flow.contactBody}
      footer={
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: c.accent },
            pressed && styles.pressed,
            !canNext && styles.disabled,
          ]}
          disabled={!canNext}
          onPress={() => {
            if (!canNext) {
              return;
            }
            saveExecutiveRequestDraft(draft).then(() => {
              router.push('/executive-request-needs');
            });
          }}
        >
          <Text style={[styles.primaryText, type.button, { color: c.onAccent }]}>{flow.nextStep}</Text>
          <Ionicons name="arrow-forward" size={16} color={c.onAccent} />
        </Pressable>
      }
    >
      <Text style={[styles.label, type.label, { color: c.text }]}>{flow.fullName}</Text>
      <TextInput
        value={draft.name}
        onChangeText={(name) => patch({ name })}
        placeholder={flow.namePlaceholder}
        placeholderTextColor={c.muted}
        autoCapitalize="words"
        style={[styles.input, type.body, field, { color: c.text }]}
      />

      <PhoneField
        theme={theme}
        label={flow.phone}
        labelStyle="plain"
        radius={28}
        value={draft.phone}
        onChange={(phone) => patch({ phone })}
        placeholder={flow.phonePlaceholder}
      />

      <Text style={[styles.label, type.label, { color: c.text }]}>{flow.emailAddress}</Text>
      <TextInput
        value={draft.email}
        onChangeText={(email) => patch({ email })}
        placeholder={flow.emailPlaceholder}
        placeholderTextColor={c.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        style={[styles.input, type.body, field, { color: c.text }]}
      />

      <Text style={[styles.label, type.label, { color: c.text }]}>{flow.method}</Text>
      <View style={styles.optionRow}>
        {METHODS.map((item) => {
          const active = draft.contact === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => patch({ contact: item.id })}
              style={[
                styles.option,
                field,
                active && { backgroundColor: c.accent, borderColor: c.accent },
              ]}
            >
              <Ionicons name={item.icon} size={16} color={active ? c.onAccent : c.text} />
              <Text
                style={[
                  styles.optionText,
                  type.caption,
                  { color: active ? c.onAccent : c.text },
                ]}
              >
                {flow[item.label]}
              </Text>
              {active ? <Ionicons name="checkmark" size={14} color={c.onAccent} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, type.label, { color: c.text }]}>{flow.reachTitle}</Text>
      <View style={styles.split}>
        <Select
          value={flow[DAY_LABEL[draft.reachDay]]}
          open={open === 'day'}
          onToggle={() => setOpen(open === 'day' ? null : 'day')}
          options={DAYS.map((id) => ({ id, label: flow[DAY_LABEL[id]] }))}
          onSelect={(id) => {
            patch({ reachDay: id as ExecutiveReachDay });
            setOpen(null);
          }}
          type={type}
          theme={theme}
        />
        <Select
          value={flow[SLOT_LABEL[draft.reachSlot]]}
          open={open === 'slot'}
          onToggle={() => setOpen(open === 'slot' ? null : 'slot')}
          options={SLOTS.map((id) => ({ id, label: flow[SLOT_LABEL[id]] }))}
          onSelect={(id) => {
            patch({ reachSlot: id as ExecutiveReachSlot });
            setOpen(null);
          }}
          type={type}
          theme={theme}
        />
      </View>

      <Text style={[styles.label, type.label, { color: c.text }]}>{flow.locationPref}</Text>
      <View style={styles.optionRow}>
        {(
          [
            { id: 'home' as const, icon: 'home-outline' as const, label: flow.locationHome },
            { id: 'office' as const, icon: 'business-outline' as const, label: flow.locationOffice },
          ] satisfies { id: ExecutiveLocationPref; icon: keyof typeof Ionicons.glyphMap; label: string }[]
        ).map((item) => {
          const active = draft.locationPref === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => patch({ locationPref: item.id })}
              style={[
                styles.option,
                styles.location,
                field,
                active && { backgroundColor: c.accent, borderColor: c.accent },
              ]}
            >
              <Ionicons name={item.icon} size={16} color={active ? c.onAccent : c.text} />
              <Text
                style={[
                  styles.optionText,
                  type.caption,
                  { color: active ? c.onAccent : c.text },
                ]}
              >
                {item.label}
              </Text>
              {active ? <Ionicons name="checkmark" size={14} color={c.onAccent} /> : null}
            </Pressable>
          );
        })}
      </View>

    </ExecutiveWizardChrome>
  );
}

function Select({
  value,
  open,
  onToggle,
  options,
  onSelect,
  theme,
  type,
}: {
  value: string;
  open: boolean;
  onToggle: () => void;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  theme: ReturnType<typeof useServiceTheme>;
  type: ReturnType<typeof useLandingType>;
}) {
  const { isDark } = useAppTheme();
  const field = glassField(isDark);
  return (
    <View style={styles.selectWrap}>
      <Pressable onPress={onToggle} style={[styles.select, field]}>
        <Text style={[type.body, { color: theme.text, flex: 1 }]} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
      </Pressable>
      {open ? (
        <View style={[styles.menu, field]}>
          {options.map((option) => (
            <Pressable key={option.id} style={styles.menuItem} onPress={() => onSelect(option.id)}>
              <Text style={[type.body, { color: theme.text }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 28,
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 15,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  option: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  location: {
    minHeight: 52,
  },
  optionText: {},
  split: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  selectWrap: {
    flex: 1,
  },
  select: {
    minHeight: 52,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menu: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primary: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryText: {},
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});
