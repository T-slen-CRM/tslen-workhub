import { EventsByUser } from '../entities/events-by-user.entity';

// UTC "basic" ISO 8601 format Google Calendar's render endpoint expects for
// `dates` (YYYYMMDDTHHMMSSZ - no dashes/colons/milliseconds).
function toGoogleCalendarDate (date: Date): string {
    return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

// A one-click "Add to Google Calendar" link for T-slen meet invite/reminder/
// reschedule emails - Google's public, unauthenticated `render` template
// URL (https://support.google.com/calendar/answer/2465906) pre-fills a new
// event on whichever Google account opens it. No OAuth or Calendar API
// integration needed on our side, and it works for any recipient regardless
// of whether they're a platform user with a linked Google account.
export function buildGoogleCalendarLink (event: EventsByUser, joinUrl: string): string {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title ?? 'T-slen meeting',
        dates: `${toGoogleCalendarDate(event.start)}/${toGoogleCalendarDate(event.end)}`,
        details: `Join the T-slen meeting: ${joinUrl}`,
        location: joinUrl,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
