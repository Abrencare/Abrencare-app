import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ExecutiveWizardChrome from '@/auth/ExecutiveWizardChrome';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { detectCountry } from '@/data/countries';
import { prepareExecutivePlan } from '@/data/demoCareAccess';
import {
  clearExecutiveRequestDraft,
  loadExecutiveRequestDraft,
  saveExecutiveInquiry,
  supportFromConcerns,
  type ExecutiveConcernId,
  type ExecutiveContactId,
  type ExecutiveLocationPref,
  type ExecutiveReachDay,
  type ExecutiveReachSlot,
  type ExecutiveRequestDraft,
} from '@/data/executiveInquiry';
import { useLandingType } from '@/theme/landingType';
import { useExecutiveTheme } from '@/theme/executiveTheme';

const CONTACT_LABEL: Record<ExecutiveContactId, 'contactPhone' | 'contactEmail' | 'contactWhatsapp'> = {
  call: 'contactPhone',
  email: 'contactEmail',
  whatsapp: 'contactWhatsapp',
};
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
const LOCATION_LABEL: Record<ExecutiveLocationPref, 'locationHome' | 'locationOffice'> = {
  home: 'locationHome',
  office: 'locationOffice',
};
const CONCERN_LABEL: Record<
  ExecutiveConcernId,
  | 'concernBloodPressure'
  | 'concernDiabetes'
  | 'concernHeart'
  | 'concernMobility'
  | 'concernMemory'
  | 'concernCheckup'
  | 'concernOther'
> = {
  bloodPressure: 'concernBloodPressure',
  diabetes: 'concernDiabetes',
  heart: 'concernHeart',
  mobility: 'concernMobility',
  memory: 'concernMemory',
  checkup: 'concernCheckup',
  other: 'concernOther',
};

export default function ExecutiveRequestReviewScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const flow = t.executiveFlow;
  const type = useLandingType('executive');
  const c = useExecutiveTheme();
  const [draft, setDraft] = useState<ExecutiveRequestDraft | null | undefined>(undefined);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadExecutiveRequestDraft().then(setDraft);
  }, []);

  if (draft === undefined) {
    return (
      <ExecutiveWizardChrome step={3} total={3} title={flow.reviewTitle} subtitle={flow.reviewBody}>
        {null}
      </ExecutiveWizardChrome>
    );
  }

  if (!draft) {
    return <Replace href="/executive-request" />;
  }

  if (!draft.concerns.length) {
    return <Replace href="/executive-request-needs" />;
  }

  const rows = [
    { icon: 'person-outline' as const, label: flow.fullName, value: draft.name, href: '/executive-request' },
    { icon: 'call-outline' as const, label: flow.phone, value: draft.phone, href: '/executive-request' },
    { icon: 'mail-outline' as const, label: flow.emailAddress, value: draft.email, href: '/executive-request' },
    {
      icon: 'calendar-outline' as const,
      label: flow.method,
      value: flow[CONTACT_LABEL[draft.contact]],
      href: '/executive-request',
    },
    {
      icon: 'time-outline' as const,
      label: flow.reachTitle,
      value: `${flow[DAY_LABEL[draft.reachDay]]}, ${flow[SLOT_LABEL[draft.reachSlot]]}`,
      href: '/executive-request',
    },
    {
      icon: 'home-outline' as const,
      label: flow.locationPref,
      value: flow[LOCATION_LABEL[draft.locationPref]],
      href: '/executive-request',
    },
    {
      icon: 'heart-outline' as const,
      label: flow.concernsLabel,
      value: draft.concerns.map((id) => flow[CONCERN_LABEL[id]]).join(', ') || '—',
      href: '/executive-request-needs',
    },
    ...(draft.note.trim()
      ? [
          {
            icon: 'document-text-outline' as const,
            label: flow.additionalNote,
            value: draft.note.trim(),
            href: '/executive-request-needs',
          },
        ]
      : []),
  ];

  return (
    <ExecutiveWizardChrome
      step={3}
      total={3}
      title={flow.reviewTitle}
      subtitle={flow.reviewBody}
      footer={
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: c.accent },
            pressed && styles.pressed,
            sending && styles.disabled,
          ]}
          disabled={sending}
          onPress={() => {
            if (sending) {
              return;
            }
            setSending(true);
            saveExecutiveInquiry({
              name: draft.name,
              phone: draft.phone,
              email: draft.email,
              country: draft.country || detectCountry().id,
              city: 'addis',
              support: supportFromConcerns(draft.concerns),
              contact: draft.contact,
              note: draft.note,
              concerns: draft.concerns,
              reachDay: draft.reachDay,
              reachSlot: draft.reachSlot,
              locationPref: draft.locationPref,
            })
              .then((inquiry) => {
                clearExecutiveRequestDraft();
                if (!user) {
                  router.replace('/signup?service=executive');
                  return;
                }
                return prepareExecutivePlan(inquiry.id).then(() => {
                  router.replace('/(tabs)');
                });
              });
          }}
        >
          <Text style={[styles.primaryText, type.button, { color: c.onAccent }]}>{flow.submitRequest}</Text>
          <Ionicons name="arrow-forward" size={16} color={c.onAccent} />
        </Pressable>
      }
    >
      <View style={[styles.list, { backgroundColor: c.accentSoft }]}>
        {rows.map((row, index) => (
          <Pressable
            key={row.label}
            style={[
              styles.row,
              { borderBottomColor: c.divider },
              index === rows.length - 1 && styles.rowLast,
            ]}
            onPress={() => router.push(row.href)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={row.icon} size={18} color={c.accent} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={[styles.rowLabel, type.caption, { color: c.muted }]}>{row.label}</Text>
              <Text style={[styles.rowValue, type.label, { color: c.text }]}>{row.value}</Text>
            </View>
            <Text style={[styles.edit, type.caption, { color: c.text }]}>{flow.edit}</Text>
            <Ionicons name="chevron-forward" size={16} color={c.faint} />
          </Pressable>
        ))}
      </View>

      <View style={[styles.secure, { backgroundColor: c.accentSoft }]}>
        <Ionicons name="lock-closed-outline" size={18} color={c.accent} />
        <View style={styles.secureCopy}>
          <Text style={[styles.secureTitle, type.label, { color: c.text }]}>{flow.secureTitle}</Text>
          <Text style={[styles.secureBody, type.caption, { color: c.muted }]}>{flow.secureBody}</Text>
        </View>
      </View>
    </ExecutiveWizardChrome>
  );
}

const styles = StyleSheet.create({
  list: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  rowCopy: {
    flex: 1,
  },
  rowLabel: {
    marginBottom: 2,
  },
  rowValue: {},
  edit: {},
  secure: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  secureCopy: {
    flex: 1,
  },
  secureTitle: {
    marginBottom: 2,
  },
  secureBody: {},
  primary: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: {},
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});
