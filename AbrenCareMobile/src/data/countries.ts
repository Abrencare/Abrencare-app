/**
 * Dial codes for the countries our families live in. Numbers are stored in
 * E.164 form (+46701234567) so SMS and push delivery never has to guess the
 * country.
 */

export type CountryId =
  | 'ET'
  | 'SE'
  | 'NO'
  | 'GB'
  | 'US'
  | 'CA'
  | 'AE'
  | 'OTHER';

export type Country = {
  id: CountryId;
  dialCode: string;
  flag: string;
  /** Digits expected after the dial code, used for a light sanity check. */
  minDigits: number;
  maxDigits: number;
};

export const COUNTRIES: Country[] = [
  { id: 'ET', dialCode: '+251', flag: '🇪🇹', minDigits: 9, maxDigits: 9 },
  { id: 'SE', dialCode: '+46', flag: '🇸🇪', minDigits: 7, maxDigits: 13 },
  { id: 'NO', dialCode: '+47', flag: '🇳🇴', minDigits: 8, maxDigits: 8 },
  { id: 'GB', dialCode: '+44', flag: '🇬🇧', minDigits: 9, maxDigits: 11 },
  { id: 'US', dialCode: '+1', flag: '🇺🇸', minDigits: 10, maxDigits: 10 },
  { id: 'CA', dialCode: '+1', flag: '🇨🇦', minDigits: 10, maxDigits: 10 },
  { id: 'AE', dialCode: '+971', flag: '🇦🇪', minDigits: 8, maxDigits: 9 },
  { id: 'OTHER', dialCode: '', flag: '🌐', minDigits: 6, maxDigits: 14 },
];

export const DEFAULT_COUNTRY =
  COUNTRIES.find((country) => country.id === 'ET') ?? COUNTRIES[0];

export function countryById(id: CountryId) {
  return COUNTRIES.find((country) => country.id === id) ?? DEFAULT_COUNTRY;
}

/** Reads the region from the device locale, e.g. sv-SE -> Sweden. */
export function detectCountry(): Country {
  try {
    const locale =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : '';
    const region = locale
      .split(/[-_]/)
      .find((part) => /^[A-Z]{2}$/.test(part)) as CountryId | undefined;

    if (region) {
      const match = COUNTRIES.find((country) => country.id === region);
      if (match) {
        return match;
      }
    }
  } catch {
    // Fall through to the Ethiopian default.
  }

  return DEFAULT_COUNTRY;
}

export function digitsOf(value: string) {
  return value.replace(/\D/g, '');
}

/** Drops the national trunk prefix so 0701234567 becomes 701234567. */
export function nationalDigits(value: string) {
  return digitsOf(value).replace(/^0+/, '');
}

export function joinPhone(country: Country, national: string) {
  const digits = nationalDigits(national);

  if (!digits) {
    return '';
  }

  if (country.id === 'OTHER') {
    return `+${digits}`;
  }

  return `${country.dialCode}${digits}`;
}

/** Splits a stored E.164 number back into a country and a local number. */
export function splitPhone(
  value: string,
  fallback: Country = DEFAULT_COUNTRY,
): { country: Country; national: string } {
  const trimmed = value.trim();

  if (!trimmed.startsWith('+')) {
    return { country: fallback, national: nationalDigits(trimmed) };
  }

  const digits = digitsOf(trimmed);
  const withCode = [...COUNTRIES]
    .filter((country) => country.dialCode)
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => digits.startsWith(digitsOf(country.dialCode)));

  if (!withCode) {
    return { country: countryById('OTHER'), national: digits };
  }

  return {
    country: withCode,
    national: digits.slice(digitsOf(withCode.dialCode).length),
  };
}

export function isPhoneComplete(country: Country, national: string) {
  const digits = nationalDigits(national);
  return digits.length >= country.minDigits && digits.length <= country.maxDigits;
}

/** Checks a stored E.164 value, e.g. before enabling a Continue button. */
export function isPhoneValueComplete(value: string) {
  if (!value.trim()) {
    return false;
  }

  const { country, national } = splitPhone(value);
  return isPhoneComplete(country, national);
}
