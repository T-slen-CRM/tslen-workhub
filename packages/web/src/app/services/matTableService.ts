import {Injectable} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {IProjectPermission} from '../interfaces/taskProjectPermission';
import {ITaskProject} from "../interfaces/tasks";

@Injectable({
    providedIn: 'root'
})
export class MatTableService {
    public changedMembersRow: Subject<IPermissionChangedRow>;
    constructor() {
    this.changedMembersRow = new Subject();
    }
    public test = '0';
    setChangedMembersRow(row: IPermissionChangedRow){
        this.changedMembersRow.next(row);
    }
}
export interface IPermissionChangedRow {
    action: string;
    row: IProjectPermission | IProjectPermission[];
    project?: ITaskProject;
}
