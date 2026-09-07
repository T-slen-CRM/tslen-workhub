import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { UserDayoffHistoryComponent } from './user-dayoff-history.component';
import { LanguageService } from '../../../language/language.service';
import { AgGridTableComponent } from '../../../components/ag-grid-table/ag-grid-table.component';

describe('UserDayoffHistoryComponent', () => {
  let fixture: ComponentFixture<UserDayoffHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDayoffHistoryComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: LanguageService,
          useValue: { currentLang: 'en', onLangChange: new Subject(), get: () => of({}) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDayoffHistoryComponent);
    fixture.componentRef.setInput('eventsByUserRequest', []);
  });

  // Every column here was fixed-width (5 x 282px), with no flex and no
  // sizeColumnsToFit on the wrapper - the grid never grew past ~1410px
  // regardless of the container, leaving a large empty gap on wide screens.
  it('sizes columns to fit the container width instead of staying fixed-width', () => {
    fixture.detectChanges();

    const grid = fixture.debugElement.query(By.directive(AgGridTableComponent));

    expect(grid.componentInstance.sizeColumnsToFit()).toBeTrue();
  });
});
