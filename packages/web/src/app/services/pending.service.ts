import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import {environment} from "../../environments/environment";
import {BehaviorSubject, Observable, tap} from "rxjs";
import {ConfigurationService} from "./ConfigurationService";

@Injectable({
    providedIn: 'root'
})
export class PendingService {
     pendingCount: BehaviorSubject<number>;
     private apiHost: string;

    constructor(private http: HttpClient,
                private configService: ConfigurationService) {
        this.pendingCount = new BehaviorSubject(null);
        this.apiHost = this.configService.getApiHost();
    }

    setCreativePendingCount(count, firstCreated = false){
        if (firstCreated){
            this.pendingCount.next(count);
        } else {
            let newValue = this.pendingCount.value + count;
            this.pendingCount.next(newValue);
        }

    }
    getPendingData(): Observable<any>{
        return this.http.get(this.apiHost + '/events-by-user/pending').pipe((response: any) =>{
            return response
        })
    }
}

