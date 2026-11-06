import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import Replace from '@/components/gates/Replace';
import { glassField } from '@/components/executive/GlassCard';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  loadFamilyInquiryById,
  shareFamilyProposal,
  type FamilyInquiry,
} from '@/data/familyInquiry';
import { useLandingType } from '@/theme/landingType';

function paramId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default function FamilyProposalComposeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = paramId(params.id);
  const { t } = useLanguage();
  const copy = t.familyPlan;
  const type = useLandingType('family');
  const { colors, isDark } = useAppTheme();
  const fieldStyle = glassField(isDark);
  const [inquiry, setInquiry] = useState<FamilyInquiry | null | undefined>(undefined);
  const [recipient, setRecipient] = useState('');
  const [services, setServices] = useState('');
  const [visitFrequency, setVisitFrequency] = useState('');
  const [planDuration, setPlanDuration] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('ETB');
  const [billingPeriod, setBillingPeriod] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [cancellationTerms, setCancellationTerms] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setInquiry(null);
      return;
    }
    loadFamilyInquiryById(id).then((item) => {
      setInquiry(item);
      if (!item?.proposal) {
        return;
      }
      setRecipient(item.proposal.recipient);
      setServices(item.proposal.services);
      setVisitFrequency(item.proposal.visitFrequency);
      setPlanDuration(item.proposal.planDuration);
      setQuoteAmount(item.proposal.quoteAmount);
      setQuoteCurrency(item.proposal.quoteCurrency);
      setBillingPeriod(item.proposal.billingPeriod);
      setExclusions(item.proposal.exclusions);
      setPaymentTerms(item.proposal.paymentTerms);
      setCancellationTerms(item.proposal.cancellationTerms);
    });
  }, [id]);

  if (inquiry === undefined) {
    return <FamilyRequestChrome>{null}</FamilyRequestChrome>;
  }

  if (!inquiry || !id) {
    return <Replace href="/family-inbox" />;
  }

  if (inquiry.status === 'received') {
    return <Replace href="/family-inbox" />;
  }

  const canShare =
    recipient.trim().length > 1 &&
    services.trim().length > 1 &&
    visitFrequency.trim().length > 1 &&
    planDuration.trim().length > 1 &&
    quoteAmount.trim().length > 0 &&
    quoteCurrency.trim().length > 0 &&
    billingPeriod.trim().length > 1 &&
    exclusions.trim().length > 1 &&
    paymentTerms.trim().length > 1 &&
    cancellationTerms.trim().length > 1 &&
    !saving;

  const field = (label: string, value: string, onChange: (next: string) => void, extra?: object) => (
    <View style={styles.field}>
      <Text style={[styles.label, type.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        style={[styles.input, type.body, fieldStyle, { color: colors.text }]}
        placeholderTextColor={colors.muted}
        {...extra}
      />
    </View>
  );

  return (
    <FamilyRequestChrome
      hero={{ title: copy.composeTitle, subtitle: copy.composeSubtitle }}
    >
      {field(copy.careFor, recipient, setRecipient)}
      {field(copy.servicesTitle, services, setServices)}
      {field(copy.frequencyTitle, visitFrequency, setVisitFrequency)}
      {field(copy.durationTitle, planDuration, setPlanDuration)}
      {field(copy.amount, quoteAmount, setQuoteAmount, { multiline: false, keyboardType: 'numeric' })}
      {field(copy.currency, quoteCurrency, setQuoteCurrency, { multiline: false })}
      {field(copy.billing, billingPeriod, setBillingPeriod)}
      {field(copy.exclusionsTitle, exclusions, setExclusions)}
      {field(copy.paymentTitle, paymentTerms, setPaymentTerms)}
      {field(copy.cancelTitle, cancellationTerms, setCancellationTerms)}

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: colors.continue },
          pressed && styles.pressed,
          !canShare && styles.disabled,
        ]}
        disabled={!canShare}
        onPress={() => {
          if (!canShare) {
            return;
          }
          setSaving(true);
          shareFamilyProposal(inquiry.id, {
            recipient,
            services,
            visitFrequency,
            planDuration,
            quoteAmount,
            quoteCurrency,
            billingPeriod,
            exclusions,
            paymentTerms,
            cancellationTerms,
          })
            .then(() => router.replace('/family-inbox'))
            .finally(() => setSaving(false));
        }}
      >
        <Text style={[styles.primaryText, type.button]}>{copy.share}</Text>
      </Pressable>
    </FamilyRequestChrome>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 20,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primary: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});
