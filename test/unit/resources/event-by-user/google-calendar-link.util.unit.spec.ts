import { buildGoogleCalendarLink } from '../../../../src/resources/events-by-user/utils/google-calendar-link.util';
import { EventsByUser } from '../../../../src/resources/events-by-user/entities/events-by-user.entity';

describe('buildGoogleCalendarLink', () => {
    function makeEvent (overrides: Partial<EventsByUser> = {}): EventsByUser {
        return Object.assign(new EventsByUser({}), {
            title: 'Standup',
            start: new Date('2026-09-10T14:00:00.000Z'),
            end: new Date('2026-09-10T14:30:00.000Z'),
            ...overrides,
        });
    }

    it('builds a Google Calendar "render" template link with UTC basic-format dates', () => {
        const link = buildGoogleCalendarLink(makeEvent(), 'https://crm.t-slen.com/meet/plaintext-token');

        expect(link).toContain('https://calendar.google.com/calendar/render?');
        expect(link).toContain('action=TEMPLATE');
        expect(link).toContain('text=Standup');
        expect(link).toContain('dates=20260910T140000Z%2F20260910T143000Z');
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
