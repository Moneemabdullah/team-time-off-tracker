const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a `YYYY-MM-DD` string as UTC midnight.
 *
 * Every date in this project is treated as a calendar date anchored to UTC.
 * Using UTC consistently on both parse and iteration is what keeps the day
 * count free of off-by-one errors.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Rejects well-formatted but impossible dates such as `2026-02-30`. */
export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const parsed = parseDateOnly(value);
  return !Number.isNaN(parsed.getTime()) && toDateOnlyString(parsed) === value;
}

export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today as a UTC calendar date, used for the "no past dates" rule. */
export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Counts leave days in the inclusive range [startDate, endDate].
 *
 * Every calendar day counts as one leave day except Sunday, which is never
 * deducted. There is no public-holiday or working-calendar handling yet, so a
 * Saturday is an ordinary leave day.
 *
 * The result is computed once when a request is created and stored on the
 * document, so changing this rule never alters existing requests.
 */
export function countLeaveDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const cursor = new Date(startDate.getTime());

  while (cursor.getTime() <= endDate.getTime()) {
    // getUTCDay(): 0 is Sunday, 1 Monday ... 6 Saturday.
    if (cursor.getUTCDay() !== 0) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
}
