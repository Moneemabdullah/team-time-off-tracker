/**
 * Unit tests for the leave-day calculation.
 *
 * The rule: the date range is inclusive, every calendar day counts as one
 * leave day, and Sunday never counts. No public-holiday or working-calendar
 * logic is applied.
 *
 * Pure functions only, so this file needs no database and no Docker.
 */
import { describe, expect, it } from 'vitest';

import { countLeaveDays, parseDateOnly } from '../src/utils/date';

/** Inclusive count for a `YYYY-MM-DD` pair. */
const count = (start: string, end: string): number =>
  countLeaveDays(parseDateOnly(start), parseDateOnly(end));

// 2026-10-05 is a Monday, so this week gives one of each weekday.
const MON = '2026-10-05';
const TUE = '2026-10-06';
const WED = '2026-10-07';
const THU = '2026-10-08';
const FRI = '2026-10-09';
const SAT = '2026-10-10';
const SUN = '2026-10-11';
const NEXT_MON = '2026-10-12';

describe('the rule from the brief', () => {
  it.each([
    ['Thu -> Mon', THU, NEXT_MON, 4],
    ['Fri -> Sun', FRI, SUN, 2],
    ['Sat -> Mon', SAT, NEXT_MON, 2],
    ['Mon -> Fri', MON, FRI, 5],
    ['Sat -> Sat', SAT, SAT, 1],
    ['Sun -> Sun', SUN, SUN, 0],
  ])('%s = %i days', (_label, start, end, expected) => {
    expect(count(start, end)).toBe(expected);
  });
});

describe('ranges that span a Sunday', () => {
  it('Mon -> Sun counts six days, dropping only the Sunday', () => {
    expect(count(MON, SUN)).toBe(6);
  });

  it('Mon -> Sat counts six days because Saturday counts', () => {
    expect(count(MON, SAT)).toBe(6);
  });

  it('Sun -> next Sun counts only the six days between them', () => {
    expect(count(SUN, '2026-10-18')).toBe(6);
  });

  it('excludes every Sunday in a two-week range', () => {
    // 14 inclusive days spanning two Sundays => 12 leave days.
    expect(count(MON, '2026-10-18')).toBe(12);
  });
});

describe('single days', () => {
  it.each([
    ['Monday', MON, 1],
    ['Tuesday', TUE, 1],
    ['Wednesday', WED, 1],
    ['Thursday', THU, 1],
    ['Friday', FRI, 1],
    ['Saturday', SAT, 1],
    ['Sunday', SUN, 0],
  ])('%s = %i day(s)', (_label, day, expected) => {
    expect(count(day, day)).toBe(expected);
  });

  it('makes every non-Sunday single day usable, including Saturday', () => {
    expect(count(SAT, SAT)).toBeGreaterThan(0);
  });

  it('leaves a Sunday-only range at zero, so it can still be rejected', () => {
    expect(count(SUN, SUN)).toBe(0);
  });
});

describe('longer ranges', () => {
  it('counts a month-spanning range inclusively, minus its Sundays', () => {
    // October 2026 runs 01 (Thu) to 31 (Sat): 31 inclusive days containing
    // 4 Sundays (the 4th, 11th, 18th and 25th).
    expect(count('2026-10-01', '2026-10-31')).toBe(31 - 4);
  });

  it('counts a cross-year range inclusively, minus its Sundays', () => {
    // 2026-12-28 is a Monday through 2027-01-03, a full 7-day week.
    expect(count('2026-12-28', '2027-01-03')).toBe(6);
  });

  it('crosses a year boundary correctly at 28 Feb in a leap year', () => {
    // 2028-02-28 is a Monday through 2028-03-05, spanning the leap day.
    expect(count('2028-02-28', '2028-03-05')).toBe(6);
  });
});

describe('regression: the old Monday-Friday rule is gone', () => {
  it('counts a Saturday, which the old rule skipped', () => {
    expect(count(SAT, SAT)).toBe(1);
  });

  it('no longer gives the same answer as the old Mon-Fri count', () => {
    // Old rule would have returned 3 for Thu -> Mon.
    expect(count(THU, NEXT_MON)).toBe(4);
  });
});

describe('arguments and boundaries', () => {
  it('is not symmetric: it walks forward from startDate to endDate', () => {
    // Documented behaviour, not an accident. `createRequest` rejects
    // startDate > endDate with a 400 before calling this, so the reversed case
    // never reaches it in practice.
    expect(count(THU, NEXT_MON)).toBe(4);
    expect(count(NEXT_MON, THU)).toBe(0);
  });

  it('returns 0 when endDate is before startDate', () => {
    expect(count(NEXT_MON, THU)).toBe(0);
  });

  it('does not mutate the Date it is given', () => {
    const start = parseDateOnly(MON);
    const end = parseDateOnly(FRI);
    const startBefore = start.getTime();
    const endBefore = end.getTime();

    countLeaveDays(start, end);

    expect(start.getTime()).toBe(startBefore);
    expect(end.getTime()).toBe(endBefore);
  });

  it('does not mutate a reused cursor between calls', () => {
    expect(count(MON, FRI)).toBe(5);
    expect(count(MON, FRI)).toBe(5);
  });
});