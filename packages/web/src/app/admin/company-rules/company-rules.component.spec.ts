import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CompanyRulesComponent } from './company-rules.component';
import { DataService } from '../../services/data.service';
import { IDaysOffValue } from '../../interfaces/daysOff';

describe('CompanyRulesComponent', () => {
  let component: CompanyRulesComponent;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  const companyDaysOffRules: IDaysOffValue = {
    id: 5,
    hospital: '11',
    timeOff: '11',
    vocation: '11',
    transfer: '11',
    home: '11',
    useScheduler: 0,
    resetYearly: 0,
    company: { id: 1, country: 'US', name: 'Acme', daysOffSchedulers: [] },
  };

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData', 'updateData']);
    dataServiceSpy.getObservableData.and.returnValue(of(companyDaysOffRules) as never);
    dataServiceSpy.updateData.and.returnValue(of({ status: 200 }) as never);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success']) },
      ],
    }).compileComponents();

    // Constructed via injection context rather than TestBed.createComponent so this
    // test doesn't need to render the template - CompanyRulesComponent statically
    // imports DaysOffFormComponent, which pulls in its own DI chain (Configuration/
    // Authentication/LanguageService) that isn't relevant to saveDaysOff()'s logic.
    component = TestBed.runInInjectionContext(() => new CompanyRulesComponent());
    component.ngOnInit();
    component.companyDaysOff$.subscribe();
  });

  // mat-checkbox's formControlName yields a real boolean at runtime, even though
  // IDaysOffValueForm types useScheduler/resetYearly as FormControl<number | null>
  // (matching the backend's smallint columns, which reject the string "true").
  it('sends useScheduler/resetYearly as 0/1, not as booleans from the checkboxes', () => {
    component.defaultDaysOff$.next(companyDaysOffRules);
    component.form.patchValue({ useScheduler: true, resetYearly: false });

    component.saveDaysOff();

    const [, , sentCompany] = dataServiceSpy.updateData.calls.mostRecent().args;
    expect(sentCompany.companyDaysOffRules[0].useScheduler).toBe(1);
    expect(sentCompany.companyDaysOffRules[0].resetYearly).toBe(0);
  });
});
