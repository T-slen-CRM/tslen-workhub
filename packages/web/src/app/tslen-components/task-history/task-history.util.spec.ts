import { getInitials, getAvatarColor, getRelativeTime, groupHistoryEntries } from './task-history.util';
import { ITaskHistoryEntry } from '../../interfaces/tasks';

describe('getInitials', () => {
  it('takes the first letter of the first and last name, uppercased', () => {
    expect(getInitials({ id: 1, firstName: 'oleksii', lastName: 'bulakh' })).toBe('OB');
  });

  it('falls back to the first two words of a label string when there is no user object', () => {
    expect(getInitials(null, 'Oleksandr Korneiko')).toBe('OK');
  });

  it('falls back to a single "?" when neither a user nor a label is available', () => {
    expect(getInitials(null, null)).toBe('?');
  });
});

describe('getAvatarColor', () => {
  it('is deterministic - the same seed always produces the same color', () => {
    expect(getAvatarColor('42')).toBe(getAvatarColor('42'));
  });

  it('produces different colors for different seeds (not a constant)', () => {
    const colors = new Set(['1', '2', '3', '4', '5', '6', '7', '8'].map((seed) => getAvatarColor(seed)));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('getRelativeTime', () => {
  const now = new Date('2026-09-04T12:00:00.000Z');

  it('is "just_now" for anything under a minute old', () => {
    expect(getRelativeTime('2026-09-04T11:59:30.000Z', now)).toEqual({ kind: 'just_now' });
  });

  it('is "minutes" with a count for anything under an hour old', () => {
    expect(getRelativeTime('2026-09-04T11:45:00.000Z', now)).toEqual({ kind: 'minutes', count: 15 });
  });

  it('is "hours" with a count for anything under a day old', () => {
    expect(getRelativeTime('2026-09-04T09:00:00.000Z', now)).toEqual({ kind: 'hours', count: 3 });
  });

  it('is "days" with a count for anything under the 7-day threshold', () => {
    expect(getRelativeTime('2026-09-02T12:00:00.000Z', now)).toEqual({ kind: 'days', count: 2 });
  });

  it('falls back to "absolute" at/after the 7-day threshold', () => {
    expect(getRelativeTime('2026-08-25T12:00:00.000Z', now)).toEqual({ kind: 'absolute' });
  });
});

describe('groupHistoryEntries', () => {
  it('collapses every "insert" field entry from the same audit row into a single "created" entry', () => {
    const user = { id: 9, firstName: 'Ihor', lastName: 'Samarskyi' };
    const entries: ITaskHistoryEntry[] = [
      { id: '5:title', createdAt: '2026-08-25T18:23:00.000Z', action: 'insert', field: 'title', from: null, fromLabel: null, to: 'New task', toLabel: null, user },
      { id: '5:phaseId', createdAt: '2026-08-25T18:23:00.000Z', action: 'insert', field: 'phaseId', from: null, fromLabel: null, to: 1, toLabel: 'Backlog', user },
    ];

    const result = groupHistoryEntries(entries);

    expect(result).toEqual([{ id: '5', createdAt: '2026-08-25T18:23:00.000Z', user, kind: 'created' }]);
  });

  it('passes update entries through unchanged, as individual "changed" entries', () => {
    const user = { id: 1, firstName: 'oleksii', lastName: 'bulakh' };
    const entries: ITaskHistoryEntry[] = [
      { id: '10:status', createdAt: '2026-09-02T10:00:00.000Z', action: 'update', field: 'status', from: 'backlog', fromLabel: null, to: 'inProgress', toLabel: null, user },
    ];

    const result = groupHistoryEntries(entries);

    expect(result).toEqual([{
      id: '10:status', createdAt: '2026-09-02T10:00:00.000Z', user, kind: 'changed',
      field: 'status', from: 'backlog', fromLabel: null, to: 'inProgress', toLabel: null,
    }]);
  });

  it('drops "updatedAt" changes - a bookkeeping column, not a meaningful field to show', () => {
    const user = { id: 1, firstName: 'oleksii', lastName: 'bulakh' };
    const entries: ITaskHistoryEntry[] = [
      { id: '10:status', createdAt: '2026-09-02T10:00:00.000Z', action: 'update', field: 'status', from: 'backlog', fromLabel: null, to: 'inProgress', toLabel: null, user },
      { id: '10:updatedAt', createdAt: '2026-09-02T10:00:00.000Z', action: 'update', field: 'updatedAt', from: '2026-09-01T10:00:00.000Z', fromLabel: null, to: '2026-09-02T10:00:00.000Z', toLabel: null, user },
    ];

    const result = groupHistoryEntries(entries);

    expect(result.map((e) => e.field)).toEqual(['status']);
  });

  it('drops an update entry that only touched "updatedAt", leaving no entry for that row at all', () => {
    const user = { id: 1, firstName: 'oleksii', lastName: 'bulakh' };
    const entries: ITaskHistoryEntry[] = [
      { id: '10:updatedAt', createdAt: '2026-09-02T10:00:00.000Z', action: 'update', field: 'updatedAt', from: '2026-09-01T10:00:00.000Z', fromLabel: null, to: '2026-09-02T10:00:00.000Z', toLabel: null, user },
    ];

    const result = groupHistoryEntries(entries);

    expect(result).toEqual([]);
  });

  it('keeps creation and later changes in the original (newest-first) order', () => {
    const user = { id: 1, firstName: 'oleksii', lastName: 'bulakh' };
    const entries: ITaskHistoryEntry[] = [
      { id: '10:status', createdAt: '2026-09-02T10:00:00.000Z', action: 'update', field: 'status', from: 'backlog', fromLabel: null, to: 'inProgress', toLabel: null, user },
      { id: '5:title', createdAt: '2026-08-25T18:23:00.000Z', action: 'insert', field: 'title', from: null, fromLabel: null, to: 'New task', toLabel: null, user },
    ];

    const result = groupHistoryEntries(entries);

    expect(result.map((e) => e.kind)).toEqual(['changed', 'created']);
  });
});
