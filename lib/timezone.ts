/**
 * Timezone utilities for handling user-specific date/time display
 */

// List of common timezones for user selection
export const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Belem", label: "Belém (GMT-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
  { value: "America/Recife", label: "Recife (GMT-3)" },
  { value: "America/Bahia", label: "Bahia (GMT-3)" },
  { value: "America/Cuiaba", label: "Cuiabá (GMT-4)" },
  { value: "America/Porto_Velho", label: "Porto Velho (GMT-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
  { value: "America/New_York", label: "Nova York (GMT-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8)" },
  { value: "America/Chicago", label: "Chicago (GMT-6)" },
  { value: "Europe/London", label: "Londres (GMT+0)" },
  { value: "Europe/Paris", label: "Paris (GMT+1)" },
  { value: "Europe/Lisbon", label: "Lisboa (GMT+0)" },
  { value: "Asia/Tokyo", label: "Tóquio (GMT+9)" },
  { value: "Australia/Sydney", label: "Sydney (GMT+11)" },
  { value: "UTC", label: "UTC (GMT+0)" },
] as const;

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Convert a UTC date to the user's timezone
 */
export function toUserTimezone(date: Date | string, timezone: string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  
  // Create a date string in the target timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  const parts = formatter.formatToParts(d);
  
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  
  const year = parseInt(getPart("year"));
  const month = parseInt(getPart("month")) - 1;
  const day = parseInt(getPart("day"));
  const hour = parseInt(getPart("hour"));
  const minute = parseInt(getPart("minute"));
  const second = parseInt(getPart("second"));
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Get the start of day in user's timezone as UTC
 */
export function getStartOfDayInTimezone(date: Date | string, timezone: string): Date {
  const userDate = toUserTimezone(date, timezone);
  userDate.setHours(0, 0, 0, 0);
  
  // Convert back to UTC by getting the offset
  const offset = getTimezoneOffset(timezone, userDate);
  return new Date(userDate.getTime() + offset);
}

/**
 * Get the end of day in user's timezone as UTC
 */
export function getEndOfDayInTimezone(date: Date | string, timezone: string): Date {
  const userDate = toUserTimezone(date, timezone);
  userDate.setHours(23, 59, 59, 999);
  
  // Convert back to UTC by getting the offset
  const offset = getTimezoneOffset(timezone, userDate);
  return new Date(userDate.getTime() + offset);
}

/**
 * Get timezone offset in milliseconds
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return utcDate.getTime() - tzDate.getTime();
}

/**
 * Format a date in the user's timezone
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  return d.toLocaleString("pt-BR", {
    timeZone: timezone,
    ...options,
  });
}

/**
 * Get the date string (YYYY-MM-DD) in user's timezone
 */
export function getDateStringInTimezone(date: Date | string, timezone: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  return d.toLocaleDateString("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Check if two dates are on the same day in the user's timezone
 */
export function isSameDayInTimezone(
  date1: Date | string,
  date2: Date | string,
  timezone: string
): boolean {
  return (
    getDateStringInTimezone(date1, timezone) ===
    getDateStringInTimezone(date2, timezone)
  );
}

/**
 * Get today's date string in user's timezone
 */
export function getTodayInTimezone(timezone: string): string {
  return getDateStringInTimezone(new Date(), timezone);
}

/**
 * Get the start of today in user's timezone as UTC
 */
export function getStartOfTodayInTimezone(timezone: string): Date {
  return getStartOfDayInTimezone(new Date(), timezone);
}

/**
 * Parse a date range with timezone consideration
 * Returns start and end dates in UTC that cover the full days in user's timezone
 */
export function getDateRangeInTimezone(
  startDate: Date | string,
  endDate: Date | string,
  timezone: string
): { start: Date; end: Date } {
  return {
    start: getStartOfDayInTimezone(startDate, timezone),
    end: getEndOfDayInTimezone(endDate, timezone),
  };
}
