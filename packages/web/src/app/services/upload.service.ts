import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {Upload, upload} from "../interfaces/upload";
import {environment} from "../../environments/environment";

@Injectable({ providedIn: 'root' })
export class UploadService {
    constructor(private http: HttpClient) {
    }

    upload(file: File, id: number): Observable<Upload> {
        const data: any = new FormData();
        data.append('file', file);
        return this.http
            .post(environment.apiHost + `/upload/file/${id}`, data, {
                reportProgress: true,
                observe: 'events',
            })
            .pipe(upload());
    }
    uploadUserPhoto(file: File): Observable<Upload> {
        const data: any = new FormData();
        data.append('file', file);
        return this.http
            .post(environment.apiHost + `/upload/user-photo`, data, {
                reportProgress: true,
                observe: 'events',
            })
            .pipe(upload());
    }
}
