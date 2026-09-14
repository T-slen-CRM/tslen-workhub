import { EventsByUser } from '../entities/events-by-user.entity';

// `eventsByUser.start`/`.end` are naive wall-clock values with no real
// timezone attached (the app never records which IANA zone a "17:00"
// means) - the whole codebase's convention for round-tripping them without
// corruption is to read them back with LOCAL Date getters rather than a
// real UTC conversion (see UsersRepository.convertDateWithoutTimezoneOffset,
// which does the same thing for the same reason). `.toISOString()` here
// would instead perform a genuine UTC conversion and label the result "Z",
// which Google Calendar then "correctly" converts again to the viewer's own
// timezone - double-shifting an event created at 17:00 to display at 20:00
// for a UTC+3 viewer. Formatting as a bare `YYYYMMDDTHHMMSS` (no trailing Z)
// instead gives Google a "floating" time, which it anchors to the viewer's
// own calendar timezone - the same non-corrupting, zone-agnostic contract
// the rest of this codebase already relies on for these fields.
function toGoogleCalendarDate (date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
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
