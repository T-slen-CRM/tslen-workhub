import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { PendingAggridComponent } from './pending-aggrid.component';
import { DataService } from '../../services/data.service';
import { LanguageService } from '../../language/language.service';

describe('PendingAggridComponent', () => {
  let component: PendingAggridComponent;
  let gridApiSpy: jasmine.SpyObj<{ setGridOption: () => void; sizeColumnsToFit: () => void }>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DataService, useValue: { getObservableData: () => of([]) } },
        {
          provide: LanguageService,
          useValue: { currentLang: 'en', onLangChange: new Subject(), get: () => of({}) },
        },
      ],
    });

    component = TestBed.runInInjectionContext(() => new PendingAggridComponent(
      TestBed.inject(DataService),
      TestBed.inject(LanguageService),
    ));

    gridApiSpy = jasmine.createSpyObj('GridApi', ['setGridOption', 'sizeColumnsToFit']);
  });

  it('does not leave the grid stuck showing its loading overlay - onGridReady used to call setGridOption(\'loading\', true) with nothing anywhere to ever set it back to false', () => {
    component.onGridReady({ api: gridApiSpy, columnApi: {} });

    expect(gridApiSpy.setGridOption).not.toHaveBeenCalledWith('loading', true);
  });
});
