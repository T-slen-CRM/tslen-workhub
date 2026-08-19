import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { DarkModeButtonComponent } from './dark-mode-button.component';
import { ThemeService } from '../../../../../services/theme.service';
import { DataService } from '../../../../../services/data.service';

describe('DarkModeButtonComponent', () => {
  let component: DarkModeButtonComponent;
  let fixture: ComponentFixture<DarkModeButtonComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['updateData']);
    dataServiceSpy.updateData.and.returnValue(of({ body: {} }) as never);
    themeServiceSpy = jasmine.createSpyObj('ThemeService', ['changeThemeColor']);

    await TestBed.configureTestingModule({
      declarations: [DarkModeButtonComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: DataService, useValue: dataServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DarkModeButtonComponent);
    component = fixture.componentInstance;
    component.userId = 7;
    component.isDarkTheme = false;
  });

  it('persists the toggled theme via the working PATCH-based updateData endpoint', () => {
    component.changeThemeColor();

    expect(dataServiceSpy.updateData).toHaveBeenCalledWith('/users/', 7, { useDarkTheme: true });
  });
});
