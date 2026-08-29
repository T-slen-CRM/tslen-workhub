export interface GooglePermissions {
  email: number;
  calendar: number;
  meetingSpace: number;
}

export interface GoogleCalendarInfo {
  id: number;
  userId: number;
  calendarId: string;
  timezone: string;
}
