import { getDaysArray } from './utils';

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
