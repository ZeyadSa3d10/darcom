/**
 * Utilities for forgiving phone and number inputs in Arabic / English.
 * Supports auto-conversion of Arabic-Indic (٠-٩) and Persian (۰-۹) digits.
 */

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Replaces any Eastern Arabic (٠-٩) or Persian (۰-۹) numerals with standard ASCII (0-9).
 * E.g. "٠١٠١٢٣٤٥٦٧٨" -> "01012345678"
 */
export function normalizeDigits(str) {
  if (str == null) return '';
  return str
    .toString()
    .replace(/[٠-٩]/g, (d) => ARABIC_DIGITS.indexOf(d))
    .replace(/[۰-۹]/g, (d) => PERSIAN_DIGITS.indexOf(d));
}

/**
 * Cleans and standardizes an Egyptian mobile phone number:
 * - Converts Arabic digits to ASCII
 * - Removes whitespace, hyphens, parentheses, and dots
 * - Normalizes international prefixes (+20, 0020, 201) to standard 01... format
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = normalizeDigits(phone).trim();
  // Strip non-digit characters except leading plus
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+20')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0020')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('20') && cleaned.length === 12 && cleaned.startsWith('201')) {
    cleaned = '0' + cleaned.slice(2);
  }

  return cleaned;
}

/**
 * Validates if the phone is a valid Egyptian mobile number (010, 011, 012, 015 - 11 digits).
 */
export function isValidEgyptianPhone(phone) {
  const cleaned = cleanPhoneNumber(phone);
  return /^01[0125]\d{8}$/.test(cleaned);
}

/**
 * Formats an 11-digit Egyptian phone number for friendly readability: "010 1234 5678".
 */
export function formatEgyptianPhone(phone) {
  const cleaned = cleanPhoneNumber(phone);
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }
  return cleaned;
}

