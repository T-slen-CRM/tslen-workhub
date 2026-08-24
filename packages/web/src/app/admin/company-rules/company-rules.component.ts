import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { UnsubscribeOnDestroyAdapter } from '../../helpers/UnsubscribeOnDestroyAdapter';
import { MatButtonModule } from '@angular/material/button';
import { DaysOffFormComponent } from '../../tslen-components/days-off-form/days-off-form.component';
import { BehaviorSubject, Observable, Subscription, tap } from 'rxjs';
import {
  IDaysOffScheduler,
  IDaysOffValue,
  IDaysOffValueForm,
} from '../../interfaces/daysOff';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-company-rules',
  imports: [
    CommonModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    DaysOffFormComponent,
    MatCheckboxModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './company-rules.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./company-rules.component.scss'],
})
export class CompanyRulesComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit
{
  private dataService = inject(DataService);
  private formBuilder = inject(FormBuilder);
  private toastService = inject(ToastrService);
  public companyDaysOff$: Observable<IDaysOffValue>;
  public defaultDaysOff$ = new BehaviorSubject<IDaysOffValue>(
    {} as IDaysOffValue,
  );
  public timeCoefficientScheduler$ = new BehaviorSubject<IDaysOffValue>(
    {} as IDaysOffValue,
  );

  public daysOffSchedulerData: IDaysOffScheduler[];
  public form: FormGroup;
  public companyRulesData: any;
  public daysOffSchedulerRules: IDaysOffValue;

  ngOnInit(): void {
    this.createForm();
    this.companyDaysOff$ = this.dataService
      .getObservableData('/company-days-off-rules')
      .pipe(
        tap((data: IDaysOffValue) => {
          this.form.patchValue(data);
          this.companyRulesData = data;
          this.daysOffSchedulerData = data.company.daysOffSchedulers;
          this.daysOffSchedulerRules = this.makeDaysOffSchedulerRules(
            this.daysOffSchedulerData,
          );
        }),
      );
  }
  saveDaysOff(): void {
    const data: IDaysOffValue = this.defaultDaysOff$.getValue();
    const companyDaysOffRules = data;

    let company: any = this.companyRulesData.company;
    companyDaysOffRules.useScheduler = this.form.value.useScheduler;
    companyDaysOffRules.resetYearly = this.form.value.resetYearly;
    company.companyDaysOffRules = [companyDaysOffRules];
    company.daysOffSchedulers = this.setDaysOffSchedulerRules(
      this.daysOffSchedulerData,
    );
    const saved: Subscription = this.dataService
      .updateData('/company/', company.id, company)
      .subscribe((r) => {
        this.toastService.success('Saved', 'Success');
      });
    this.subscription.add(saved);
  }
  createForm(): void {
    this.form = this.formBuilder.group<IDaysOffValueForm>({
      id: this.formBuilder.control(null),
      hospital: this.formBuilder.control(null),
      timeOff: this.formBuilder.control(null),
      vocation: this.formBuilder.control(null),
      transfer: this.formBuilder.control(null),
      home: this.formBuilder.control(null),
      useScheduler: this.formBuilder.control(null),
      resetYearly: this.formBuilder.control(null),
      company: this.formBuilder.group({
        id: this.formBuilder.control(null),
        country: this.formBuilder.control(null),
        name: this.formBuilder.control(null),
        daysOffSchedulers: this.formBuilder.control(null),
      }),
    });
  }
  makeDaysOffSchedulerRules(data: IDaysOffScheduler[]): IDaysOffValue {
    return data.reduce((acc: IDaysOffValue, rule: IDaysOffScheduler) => {
      acc[rule.requestType] = rule.timeCoefficient;
      return acc;
    }, {} as IDaysOffValue);
  }
  setDaysOffSchedulerRules(data: IDaysOffScheduler[]): IDaysOffScheduler[] {
    const timeCoefficientScheduler: IDaysOffValue =
      this.timeCoefficientScheduler$.getValue();
    return data.map((rule: IDaysOffScheduler) => {
      rule.timeCoefficient = timeCoefficientScheduler[rule.requestType];
      delete rule.companyId;
      return rule;
    });
  }
}
