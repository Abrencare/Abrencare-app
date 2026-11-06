import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ExecutiveWizardChrome from '@/auth/ExecutiveWizardChrome';
import Replace from '@/components/gates/Replace';
import { glassField } from '@/components/executive/GlassCard';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { detectCountry } from '@/data/countries';
import {
  emptyExecutiveDraft,
  EXECUTIVE_CONCERNS,
  loadExecutiveRequestDraft,
  saveExecutiveRequestDraft,
  type ExecutiveConcernId,
  type ExecutiveRequestDraft,
} from '@/data/executiveInquiry';
import { useLandingType } from '@/theme/landingType';
import { useExecutiveTheme } from '@/theme/executiveTheme';

const CONCERN_ICON: Record<ExecutiveConcernId, keyof typeof Ionicons.glyphMap> = {
  bloodPressure: 'water-outline',
  diabetes: 'nutrition-outline',
  heart: 'heart-outline',
  mobility: 'walk-outline',
  memory: 'bulb-outline',
  checkup: 'medkit-outline',
  other: 'ellipsis-horizontal',
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

export default function ExecutiveRequestNeedsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const flow = t.executiveFlow;
  const type = useLandingType('executive');
  const c = useExecutiveTheme();
  const { isDark } = useAppTheme();
  const field = glassField(isDark);
  const [draft, setDraft] = useState<ExecutiveRequestDraft | null | undefined>(undefined);

  useEffect(() => {
    loadExecutiveRequestDraft().then((stored) => {
      setDraft(stored ?? emptyExecutiveDraft(detectCountry().id));
    });
  }, []);

  if (draft === undefined) {
    return (
      <ExecutiveWizardChrome step={2} total={3} title={flow.needsTitle} subtitle={flow.needsBody}>
        {null}
      </ExecutiveWizardChrome>
    );
  }

  if (!draft || !draft.name || !draft.phone || !draft.email) {
    return <Replace href="/executive-request" />;
  }

  const canNext = draft.concerns.length > 0;

  function toggle(id: ExecutiveConcernId) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const selected = current.concerns.includes(id)
        ? current.concerns.filter((item) => item !== id)
        : [...current.concerns, id];
      return { ...current, concerns: selected };
    });
  }

  return (
    <ExecutiveWizardChrome
      step={2}
      total={3}
      title={flow.needsTitle}
      subtitle={flow.needsBody}
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
              router.push('/executive-request-review');
            });
          }}
        >
          <Text style={[styles.primaryText, type.button, { color: c.onAccent }]}>{flow.nextStep}</Text>
          <Ionicons name="arrow-forward" size={16} color={c.onAccent} />
        </Pressable>
      }
    >
      <View style={styles.questionRow}>
        <Text style={[styles.label, type.label, { color: c.text }]}>{flow.needsQuestion}</Text>
        <Text style={[type.caption, { color: c.muted }]}>{flow.needsHint}</Text>
      </View>

      <View style={[styles.list, field]}>
        {EXECUTIVE_CONCERNS.map((id, index) => {
          const active = draft.concerns.includes(id);
          return (
            <Pressable
              key={id}
              onPress={() => toggle(id)}
              style={[
                styles.row,
                { borderBottomColor: c.divider },
                index === EXECUTIVE_CONCERNS.length - 1 && styles.rowLast,
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: c.accentSoft }]}>
                <Ionicons name={CONCERN_ICON[id]} size={18} color={c.accent} />
              </View>
              <Text style={[styles.rowLabel, type.body, { color: c.text }]}>
                {flow[CONCERN_LABEL[id]]}
              </Text>
              {active ? (
                <Ionicons name="checkmark" size={18} color={c.accent} />
              ) : (
                <View style={[styles.emptyCheck, { borderColor: c.cardBorder }]} />
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, type.label, { color: c.text }]}>{flow.additionalNote}</Text>
      <TextInput
        value={draft.note}
        onChangeText={(note) => setDraft({ ...draft, note })}
        placeholder={flow.additionalPlaceholder}
        placeholderTextColor={c.muted}
        multiline
        textAlignVertical="top"
        style={[
          styles.note,
          type.body,
          field,
          { color: c.text },
        ]}
      />
    </ExecutiveWizardChrome>
  );
}

const styles = StyleSheet.create({
  questionRow: {
    marginBottom: 10,
    gap: 4,
  },
  label: {
    marginBottom: 8,
  },
  list: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  emptyCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  note: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
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
