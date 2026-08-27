import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest } from '@angular/common/http';
import {Observable} from "rxjs";
import {ConfigurationService} from "./ConfigurationService";

@Injectable({
    providedIn: 'root'
})
export class DataService {
    userName: string;
    password: string;
    role: string;
    permissions: string;
    private readonly apiHost: string;
    constructor(private http: HttpClient,
                private configService: ConfigurationService) {
        this.apiHost = this.configService.getApiHost();
    }

    sendToken<T extends { roomName: string, participantName: string}>(url: string, data: T){
        return this.http.post<{ token: string }>(this.apiHost + url, data);
    }
    getPublicMeetingLink(token: string) {
        return this.http.get<{ title: string | null; hostName: string; roomName: string }>(
            this.apiHost + '/meeting-links/public/' + token,
        );
    }
    joinMeetingAsGuest(token: string, displayName: string) {
        return this.http.post<{ livekitToken: string; roomName: string }>(
            this.apiHost + '/meeting-links/' + token + '/join',
            { displayName },
        );
    }
    createMeetingLink(data: { title?: string; expiresAt?: string }) {
        return this.http.post<{ id: number; token: string; roomName: string; title: string | null; expiresAt: string | null }>(
            this.apiHost + '/meeting-links',
            data,
        );
    }
    listMeetingLinks() {
        return this.http.get<{ id: number; title: string | null; roomName: string; expiresAt: string | null; revokedAt: string | null; createdAt: string }[]>(
            this.apiHost + '/meeting-links',
        );
    }
    revokeMeetingLink(id: number) {
        return this.http.delete<void>(this.apiHost + '/meeting-links/' + id);
    }
    deleteSsp(id: number) {
        return this.http.delete(this.apiHost + `/ssp/${id}`)
    }
    changeUser(data: any) {
        return this.http.post(this.apiHost + '/admin/change-user', data, {
            observe: 'response'
        });
    }
    getAllUsers() {
        return this.http.get(this.apiHost + `/users`, {
            observe: 'response'
        });
    }
    uploadPostData(path: string, data: any) {
        const req = new HttpRequest('POST', this.apiHost + path, data, {
            reportProgress: true,
            responseType: 'json'
        });

        return this.http.request(req);
    }
    getOneUser(id){
        return this.http.get(this.apiHost + `/users/${id}`, {
            observe: 'response'
        });
    }
    deleteFilterList(id: number) {
        return this.http.delete(this.apiHost + '/lists/'+ id);
    }
    deleteAudience(id: number) {
        return this.http.delete(this.apiHost + '/audience/'+ id);
    }
    deleteAutorules(id: number) {
        return this.http.delete(this.apiHost + '/autorules/'+ id);
    }
    updateCampaign(id: number, data: object) {
        return this.http.put(this.apiHost + '/campaigns/'+ id, data,{
            observe: 'response'
        });
    }
    updateCreative(id: number, data: object) {
        return this.http.put(this.apiHost + '/creatives/'+ id, data,{
            observe: 'response'
        });
    }
    updateTransaction(id: number, data: object) {
        return this.http.put(this.apiHost + '/transactions/'+ id, data,{
            observe: 'response'
        });
    }
    updateConversion(id: number, data: object) {
        return this.http.put(this.apiHost + '/conversions/'+ id, data,{
            observe: 'response'
        });
    }
    updateAudience(id: number, data: object) {
        return this.http.put(this.apiHost + '/audience/'+ id, data,{
            observe: 'response'
        });
    }
    updateAutorules(id: number, data: object) {
        return this.http.put(this.apiHost + '/autorules/'+ id, data,{
            observe: 'response'
        });
    }
    confirmEmail(hash: string) {
        return this.http.post(this.apiHost + '/auth/confirm-email', {data: {
                tokenActivation: hash
            }}, {
            observe: 'response'
        });
    }
    resetPassword(data: any) {
        return this.http.post(this.apiHost + '/auth/reset-password', {data}, {
            observe: 'response'
        });
    }
    saveSSP(data: any, id: number) {
        return this.http.put(this.apiHost + '/ssp/'+id, data, {
            observe: 'response'
        });
    }
    getAgGridData(path){
        return this.http.get(this.apiHost + path);
    }
    postData(path: string, data: any) {
        return this.http.post(this.apiHost + path, data,{
            observe: 'response'
        });
    }
    postImage(path: string, data: any) {
        return this.http.post<{ imageUrl: string }>(this.apiHost + path, data, {
          observe: 'response'
        });
    }
    getObservableData(path): Observable<any>{
        return this.http.get(this.apiHost + path);
    }
    updateData(path: string, id: number, data: object) {
        return this.http.patch(this.apiHost + path + id, data,{
            observe: 'response'
        });
    }
    deleteData(path: string, id: number) {
        return this.http.delete(this.apiHost + path + id);
    }
}
