import { LanguageService } from 'src/app/language/language.service';
import { MatTableComponent } from './mat-table.component';

describe('MatTableComponent', () => {
  function createComponent(): MatTableComponent {
    return new MatTableComponent({} as LanguageService);
  }

  describe('typesFor', () => {
    it('wraps a single scalar type in an array, so single-type rows (e.g. birthday-list) render exactly one icon as before', () => {
      const component = createComponent();

      expect(component.typesFor({ type: 'birthday' })).toEqual(['birthday']);
    });

    it('passes an array of types through unchanged, so a row with two overlapping day-off types (e.g. home + hospital) renders one icon per type', () => {
      const component = createComponent();

      expect(component.typesFor({ type: ['home', 'hospital'] })).toEqual(['home', 'hospital']);
    });
  });
});
