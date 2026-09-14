import { buildGoogleCalendarLink } from '../../../../src/resources/events-by-user/utils/google-calendar-link.util';
import { EventsByUser } from '../../../../src/resources/events-by-user/entities/events-by-user.entity';

describe('buildGoogleCalendarLink', () => {
    // Built via local-component construction (year, monthIndex, day, h, m, s),
    // not a UTC ISO string - matches how these Date objects actually behave
    // at runtime (see the comment in google-calendar-link.util.ts) and keeps
    // the round-trip through local getters deterministic regardless of which
    // timezone the test runner itself happens to be in.
    function makeEvent (overrides: Partial<EventsByUser> = {}): EventsByUser {
        return Object.assign(new EventsByUser({}), {
            title: 'Standup',
            start: new Date(2026, 8, 10, 14, 0, 0),
            end: new Date(2026, 8, 10, 14, 30, 0),
            ...overrides,
        });
    }

    it('builds a Google Calendar "render" template link with floating (no-timezone) dates matching the stored wall-clock digits', () => {
        const link = buildGoogleCalendarLink(makeEvent(), 'https://crm.t-slen.com/meet/plaintext-token');

        expect(link).toContain('https://calendar.google.com/calendar/render?');
        expect(link).toContain('action=TEMPLATE');
        expect(link).toContain('text=Standup');
        // No trailing Z: a bare YYYYMMDDTHHMMSS is a "floating" time Google
        // Calendar anchors to the viewer's own calendar timezone, rather
        // than a real UTC instant it would convert - see the util's comment
        // for why a real UTC conversion here previously shifted events by
        // the viewer's UTC offset (reported as a 3-hour shift for Kyiv).
        expect(link).toContain('dates=20260910T140000%2F20260910T143000');
    });

    it('includes the join link in both the details and location fields', () => {
        const link = buildGoogleCalendarLink(makeEvent(), 'https://crm.t-slen.com/meet/plaintext-token');
        const params = new URL(link).searchParams;

        expect(params.get('details')).toContain('https://crm.t-slen.com/meet/plaintext-token');
        expect(params.get('location')).toBe('https://crm.t-slen.com/meet/plaintext-token');
    });

    it('falls back to a generic title when the event has none', () => {
        const link = buildGoogleCalendarLink(makeEvent({ title: null }), 'https://crm.t-slen.com/meet/plaintext-token');
        const params = new URL(link).searchParams;

        expect(params.get('text')).toBe('T-slen meeting');
    });
});
