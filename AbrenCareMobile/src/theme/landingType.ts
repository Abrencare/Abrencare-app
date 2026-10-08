import type { TextStyle } from 'react-native';

import { useLanguage } from '@/context/LanguageContext';
import type { CareService } from '@/types/auth';

/**
 * Editorial type for the home service cards and the three intro slides.
 * English uses a serif display + a quiet sans. Amharic uses Noto Serif Ethiopic
 * so Ge'ez never falls back to empty boxes.
 */
export function useLandingType(service: CareService) {
  const { language } = useLanguage();
  const am = language === 'am';

  const display = am
    ? 'NotoSerifEthiopic_600SemiBold'
    : service === 'consultation'
      ? 'SourceSerif4_600SemiBold'
      : 'CormorantGaramond_600SemiBold';

  const displayMedium = am
    ? 'NotoSerifEthiopic_500Medium'
    : service === 'consultation'
      ? 'SourceSerif4_500Medium'
      : 'CormorantGaramond_500Medium';

  const sans = am ? 'NotoSerifEthiopic_400Regular' : 'DMSans_400Regular';
  const sansMedium = am ? 'NotoSerifEthiopic_500Medium' : 'DMSans_500Medium';
  const sansSemi = am ? 'NotoSerifEthiopic_600SemiBold' : 'DMSans_600SemiBold';

  const headlineSize = service === 'family' ? 30 : 28;
  const headlineTrack =
    service === 'executive' ? -0.6 : service === 'consultation' ? -0.2 : -0.35;

  const kicker: TextStyle = {
    fontFamily: sansSemi,
    fontSize: 10,
    letterSpacing: service === 'executive' ? 2.6 : 2.2,
    textTransform: 'uppercase',
  };

  const headline: TextStyle = {
    fontFamily: display,
    fontSize: headlineSize,
    lineHeight: Math.round(headlineSize * 1.22),
    letterSpacing: headlineTrack,
  };

  const body: TextStyle = {
    fontFamily: sans,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.15,
  };

  const bodySmall: TextStyle = {
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.1,
  };

  const caption: TextStyle = {
    fontFamily: sansMedium,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.2,
  };

  const label: TextStyle = {
    fontFamily: sansSemi,
    fontSize: 13,
    letterSpacing: 0.15,
  };

  const button: TextStyle = {
    fontFamily: sansSemi,
    fontSize: 14,
    letterSpacing: 0.35,
  };

  const section: TextStyle = {
    fontFamily: displayMedium,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  };

  const cardTitle: TextStyle = {
    fontFamily: display,
    fontSize: service === 'family' ? 26 : 24,
    lineHeight: service === 'family' ? 31 : 29,
    letterSpacing: headlineTrack,
  };

  return {
    kicker,
    headline,
    body,
    bodySmall,
    caption,
    label,
    button,
    section,
    cardTitle,
    display,
    displayMedium,
    sans,
    sansMedium,
    sansSemi,
  };
}
