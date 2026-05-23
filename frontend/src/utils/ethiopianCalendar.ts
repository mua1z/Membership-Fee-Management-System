/**
 * Ethiopian Calendar Utility
 * Converts Gregorian dates to Ethiopian dates for UI display.
 */

export const ETHIOPIAN_MONTHS_EN: { [key: number]: string } = {
  1: "Meskerem", 2: "Tikimt", 3: "Hidar", 4: "Tahsas", 5: "Tir",
  6: "Yekatit", 7: "Megabit", 8: "Miazia", 9: "Ginbot", 10: "Sene",
  11: "Hamle", 12: "Nehasse", 13: "Pagume"
};

export const ETHIOPIAN_MONTHS_AM: { [key: number]: string } = {
  1: "መስከረም", 2: "ጥቅምት", 3: "ህዳር", 4: "ታህሳስ", 5: "ጥር",
  6: "የካቲት", 7: "መጋቢት", 8: "ሚያዝያ", 9: "ግንቦት", 10: "ሰኔ",
  11: "ሐምሌ", 12: "ነሐሴ", 13: "ጳጉሜ"
};

export const ETHIOPIAN_MONTHS_EN_LIST = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehasse", "Pagume"
];

export const ETHIOPIAN_MONTHS_AM_LIST = [
  "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"
];

/**
 * Compute the Julian Day Number for a Gregorian date.
 */
function gregToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * Convert a Julian Day Number to Ethiopian calendar date.
 */
function jdnToEthiopian(jdn: number): { year: number; month: number; day: number } {
  const epoch = 1723856;
  const diff = jdn - epoch;
  const year = Math.floor((4 * diff + 3) / 1461);
  const remaining = diff - Math.floor((1461 * year) / 4);
  const month = Math.floor(remaining / 30) + 1;
  const day = remaining - 30 * (month - 1) + 1;
  return { year: year + 1, month, day };
}

/**
 * Convert a Gregorian date to Ethiopian calendar { year, month, day }.
 */
export function getEthiopianDate(date: Date = new Date()): { year: number; month: number; day: number } {
  const jdn = gregToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return jdnToEthiopian(jdn);
}

export function getEthiopianYear(date: Date = new Date()): number {
  return getEthiopianDate(date).year;
}

export function getEthiopianMonth(date: Date = new Date()): number {
  return getEthiopianDate(date).month;
}

export function getEthiopianDay(date: Date = new Date()): number {
  return getEthiopianDate(date).day;
}

export function getCurrentEthiopianPeriod() {
  const now = new Date();
  return {
    year: getEthiopianYear(now),
    month: getEthiopianMonth(now)
  };
}

/**
 * Format a Gregorian date as an Ethiopian date string.
 * e.g. "Meskerem 12, 2018" or "መስከረም 12, 2018"
 */
export function formatEthiopianDate(date: Date | string, lang: 'en' | 'am' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const eth = getEthiopianDate(d);
  const months = lang === 'am' ? ETHIOPIAN_MONTHS_AM : ETHIOPIAN_MONTHS_EN;
  return `${months[eth.month]} ${eth.day}, ${eth.year}`;
}
