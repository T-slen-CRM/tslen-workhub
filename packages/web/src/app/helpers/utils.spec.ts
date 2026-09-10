import { getDaysArray, getMonthDateRange, getTodayDateRange } from './utils';

describe('getDaysArray', () => {
  it('walks UTC calendar days, not local ones - a single day yields exactly one entry', () => {
    const result = getDaysArray('2026-08-29T00:00:00.000Z', '2026-08-29T23:59:00.000Z');

    expect(result.length).toBe(1);
    expect(result[0].getUTCFullYear()).toBe(2026);
    expect(result[0].getUTCMonth()).toBe(7); // August, 0-indexed
    expect(result[0].getUTCDate()).toBe(29);
  });

  it('includes every UTC calendar day in a multi-day range, inclusive of both ends', () => {
    const result = getDaysArray('2026-08-29T00:00:00.000Z', '2026-08-31T23:59:00.000Z');

    expect(result.map((d) => d.getUTCDate())).toEqual([29, 30, 31]);
  });

  it('crosses a UTC month boundary correctly', () => {
    const result = getDaysArray('2026-08-31T00:00:00.000Z', '2026-09-01T23:59:00.000Z');

    expect(result.map((d) => `${d.getUTCMonth()}-${d.getUTCDate()}`)).toEqual(['7-31', '8-1']);
  });
});

describe('getMonthDateRange', () => {
  it('returns the first and last day of the given month as ISO date strings', () => {
    const result = getMonthDateRange(2026, 6);

    expect(result).toEqual({ startDate: '2026-06-01', endDate: '2026-06-30' });
  });

  it('zero-pads single-digit months', () => {
    const result = getMonthDateRange(2026, 3);

    expect(result.startDate).toBe('2026-03-01');
  });

  it('handles the December -> next year rollover', () => {
    const result = getMonthDateRange(2026, 12);

    expect(result).toEqual({ startDate: '2026-12-01', endDate: '2026-12-31' });
  });
});

describe('getTodayDateRange', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the current local date as both the start and end', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 10, 15, 30));

    const result = getTodayDateRange();

    expect(result).toEqual({ startDate: '2026-09-10', endDate: '2026-09-10' });
  });

  it('zero-pads single-digit months and days', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 5, 9, 0));

    const result = getTodayDateRange();

    expect(result).toEqual({ startDate: '2026-03-05', endDate: '2026-03-05' });
  });

  it('uses the viewer\'s local date, not a UTC-shifted one, near local midnight', () => {
    // 2026-09-09 23:30 local time - if this were computed via
    // toISOString() (which converts to UTC first), a viewer ahead of UTC
    // would see this instant already rolled into the next UTC day.
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 9, 23, 30));

    const result = getTodayDateRange();

    expect(result).toEqual({ startDate: '2026-09-09', endDate: '2026-09-09' });
  });
});
