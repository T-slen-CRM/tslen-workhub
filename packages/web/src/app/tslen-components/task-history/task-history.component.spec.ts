import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { TaskHistoryComponent } from './task-history.component';
import { DataService } from '../../services/data.service';
import { ITaskHistoryEntry } from '../../interfaces/tasks';

describe('TaskHistoryComponent', () => {
  let component: TaskHistoryComponent;
  let fixture: ComponentFixture<TaskHistoryComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  const entryWithLabels: ITaskHistoryEntry = {
    id: '1:phaseId',
    createdAt: '2026-08-17T10:00:00.000Z',
    action: 'update',
    field: 'phaseId',
    from: 1,
    fromLabel: 'To Do',
    to: 2,
    toLabel: 'In Progress',
    user: { id: 9, firstName: 'Jane', lastName: 'Doe' },
  };

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData']);
    dataServiceSpy.getObservableData.and.returnValue(of([entryWithLabels]));

    await TestBed.configureTestingModule({
      imports: [TaskHistoryComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataService, useValue: dataServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskHistoryComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('taskId', 5);
  });

  it('loads history entries for the task on init', () => {
    fixture.detectChanges();

    expect(dataServiceSpy.getObservableData).toHaveBeenCalledWith('/tasks/5/history');
    expect(component.entries).toEqual([entryWithLabels]);
  });

  it('exposes displayEntries grouped via groupHistoryEntries, not the raw per-field entries', () => {
    fixture.detectChanges();

    expect(component.displayEntries).toEqual([{
      id: '1:phaseId', createdAt: entryWithLabels.createdAt, user: entryWithLabels.user, kind: 'changed',
      field: 'phaseId', from: 1, fromLabel: 'To Do', to: 2, toLabel: 'In Progress',
    }]);
  });

  describe('isUserField', () => {
    it('is true for the assignee/userId fields', () => {
      expect(component.isUserField('assignee')).toBe(true);
      expect(component.isUserField('userId')).toBe(true);
    });

    it('is false for any other field', () => {
      expect(component.isUserField('status')).toBe(false);
      expect(component.isUserField(undefined)).toBe(false);
    });
  });

  describe('initialsForUser / colorForUser', () => {
    it('derives initials/color from the user object when present', () => {
      expect(component.initialsForUser({ id: 9, firstName: 'Jane', lastName: 'Doe' })).toBe('JD');
    });

    it('falls back to a label string when there is no user object', () => {
      expect(component.initialsForUser(null, 'To Do')).toBe('TD');
    });
  });

  describe('getRelativeTimeLabel', () => {
    it('asks the translate service for the right relative-time key/count for a recent timestamp', () => {
      const translateService = TestBed.inject(TranslateService);
      const instantSpy = spyOn(translateService, 'instant').and.callThrough();
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      component.getRelativeTimeLabel(twoMinutesAgo);

      expect(instantSpy).toHaveBeenCalledWith('task_history.minutes_ago', { count: 2 });
    });

    it('formats an old timestamp as an absolute date', () => {
      const label = component.getRelativeTimeLabel('2026-01-01T18:23:00.000Z');

      expect(label).toContain('2026');
    });
  });

  describe('formatField', () => {
    it('maps a known field to a friendly label', () => {
      expect(component.formatField('phaseId')).toBe('Phase');
      expect(component.formatField('assignee')).toBe('Assignee');
    });

    it('title-cases an unknown camelCase field as a fallback', () => {
      expect(component.formatField('estimate')).toBe('Estimate');
      expect(component.formatField('assignessEmail')).toBe('Assigness Email');
    });
  });

  describe('formatValue', () => {
    it('prefers the resolved label when present', () => {
      expect(component.formatValue(1, 'To Do')).toBe('To Do');
    });

    it('falls back to the raw value when there is no label', () => {
      expect(component.formatValue('New title', null)).toBe('New title');
    });

    it('renders a null/undefined raw value as an em dash', () => {
      expect(component.formatValue(null, null)).toBe('—');
      expect(component.formatValue(undefined, null)).toBe('—');
    });
  });
});
