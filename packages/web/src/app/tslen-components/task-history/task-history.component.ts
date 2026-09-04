import {
  Component,
  OnInit,
  input,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataService } from '../../services/data.service';
import { ITaskHistoryEntry } from '../../interfaces/tasks';
import {
  getInitials,
  getAvatarColor,
  getRelativeTime,
  groupHistoryEntries,
  HistoryDisplayEntry,
} from './task-history.util';

const FIELD_LABELS: Record<string, string> = {
  phaseId: 'Phase',
  projectId: 'Project',
  assignee: 'Assignee',
  userId: 'Assignee',
};

type HistoryUser = { id: number; firstName: string; lastName: string } | null;

@Component({
  selector: 'app-task-history',
  imports: [CommonModule, DatePipe, TranslateModule],
  providers: [DatePipe],
  templateUrl: './task-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./task-history.component.scss'],
})
export class TaskHistoryComponent implements OnInit {
  taskId = input.required<number>();
  entries: ITaskHistoryEntry[] = [];
  displayEntries: HistoryDisplayEntry[] = [];

  private dataService = inject(DataService);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);
  private datePipe = inject(DatePipe);

  ngOnInit(): void {
    this.dataService
      .getObservableData(`/tasks/${this.taskId()}/history`)
      .subscribe((entries: ITaskHistoryEntry[]) => {
        this.entries = entries;
        this.displayEntries = groupHistoryEntries(entries);
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

  isUserField(field: string | undefined): boolean {
    return field === 'assignee' || field === 'userId';
  }

  initialsForUser(user: HistoryUser, fallbackLabel: string | null = null): string {
    return getInitials(user, fallbackLabel);
  }

  colorForUser(user: HistoryUser, fallbackLabel: string | null = null): string {
    const seed = user ? String(user.id) : (fallbackLabel ?? 'system');
    return getAvatarColor(seed);
  }

  getRelativeTimeLabel(iso: string): string {
    const relative = getRelativeTime(iso);
    switch (relative.kind) {
      case 'just_now':
        return this.translateService.instant('task_history.just_now');
      case 'minutes':
        return this.translateService.instant(
          relative.count === 1 ? 'task_history.minute_ago' : 'task_history.minutes_ago',
          { count: relative.count },
        );
      case 'hours':
        return this.translateService.instant(
          relative.count === 1 ? 'task_history.hour_ago' : 'task_history.hours_ago',
          { count: relative.count },
        );
      case 'days':
        return this.translateService.instant(
          relative.count === 1 ? 'task_history.day_ago' : 'task_history.days_ago',
          { count: relative.count },
        );
      case 'absolute':
        return this.datePipe.transform(iso, "MMMM d, y 'at' h:mm a") ?? '';
    }
  }
}
