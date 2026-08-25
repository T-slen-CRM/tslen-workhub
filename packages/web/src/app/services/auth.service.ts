import {Injectable, Signal, signal, WritableSignal} from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {BehaviorSubject, Observable} from "rxjs";
import {map} from "rxjs/operators";
import {ConfigurationService} from "./ConfigurationService";

export interface ISessionData {
    userId?: number;
    companyId?: number;
    userEmail?: string;
    userRole?: string;
    balance?: string;
    firstName?: string;
    lastName?: string;
    userAvatar?: string;
    changedUserRole?: string;
    useDarkTheme?: number;
    id?: number;
    role?: string;
    avatar?: string;
    email?: string;
    googlePermissions?: IUserGooglePermissions;
    language?: string;
}

export class AuthDataParams implements ISessionData {

    userId: number;
    companyId: number;
    userEmail: string;
    userRole: string;
    balance: string;
    firstName: string;
    lastName: string;
    userAvatar: string;
    changedUserRole: string;
    useDarkTheme: number;
    id: number;
    role: string;
    avatar: string;
    email: string;
    googlePermissions: IUserGooglePermissions;
    language: string;

    constructor(authData: ISessionData) {
        if (Object.keys(authData).length) {
            ({  userId: this.userId,
                userEmail: this.userEmail,
                userRole: this.userRole,
                balance: this.balance,
                firstName: this.firstName,
                lastName: this.lastName,
                userAvatar: this.userAvatar,
                changedUserRole: this.changedUserRole,
                useDarkTheme: this.useDarkTheme,
                companyId: this.companyId,
                id: this.id,
                role: this.role,
                avatar: this.avatar,
                email: this.email,
                googlePermissions: this.googlePermissions,
                language: this.language
            } = authData);
        }
    }
}

export class AuthData extends AuthDataParams  {

    constructor(authData: ISessionData) {
        super(authData);
    }

}

@Injectable({
    providedIn: 'root'
})
export class AuthenticationService {

    static UNKNOWN_USER: AuthData;
    private authData$: BehaviorSubject<AuthData>;
    public isGoogleLogged$: BehaviorSubject<boolean>;
    private apiHost: string;
    public get authData(): AuthData {
        return this.authData$.getValue();
    }

    private _authDataSignal: WritableSignal<AuthData> = signal({} as AuthData);
    public readonly authDataSignal: Signal<AuthData> = this._authDataSignal.asReadonly();

    constructor(private http: HttpClient, private configService: ConfigurationService) {
        AuthenticationService.UNKNOWN_USER = new AuthData({});
        this.authData$ = new BehaviorSubject<AuthData>(AuthenticationService.UNKNOWN_USER);
        this.isGoogleLogged$ = new BehaviorSubject<boolean>(false);
        this.apiHost = this.configService.getApiHost();
    }
    setGoogleLogged(isLoggedIn: boolean) {
        this.isGoogleLogged$.next(isLoggedIn);
    }

    logout() {
        localStorage.setItem('isLoggedIn', 'false');
        //remove jwt token from local storage
        localStorage.removeItem('jwtToken');
        this.authData$.next(new AuthData({}));
        // return this.http.get(this.apiHost + '/auth/logout').pipe(
        //     switchMap(() => {
        //         return this.socialAuthService.signOut();
        //     })
        // );
    }

    login(data: Record<string, unknown>): Observable<HttpResponse<unknown>> {
        return this.http.post(this.apiHost + '/auth/login', data, {
            observe: 'response'

        });
    }

    getCurrentUser(): Record<string, unknown> {
        // TODO: Enable after implementation
        if ( Object.keys(localStorage).length > 0 && localStorage.isLoggedIn === 'true' && localStorage.token) {
            return {
                isLoggedIn: localStorage.isLoggedIn,
                token: localStorage.token,
                email: localStorage.token,
                alias: localStorage.token.split('@')[0],
                expiration: new Date(Date.now() + 24 * 60 * 60 * 1000),
                fullName: localStorage.token.split('@')[0],
                userId: localStorage.userId,
            };
        }
        return {};
    }
    forgotPassword(data: object) {
        return this.http.post(this.apiHost + '/auth/forgot-password', data, {
            observe: 'response'
        });
    }

    getAuthData(router: Router | null = null): Observable<boolean> {
        return this.http.get(this.apiHost + '/auth/session-data').pipe(map((authData: AuthData) => {
            if (authData && Object.keys(authData).length) {
                this.authData$.next(new AuthData(authData));
                this._authDataSignal.set(authData);
                return true;
            }
            if (router){
                router.navigate(['auth/login']);
            }
            return false;
        }));
    }
    public updateAuthDataSignal(authData: ISessionData) {
        const nextAuthData = new AuthData(authData);
        this.authData$.next(nextAuthData);
        this._authDataSignal.set(nextAuthData);
    }
}
export interface IUserGooglePermissions {
    email: number;
    calendar: number;
    meetingSpace: number;
}
