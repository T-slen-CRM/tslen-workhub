import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {DataService} from "../data.service";
import {Upload, upload} from "../../interfaces/upload";
import {IUploadService} from "./upload";

@Injectable({ providedIn: 'root' })
export class ManagerSettingsUploadService implements IUploadService{
    constructor(private dataService: DataService) {}
    upload(file: File): Observable<Upload> {

        const data: any = new FormData();
        data.append('file', file);

        return this.dataService.uploadPostDataEvents('/upload/logo', data).pipe(upload());
    }
}
