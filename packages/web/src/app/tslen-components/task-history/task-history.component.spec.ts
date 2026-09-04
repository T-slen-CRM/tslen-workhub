import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

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
