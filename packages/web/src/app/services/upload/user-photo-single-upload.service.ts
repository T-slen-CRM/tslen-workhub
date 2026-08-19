import { Injectable } from '@angular/core';
import {IUploadService} from "./upload";
import {Observable} from "rxjs";
import {DataService} from "../data.service";

@Injectable({
  providedIn: 'root'
})
export class UserPhotoSingleUploadService implements IUploadService{

  constructor(private dataService: DataService) { }

  upload(file: File, userId: number): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file', file);

    return this.dataService.uploadPostData(`/users/profile-avatar/`+userId, formData);
  }
}
