import {Observable} from "rxjs";

export abstract class IUploadService {
    abstract upload(file: File, id?: number): Observable<any>;
}
