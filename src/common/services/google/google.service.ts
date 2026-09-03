import { Injectable } from '@nestjs/common';
import { CreateEventsByUserDto } from '../../../resources/events-by-user/dto/create-events-by-user.dto';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { GoogleCalendarRepository } from '../../../resources/google-calendar/google-calendar.repository';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Params$Resource$Events$Delete, Schema$Event, Schema$Events } from 'googleapis/build/src/apis/calendar/v3';
import { GaxiosPromise } from 'googleapis-common';
import { GaxiosResponse } from 'gaxios/build/src/common';
import { EventsByUser } from '../../../resources/events-by-user/entities/events-by-user.entity';
import { UpdateEventsByUserDto } from '../../../resources/events-by-user/dto/update-events-by-user.dto';
import { SpacesServiceClient } from '@google-apps/meet';
import { auth, BaseExternalAccountClient, GoogleAuth, OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { ImpersonatedJWTInput, JWTInput } from 'google-auth-library/build/src/auth/credentials';
import { EventAttendees } from '../../../resources/events-by-user/entities/event-attendees.entity';
import { GooglePermissions } from '@tslen-workhub/shared';

@Injectable()
export class GoogleService {
    protected currentRepository: GoogleCalendarRepository;
    private scopesAPI: string[];
    private credentialsPath: string;
    private credentials: any; // TODO: replace any
    constructor (private configService: ConfigService) {
        /** check if credentials path is a path to json file
         * it is used for Google cloud setup
         *  */
        if (this.configService.get('GOOGLE_CREDENTIALS_PATH').endsWith('.json')) {
            this.credentialsPath = path.join(process.cwd(), this.configService.get('GOOGLE_CREDENTIALS_PATH'));
        } else {
            this.credentials = JSON.parse(this.configService.get('GOOGLE_CREDENTIALS_PATH'));
        }
        this.scopesAPI = this.configService.get('GOOGLE_SCOPES_API').split(',');
    }
    async loadSavedCredentialsIfExist (tokenPath: string): Promise<OAuth2Client|null> {
        try {
            const credentials = this.readCredentials(tokenPath) as JWTInput | ImpersonatedJWTInput;
            return auth.fromJSON(credentials) as OAuth2Client;
        } catch (err) {
            console.log(err);
            return null;
        }
    }
    async saveCredentials (client: OAuth2Client | any, tokenPath: string): Promise<void> {
        const keys: IGoogleAuthCredentials = this.credentials ? this.credentials : this.readCredentials(this.credentialsPath);
        const key = keys.web;
        const payload = JSON.stringify({
            type: 'authorized_user',
            client_id: key.client_id,
            client_secret: key.client_secret,
            refresh_token: client.credentials.refresh_token,
            access_token: client.credentials.access_token
        });
        await fsPromises.writeFile(tokenPath, payload);
    }
    async authorize (userId: number): Promise<any> {
        const tokenPath = path.join(process.cwd(), `credentials/token_${userId}.json`);
        const authClient = await this.loadSavedCredentialsIfExist(tokenPath);
        if (authClient) {
            return authClient;
        }
        throw new Error('No credentials found! Re-login with enabled Google permissions');
    }
    async authorizeOnlyByToken (userId: number): Promise<OAuth2Client|null> {
        const tokenPath = path.join(process.cwd(), `credentials/token_${userId}.json`);
        return await this.loadSavedCredentialsIfExist(tokenPath);
    }
    async createMeetingSpace (userId: number): Promise<{ uri: string }> {
        const authClient: any = await this.authorize(userId);
        const meetClient = new SpacesServiceClient({
            authClient: authClient
        });
        // Construct request
        const request = {};
        // Run request
        const response = await meetClient.createSpace(request);
        const uri = response[0].meetingUri;
        return { uri };
    }
    async getCalendarEvents (userId: number, calendarId: string, authClient:  GoogleAuth | OAuth2Client | BaseExternalAccountClient | string): Promise<EventsByUser[]> {
        let eventsByUser: EventsByUser[] = [];
        const jwtResponse: GaxiosResponse = await this.getEventsByJWT(calendarId, authClient);
        const data: Schema$Events = jwtResponse.data;
        if (jwtResponse.status === 200){
            const events: Schema$Event[] = data.items;
            eventsByUser = this.mapGoogleEventToEventByUser(events, userId, calendarId);
        }
        return eventsByUser;
    }
    async getEventsByJWT (calendarId: string, auth: any): GaxiosPromise<Schema$Events> {
        const calendar = google.calendar({ version: 'v3', auth });
        return await calendar.events.list({
            calendarId: calendarId,
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });
    }
    getCalendarApi (auth: any): any {
        return google.calendar({ version: 'v3', auth });
    }
    async getCalendarData (authClient: any): Promise<{calendarId: string, timezone: string}> {
        let calendarId = 'primary';
        let timezone = 'America/Los_Angeles';
        const calendarAPI = this.getCalendarApi(authClient);
        const calendarMetaData = await calendarAPI.calendars.get({ calendarId });
        if (calendarMetaData.data?.id) {
            calendarId = calendarMetaData.data.id;
            timezone = calendarMetaData.data.timeZone;
        }
        return { calendarId, timezone };
    }
    async createCalendarEvent (eventData: CreateEventsByUserDto, userId: number): Promise<IGoogleCalendarEvent> {
        const calendarId = eventData.googleCalendarId;
        const timezone = eventData.googleTimezone;
        const authClient = await this.authorize(userId);
        const event: IGoogleCalendarEvent = this.getGoogleCalendarEvent(eventData, timezone);
        const calendarAPI = this.getCalendarApi(authClient);
        let createdEvent = await calendarAPI.events.insert(
            {
                calendarId: calendarId,
                requestBody: event,
                conferenceDataVersion: 1
            }
        );
        const eventId = createdEvent.data.id;
        const eventPatch = {
            conferenceData: {
                createRequest: { requestId: eventId + Date.now() }
            }
        };
        const patchSettings: IGoogleCreateEventSettings = {
            calendarId,
            eventId,
            requestBody: eventPatch,
            sendNotifications: true,
            conferenceDataVersion: 1
        };
        createdEvent = await this.patchCalendarEvent(calendarAPI, patchSettings);
        return createdEvent ? createdEvent.data : {} as IGoogleCalendarEvent;
    }
    async patchCalendarEvent (calendarAPI: any, patchSettings: IGoogleCreateEventSettings): Promise<IGoogleCalendarEvent> {
        return await calendarAPI.events.patch(patchSettings);
    }
    async updateCalendarEvent (eventData: UpdateEventsByUserDto, userId: number): Promise<IGoogleCalendarEvent> {
        const calendarId = eventData.googleCalendarId;
        const timezone = eventData.googleTimezone;
        const event: IGoogleCalendarEvent = this.getGoogleCalendarEvent(eventData, timezone);
        const authClient = await this.authorize(userId);
        const calendarAPI = this.getCalendarApi(authClient);
        await calendarAPI.events.update({
            eventId: eventData.googleId,
            calendarId,
            requestBody: event,
            sendNotifications: true,
        });

        return event;
    }
    async deleteCalendarEvent (calendarId: string, eventId: string, userId: number): Promise<Params$Resource$Events$Delete> {
        const authClient = await this.authorize(userId);
        const calendarAPI = this.getCalendarApi(authClient);
        return await calendarAPI.events.delete({
            eventId,
            calendarId
        });
    }
    mapGoogleEventToEventByUser (events: Schema$Event[], userId: number, calendarId: string): EventsByUser[] {
        return events.map((googleEvent: Schema$Event): EventsByUser => {
            const eventByUser = new EventsByUser({});

            //3i5u6u97lg8ja7hc6iitkiitkv_20231124T073000Z
            // use id without _20231124T073000Z
            // eventByUser.googleId = event.id ? event.id.split('_')[0] : "";
            eventByUser.googleId = googleEvent.id;
            eventByUser.title = googleEvent.summary ? googleEvent.summary : "no permission for title";
            eventByUser.start = this.getGoogleDate(googleEvent.start);
            eventByUser.end = this.getGoogleDate(googleEvent.end);
            eventByUser.primaryColor = '#1e90ff';
            eventByUser.approved = 1;
            eventByUser.comment = "";
            // convert this 2023-08-09T07:52:16.020Z to 2023-08-09 07:52:16
            eventByUser.createdAt = googleEvent.updated ? googleEvent.updated.replace('T', ' ').replace('Z', '') : new Date().toISOString().replace('T', ' ').replace('Z', '');
            eventByUser.isRequest = false;
            eventByUser.requestType = "own";
            eventByUser.secondaryColor = "";
            eventByUser.userId = userId;
            eventByUser.googleMeetLink = googleEvent.hangoutLink || null;
            eventByUser.isGoogleEvent = true;
            eventByUser.googleCalendarId = calendarId;
            eventByUser.attendees = googleEvent.attendees ? this.convertGoogleAttendees(googleEvent.attendees) : [];

            return eventByUser
        });
    }
    getGoogleCalendarEvent (eventData: EventsByUser | UpdateEventsByUserDto, timezone: string): IGoogleCalendarEvent {
        const attendees = eventData.attendees.map((attendee: EventAttendees) => {return { email: attendee.userEmail }});
        return {
            'summary': eventData.title,
            'description': eventData.comment,
            'start': {
                'dateTime': this.getIsoFormattedDate(eventData.start)/*'2023-08-30T09:00:00-07:00'*/,
                'timeZone': timezone,
            },
            'end': {
                'dateTime': this.getIsoFormattedDate(eventData.end),
                'timeZone': timezone,
            },
            'attendees': attendees || [],
            'reminders': {
                'useDefault': false,
                'overrides': [
                    { 'method': 'email', 'minutes': 24 * 60 },
                    { 'method': 'popup', 'minutes': 10 },
                ],
            },
        };
    }
    getGoogleDate (date: { dateTime: Date, date: Date }): Date {
        if (date.dateTime) {
            // Google returns an offset-aware ISO string (e.g. "...T15:00:00+02:00"), but
            // EventsByUser.start/end is a "timestamp without time zone" column that every
            // other producer fills with literal wall-clock digits (no conversion, see
            // AGENTS.md's TZ=UTC note). Strip the offset instead of converting through it,
            // so a synced Google event lands on the same literal digits as a manually
            // created one and renders in the same place downstream.
            const naiveDateTime = date.dateTime.toString().replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '');
            return new Date(naiveDateTime);
        } else if (date.date) {
            return date.date;
        }
    }
    getIsoFormattedDate (date: Date): string {
        const originalDate = new Date(date);
        return originalDate.toISOString().replace('Z', '');
    }
    readCredentials (filePath: string): IGoogleAuthCredentials{
        const credentialsPath = path.join(filePath);
        const content: string = fs.readFileSync(credentialsPath, 'utf-8');
        return JSON.parse(content);
    }
    async getOAuth2ClientUrl (): Promise<{ url: string}> {
        const authClient = this.getAuthClient();
        return this.getAuthUrl(authClient);
    }
    getAuthClient (): OAuth2Client {
        const keys: IGoogleAuthCredentials = this.credentials ? this.credentials : this.readCredentials(this.credentialsPath);
        const redirectUri = keys.web.redirect_uris[0];
        const authClient = new OAuth2Client(
            keys.web.client_id,
            keys.web.client_secret,
            redirectUri
        );
        return authClient;
    }
    getAuthUrl (authClient: OAuth2Client): { url: string} {
        // Generate the url that will be used for the consent dialog.
        const authorizeUrl = authClient.generateAuthUrl({
            access_type: 'offline',
            scope: this.scopesAPI,
            prompt: 'consent',
            include_granted_scopes: true
        });
        return { url: authorizeUrl };
    }
    async getAuthClientData (code: string): Promise<{ email: string, refreshToken: string, accessToken: string }> {
        const authClient = this.getAuthClient();
        const tokenData = await authClient.getToken(code);
        const tokens = tokenData.tokens;
        const refreshToken = tokens?.refresh_token || '';
        const accessToken = tokens?.access_token || '';

        authClient.setCredentials(tokens);

        const googleAuth = google.oauth2({
            version: "v2",
            auth: authClient,
        } as any);

        const googleUserInfo = await googleAuth.userinfo.get();
        const email = googleUserInfo.data.email;
        return { email, refreshToken, accessToken };
    }
    convertGoogleAttendees (attendees: { email: string }[]): EventAttendees[] {
        return attendees.map((attendee: { email: string }) => {
            return Object.assign(new EventAttendees({}), { userEmail: attendee.email });
        });
    }
    getGooglePermissions (scope: string): GooglePermissions {
        const scopes = {
            calendar: 'https://www.googleapis.com/auth/calendar',
            meetingSpace: 'https://www.googleapis.com/auth/meetings.space.created',
            email: 'https://www.googleapis.com/auth/userinfo.email',
        };

        const googlePermissions: GooglePermissions = {
            calendar: 0,
            meetingSpace: 0,
            email: 0,
        };

        if (scope) {
            Object.entries(scopes).forEach(([key, value]) => {
                if (scope.includes(value)) {
                    googlePermissions[key as keyof GooglePermissions] = 1;
                }
            });
        }

        return googlePermissions;
    }

}
export interface IGoogleCalendarEvent {
    kind?: string;
    etag?: string;
    id?: string;
    status?: string;
    htmlLink?: string;
    created?: string;
    updated?: string;
    summary: string;
    creator?: {
        email: string;
    };
    organizer?: {
        email: string;
        self: boolean;
    };
    start: {
        dateTime: string;
        timeZone?: string;
    };
    end: {
        dateTime: string;
        timeZone?: string;
    };
    iCalUID?: string;
    sequence?: number;
    reminders?: {
        useDefault: boolean;
        overrides: [
            {
                method: string;
                minutes: number;
            },
            {
                method: string;
                minutes: number;
            }
            ];
    };
    eventType?: string;
    description?: string;
    attendees?: { email: string }[];
    location?: string;
    googleId?: string;
    conferenceDataVersion?: number;
    conferenceData?: any;
    googleCalendarId?: string;
    entryPoints?: any;
    conferenceSolution?: any;
    googleTimeZone?: number;
    hangoutLink?: string;
}
export interface IGoogleAuthCredentials {
    web: {
        client_id: string,
        client_secret: string,
        redirect_uris: string[]
        auth_uri: string,
        token_uri: string,
        auth_provider_x509_cert_url: string,
        javascript_origins: string[]
    }
}
export interface IGoogleCreateEventSettings {
    calendarId: string;
    eventId: string;
    requestBody: any;
    sendNotifications?: boolean;
    conferenceDataVersion?: number;
}
