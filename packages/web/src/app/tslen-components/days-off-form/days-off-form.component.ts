import {
  Component,
  inject,
  Input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { LibsService } from '../../services/libs.service';
import { IDaysOffSettings, IDaysOffValue } from '../../interfaces/daysOff';
import { Subject, Subscription } from 'rxjs';
import { UnsubscribeOnDestroyAdapter } from '../../helpers/UnsubscribeOnDestroyAdapter';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-days-off-form',
  imports: [
    CommonModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './days-off-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./days-off-form.component.scss'],
})
export class DaysOffFormComponent extends UnsubscribeOnDestroyAdapter implements OnInit {
  public form: FormGroup;
  private data: IDaysOffValue;
  public rulesTypes: IDaysOffSettings[] = inject(LibsService).requestTypeList;
  private formBuilder = inject(FormBuilder);
  @Input() public savedForm: Subject<IDaysOffValue>;
  @Input() public set dataForForm(data: IDaysOffValue) {
    this.createForm();
    if (data) {
      this.data = data;
      this.form.patchValue(this.data);
      // save changes
      const changes: Subscription = this.form.valueChanges.subscribe(
        (value: IDaysOffValue) => {
          if (value && this.savedForm) {
            this.savedForm.next(value);
          }
        },
      );
      this.form.addControl('id', this.formBuilder.control(this.data.id));
      this.subscription.add(changes);
    }
  }
  constructor(public translateService: LanguageService) {
    super();
  }
  ngOnInit() {
    this.loadTranslations();
    this.translateService.onLangChange.subscribe(() => this.loadTranslations());
  }
  loadTranslations(): void {
    this.translateService
      .get([
        'requestTypeStaticList.hospital',
        'requestTypeStaticList.vocation',
        'requestTypeStaticList.time_off',
        'requestTypeStaticList.transfer',
        'requestTypeStaticList.home',
      ])
      .subscribe((transation) => {
        const lengthTranslation = Object.keys(transation);
        for (let i = 0; i < lengthTranslation.length; i++) {
          this.rulesTypes[i].title = transation[lengthTranslation[i]];
        }
      });
  }
  createForm(): void {
    const controls: IDaysOffValue = this.rulesTypes.reduce(
      (acc: IDaysOffValue, rule: IDaysOffSettings) => {
        acc[rule.value] = this.formBuilder.control(null);
        return acc;
      },
      {} as IDaysOffValue,
    );
    this.form = this.formBuilder.group(controls);
  }
}
