import { ITaskHistoryEntry } from '../../interfaces/tasks';

type HistoryUser = { id: number; firstName: string; lastName: string } | null;

export function getInitials(user: HistoryUser, fallbackLabel: string | null = null): string {
  if (user) {
    const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
    return initials || '?';
  }
  if (fallbackLabel) {
    const initials = fallbackLabel
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
    return initials || '?';
  }
  return '?';
}

// A fixed, readable-on-dark palette - deterministically hashed from a seed
// (a user id, or a name string when no id is available) so the same person
// always gets the same color across the list, without needing to invent a
// full color-by-category system for what's just a small avatar dot.
const AVATAR_PALETTE = ['#2b7de9', '#7c3aed', '#e2790c', '#1f9d55', '#dc2626', '#0891b2', '#c026d3', '#65a30d'];

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export type RelativeTime =
  | { kind: 'just_now' }
  | { kind: 'minutes' | 'hours' | 'days'; count: number }
  | { kind: 'absolute' };

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RELATIVE_THRESHOLD_DAYS = 7;

export function getRelativeTime(iso: string, now: Date = new Date()): RelativeTime {
  const diffMs = now.getTime() - new Date(iso).getTime();
  if (diffMs < MINUTE_MS) {
    return { kind: 'just_now' };
  }
  if (diffMs < HOUR_MS) {
    return { kind: 'minutes', count: Math.floor(diffMs / MINUTE_MS) };
  }
  if (diffMs < DAY_MS) {
    return { kind: 'hours', count: Math.floor(diffMs / HOUR_MS) };
  }
  const days = Math.floor(diffMs / DAY_MS);
  if (days < RELATIVE_THRESHOLD_DAYS) {
    return { kind: 'days', count: days };
  }
  return { kind: 'absolute' };
}

export interface HistoryDisplayEntry {
  id: string;
  createdAt: string;
  user: HistoryUser;
  kind: 'created' | 'changed';
  field?: string;
  from?: unknown;
  fromLabel?: string | null;
  to?: unknown;
  toLabel?: string | null;
}

// Bookkeeping columns that change on every save but aren't a meaningful
// field for a person to see in the history feed.
const HIDDEN_FIELDS = new Set(['updatedAt']);

// A task creation audits one row per column captured at insert time (title,
// phaseId, projectId, ...), all sharing the same audit-log row id prefix
// (`${rowId}:${field}`) and createdAt - collapse those into the single
// "X created the Work item" row Jira's design shows, instead of one line
// per captured column. Update entries pass through unchanged.
export function groupHistoryEntries (entries: ITaskHistoryEntry[]): HistoryDisplayEntry[] {
  const seenCreatedRows = new Set<string>();
  const result: HistoryDisplayEntry[] = [];
  for (const entry of entries) {
    if (HIDDEN_FIELDS.has(entry.field)) {
      continue;
    }
    if (entry.action === 'insert') {
      const rowId = entry.id.split(':')[0];
      if (seenCreatedRows.has(rowId)) {
        continue;
      }
      seenCreatedRows.add(rowId);
      result.push({ id: rowId, createdAt: entry.createdAt, user: entry.user, kind: 'created' });
      continue;
    }
    result.push({
      id: entry.id,
      createdAt: entry.createdAt,
      user: entry.user,
      kind: 'changed',
      field: entry.field,
      from: entry.from,
      fromLabel: entry.fromLabel,
      to: entry.to,
      toLabel: entry.toLabel,
    });
  }
  return result;
}
