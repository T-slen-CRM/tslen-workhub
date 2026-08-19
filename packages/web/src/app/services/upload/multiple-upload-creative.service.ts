import { Injectable } from '@angular/core';
import {IUploadService} from "./upload";
import {Observable} from "rxjs";
import {DataService} from "../data.service";

@Injectable({
  providedIn: 'root'
})
export class MultipleUploadCreativeService implements IUploadService{
  constructor(private dataService: DataService) {}

  upload(file: File, params: any): Observable<any> {
      const id = params.id;
      const formData: FormData = new FormData();

      formData.append('file', file);

      return this.dataService.uploadPostData(`/upload/file/${id}`, formData);
  }
}
