import {
  Component,
  EventEmitter,
  inject,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ComponentsModule } from '../../../components/components.module';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColDef } from 'ag-grid-community';
import { IJobPosition } from './job-positionin-interface';
import { DataService } from '../../../services/data.service';
import { Observable, of, Subject, Subscription, takeUntil, tap } from 'rxjs';
import { UnsubscribeOnDestroyAdapter } from '../../../helpers/UnsubscribeOnDestroyAdapter';
import { HttpResponse } from '@angular/common/http';
import { LanguageService } from 'src/app/language/language.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-user-job-position',
  imports: [
    ComponentsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    AsyncPipe,
    TranslateModule,
  ],
  templateUrl: './user-job-position.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './user-job-position.component.scss',
})
export class UserJobPositionComponent extends UnsubscribeOnDestroyAdapter {
  constructor(public translateService: LanguageService) {
    super();
  }
  private dataService = inject(DataService);
  public titleControl: FormControl = new FormControl('', Validators.required);
  public currentRows: IJobPosition[] = [];
  public columnDefs: ColDef[] = [];
  private destroy$ = new Subject<void>();
  public rowData$: Observable<IJobPosition[]> = this.dataService
    .getObservableData('/job-position')
    .pipe(
      tap((r: IJobPosition[]) => {
        this.currentRows = r;
      }),
    );
  @Output() addedJobPosition: EventEmitter<any> = new EventEmitter<any>();

  onSubmit() {
    const save: Subscription = this.dataService
      .postData('/job-position', { title: this.titleControl.value })
      .subscribe((r: HttpResponse<Object>) => {
        const body = r.body as IJobPosition;
        this.rowData$ = of([...this.currentRows, body]);
        this.addedJobPosition.emit(body);
        // clear title
        this.titleControl.setValue('');
      });
    this.subscription.add(save);
    this.columnDefs;
  }
  ngOnInit(): void {
    this.loadTranslations();
    this.translateService.onLangChange.subscribe(() => this.loadTranslations());
  }
  loadTranslations(): void {
    this.translateService
      .get(['people.job_position.data.id', 'people.job_position.data.title'])
      .subscribe((translations) => {
        this.columnDefs = [
          {
            field: 'id',
            headerName: translations['people.job_position.data.id'],
            width: 657,
          },
          {
            field: 'title',
            headerName: translations['people.job_position.data.title'],
            width: 657,
          },
        ];
      });
  }
}
