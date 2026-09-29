import { useAppTheme } from '@/context/ThemeContext';
import { getServiceTheme } from '@/service/serviceTheme';

export type ExecutivePalette = {
  page: string;
  card: string;
  cardBorder: string;
  hero: string;
  heroAlt: string;
  heroText: string;
  heroMuted: string;
  heroChip: string;
  heroChipBorder: string;
  text: string;
  muted: string;
  faint: string;
  divider: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  onAccent: string;
  kicker: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
  slate: string;
  slateSoft: string;
  track: string;
};

const lightService = getServiceTheme('executive', false);
const darkService = getServiceTheme('executive', true);

const light: ExecutivePalette = {
  page: lightService.background,
  card: lightService.field,
  cardBorder: lightService.border,
  hero: '#2B2318',
  heroAlt: '#1A150E',
  heroText: '#FFFFFF',
  heroMuted: 'rgba(243, 232, 208, 0.80)',
  heroChip: 'rgba(255, 255, 255, 0.12)',
  heroChipBorder: 'rgba(255, 255, 255, 0.22)',
  text: lightService.text,
  muted: lightService.muted,
  faint: '#A79B87',
  divider: '#EFE8DA',
  accent: lightService.accent,
  accentSoft: lightService.accentSoft,
  accentBorder: lightService.border,
  onAccent: '#FFFFFF',
  kicker: '#B08E4A',
  success: '#5E8A63',
  successSoft: '#E9F1E8',
  danger: '#C2453A',
  dangerSoft: '#FBEAE8',
  dangerBorder: '#F1D9D5',
  slate: '#7E93A8',
  slateSoft: '#E4EAF1',
  track: '#EDE5D6',
};

const dark: ExecutivePalette = {
  page: darkService.background,
  card: darkService.card,
  cardBorder: '#2C3833',
  hero: '#1A1409',
  heroAlt: '#0D0A05',
  heroText: darkService.text,
  heroMuted: 'rgba(232, 223, 204, 0.74)',
  heroChip: 'rgba(255, 255, 255, 0.10)',
  heroChipBorder: 'rgba(255, 255, 255, 0.16)',
  text: darkService.text,
  muted: darkService.muted,
  faint: '#8E968F',
  divider: '#28322E',
  accent: darkService.accent,
  accentSoft: darkService.accentSoft,
  accentBorder: '#3A3220',
  onAccent: '#1A150E',
  kicker: '#D8BC7E',
  success: '#86B489',
  successSoft: '#1C2A1F',
  danger: '#EE8A7E',
  dangerSoft: '#2A1C1C',
  dangerBorder: '#3E2521',
  slate: '#9BB0C6',
  slateSoft: '#1E2630',
  track: '#2A3531',
};

export function getExecutivePalette(isDark: boolean): ExecutivePalette {
  return isDark ? dark : light;
}

export function useExecutiveTheme(): ExecutivePalette {
  const { isDark } = useAppTheme();
  return getExecutivePalette(isDark);
}
