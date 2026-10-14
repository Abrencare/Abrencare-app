import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import { useLanguage } from '@/context/LanguageContext';
import { useLandingType } from '@/theme/landingType';

const INK = '#16332C';
const MUTED = '#5C6B65';

export default function LegalScreen() {
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  const type = useLandingType('family');
  const doc = Array.isArray(params.doc) ? params.doc[0] : params.doc;
  const privacy = doc === 'privacy';
  const title = privacy ? t.legal.privacyTitle : t.legal.termsTitle;
  const body = privacy ? t.legal.privacyBody : t.legal.termsBody;

  return (
    <FamilyRequestChrome>
      <Text style={[styles.kicker, type.kicker]}>{t.legal.updated}</Text>
      <Text style={[styles.title, type.headline, { color: INK }]}>{title}</Text>
      <Text style={[styles.body, type.body, { color: MUTED }]}>{body}</Text>
    </FamilyRequestChrome>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: MUTED,
    marginBottom: 10,
  },
  title: {
    marginBottom: 16,
  },
  body: {
    lineHeight: 24,
  },
});
