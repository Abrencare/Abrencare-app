/**
 * Parses the "date of birth or age" field. Care schedules and health trends are
 * built on this number, so the field accepts only a real calendar date or a
 * plausible age in years — never free text.
 */

export const MIN_AGE = 1;
export const MAX_AGE = 120;

export type BirthInput =
  | { status: 'empty' }
  | { status: 'invalidDate' }
  | { status: 'invalidAge' }
  | { status: 'valid'; kind: 'date'; isoDate: string; ageYears: number }
  | { status: 'valid'; kind: 'age'; isoDate: ''; ageYears: number };

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
  // Amharic month names, mapped the way the rest of the app labels dates.
  ጥር: 1,
  የካቲት: 2,
  መጋቢት: 3,
  ሚያዝያ: 4,
  ግንቦት: 5,
  ሰኔ: 6,
  ሐምሌ: 7,
  ነሐሴ: 8,
  መስከረም: 9,
  ጥቅምት: 10,
  ኅዳር: 11,
  ህዳር: 11,
  ታኅሣሥ: 12,
  ታህሳስ: 12,
};

const AGE_WORDS = /(years?|yrs?|y\.?o\.?|ዓመት|አመት)$/;

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function ageFrom(year: number, month: number, day: number) {
  const today = new Date();
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);

  if (beforeBirthday) {
    age -= 1;
  }

  return age;
}

function buildDate(year: number, month: number, day: number): BirthInput {
  const today = new Date();

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    year > today.getFullYear() ||
    year < today.getFullYear() - MAX_AGE
  ) {
    return { status: 'invalidDate' };
  }

  const birthday = new Date(year, month - 1, day);
  if (birthday.getTime() > today.getTime()) {
    return { status: 'invalidDate' };
  }

  const ageYears = ageFrom(year, month, day);
  if (ageYears < 0 || ageYears > MAX_AGE) {
    return { status: 'invalidDate' };
  }

  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(
    day,
  ).padStart(2, '0')}`;

  return { status: 'valid', kind: 'date', isoDate, ageYears };
}

export function parseBirthInput(raw: string): BirthInput {
  const value = raw.trim().replace(/\s+/g, ' ');

  if (!value) {
    return { status: 'empty' };
  }

  const lower = value.toLowerCase();

  // "71", "71 years", "71 ዓመት"
  const ageMatch = lower.match(/^(\d{1,7})\s*(.*)$/);
  if (ageMatch && (!ageMatch[2] || AGE_WORDS.test(ageMatch[2]))) {
    const years = Number(ageMatch[1]);

    if (years >= MIN_AGE && years <= MAX_AGE) {
      return { status: 'valid', kind: 'age', isoDate: '', ageYears: years };
    }

    return { status: 'invalidAge' };
  }

  // "15 March 1955", "March 15 1955", "15 መጋቢት 1955"
  const words = lower.replace(/,/g, ' ').split(' ').filter(Boolean);
  if (words.length === 3) {
    const monthWord = words.find((word) => MONTHS[word] !== undefined);

    if (monthWord) {
      const numbers = words
        .filter((word) => word !== monthWord)
        .map((word) => Number(word.replace(/\D/g, '')));

      if (numbers.every((number) => Number.isFinite(number) && number > 0)) {
        const [first, second] = numbers;
        const year = first > 31 ? first : second;
        const day = first > 31 ? second : first;
        return buildDate(year, MONTHS[monthWord], day);
      }
    }

    return { status: 'invalidDate' };
  }

  // "15/03/1955", "15-03-1955", "1955-03-15"
  const parts = lower.split(/[/\-.]/).filter(Boolean);
  if (parts.length === 3 && parts.every((part) => /^\d{1,4}$/.test(part))) {
    const numbers = parts.map(Number);

    if (parts[0].length === 4) {
      return buildDate(numbers[0], numbers[1], numbers[2]);
    }

    return buildDate(numbers[2], numbers[1], numbers[0]);
  }

  // Anything that looks like an attempted date gets the date hint; bare
  // gibberish is treated as a failed age entry.
  const looksLikeDate =
    /[/\-.]/.test(value) || words.some((word) => MONTHS[word] !== undefined);

  return { status: looksLikeDate ? 'invalidDate' : 'invalidAge' };
}

export function isBirthInputAccepted(raw: string) {
  return parseBirthInput(raw).status === 'valid';
}
