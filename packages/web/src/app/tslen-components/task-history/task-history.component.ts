import {
  Component,
  OnInit,
  input,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DataService } from '../../services/data.service';
import { ITaskHistoryEntry } from '../../interfaces/tasks';

const FIELD_LABELS: Record<string, string> = {
  phaseId: 'Phase',
  projectId: 'Project',
  assignee: 'Assignee',
  userId: 'Assignee',
};

@Component({
  selector: 'app-task-history',
  imports: [CommonModule, DatePipe, TranslateModule],
  templateUrl: './task-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./task-history.component.scss'],
})
export class TaskHistoryComponent implements OnInit {
  taskId = input.required<number>();
  entries: ITaskHistoryEntry[] = [];

  private dataService = inject(DataService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.dataService
      .getObservableData(`/tasks/${this.taskId()}/history`)
      .subscribe((entries: ITaskHistoryEntry[]) => {
        this.entries = entries;
        this.cdr.markForCheck();
      });
  }

  formatField(field: string): string {
    if (FIELD_LABELS[field]) {
      return FIELD_LABELS[field];
    }
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  formatValue(raw: unknown, label: string | null): string {
    if (label) {
      return label;
    }
    if (raw === null || raw === undefined) {
      return '—';
    }
    return String(raw);
  }
}
