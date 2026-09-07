import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { GooglePermissionsComponent } from './google-permissions.component';
import { ConfigurationService } from '../../services/ConfigurationService';
import { LanguageService } from '../../language/language.service';
import { AgGridTableComponent } from '../../components/ag-grid-table/ag-grid-table.component';

describe('GooglePermissionsComponent', () => {
  let fixture: ComponentFixture<GooglePermissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GooglePermissionsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ConfigurationService, useValue: { getApiHost: () => '' } },
        {
          provide: LanguageService,
          useValue: { currentLang: 'en', onLangChange: new Subject(), get: () => of({}) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GooglePermissionsComponent);
  });

  // This 3-column checkmark table (email/calendar/meetingSpace) had no
  // flex columns and no sizeColumnsToFit on the wrapper, so it stayed at
  // the wrapper's default fixed column width regardless of container size.
  it('sizes the permissions table columns to fit the container instead of staying fixed-width', () => {
    fixture.detectChanges();

    const grid = fixture.debugElement.query(By.directive(AgGridTableComponent));

    expect(grid.componentInstance.sizeColumnsToFit()).toBeTrue();
  });
});
