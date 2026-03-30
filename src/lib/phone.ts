import {
  type CountryCode,
  formatIncompletePhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

/** Default country for phone number parsing when no country code is provided */
const DEFAULT_COUNTRY: CountryCode = "US";

/**
 * Format a phone number for display (international format).
 * Returns the original string if it can't be parsed.
 */
export function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return "";
  const parsed = parsePhoneNumberFromString(phone, DEFAULT_COUNTRY);
  return parsed ? parsed.formatInternational() : phone;
}

/**
 * Parse a phone string to E.164 format for storage.
 * Returns null if the input is empty or not a valid phone number.
 */
export function toE164(phone: string): string | null {
  if (!phone.trim()) return null;
  const parsed = parsePhoneNumberFromString(phone, DEFAULT_COUNTRY);
  return parsed?.isValid() ? parsed.number : null;
}

/**
 * Format a partial phone number as the user types.
 * Uses the default country for formatting context.
 */
export function formatPhoneAsYouType(
  value: string,
  country: CountryCode = DEFAULT_COUNTRY,
): string {
  // Strip everything except digits and leading +
  const hasPlus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = hasPlus ? `+${digits}` : digits;
  return formatIncompletePhoneNumber(normalized, country);
}

/**
 * Validate that a string is a valid E.164 phone number.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone.trim()) return true; // empty is valid (field is optional)
  const parsed = parsePhoneNumberFromString(phone, DEFAULT_COUNTRY);
  return parsed?.isValid() ?? false;
}
