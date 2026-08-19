import {Injectable} from "@angular/core";
import {DataService} from "../../../services/data.service";
import {ITaskPhase} from "../../../interfaces/tasks";

@Injectable()
export class TasksListService {
  constructor(private dataService: DataService) {}

    savePhase (phase: ITaskPhase) {
        return this.dataService.postData('/task-phase', phase);
    }
    updatePhase (phase: ITaskPhase) {
        return this.dataService.updateData('/task-phase/', phase.id, phase);
    }

}
