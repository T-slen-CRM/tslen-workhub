import { Role } from './role';
import { GoogleCalendarInfo, GooglePermissions } from './google';

/**
 * What the backend actually signs into the JWT at login (see
 * UserPayloadJwt) and returns from GET /auth/session-data — not the full
 * Users entity, which carries fields (password, relations, ...) that were
 * never meant to reach the client.
 */
export interface CurrentUser {
  id: number;
  role: Role;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  avatar: string;
  company: string;
  address: string;
  phone: string;
  skype: string;
  emailSpare: string;
  isActive: number;
  companyId: number;
  chiefId: number;
  mentorId: number;
  birthDay: Date;
  firstDayInCompany: Date;
  lastDayInCompany: Date;
  googlePermissions: GooglePermissions;
  googleCalendars: GoogleCalendarInfo;
  language: string;
}
