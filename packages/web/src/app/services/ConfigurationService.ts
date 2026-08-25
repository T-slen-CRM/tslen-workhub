import {Inject, Injectable} from '@angular/core';

import {WINDOW} from '../injection/window';
import {environment} from '../../environments/environment';
import {BehaviorSubject} from "rxjs";
import {AuthData} from "./auth.service";

@Injectable({
    providedIn: 'root'
})
export class ConfigurationService {
    static UNKNOWN_USER: AuthData;
    private authData$: BehaviorSubject<AuthData>;
    public get authData(): AuthData {
        return this.authData$.getValue();
    }
    public isGoogleLogged$: BehaviorSubject<boolean>;
    constructor(
        @Inject(WINDOW) private window: Window,
    ) {
        ConfigurationService.UNKNOWN_USER = new AuthData({});
        this.authData$ = new BehaviorSubject<AuthData>(ConfigurationService.UNKNOWN_USER);
        this.isGoogleLogged$ = new BehaviorSubject<boolean>(false);
    }

    getApiHost(withPrefix = true): string {
        let hostname = this.window.location.hostname; // dynamically get hostname
        const useStaticApiHost = environment.apiHost;
        /** only for local */
        if (hostname === 'localhost'){
            hostname += ':' + environment.serverPort;
        }
        /** only for cloud or Docker */
        if (useStaticApiHost){
            hostname = useStaticApiHost;
        }

        const url = environment.protocol + hostname;
        if (withPrefix){
            return url + environment.urlSufix;
        } else {
           return url;
        }
    }
}
