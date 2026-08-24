import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DataService } from '../../../services/data.service';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../../../services/auth.service';
import { PendingDateRendererComponent } from '../../../components/data-grid/pending-date-renderer.component';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-user-group',
  templateUrl: './user-group.component.html',
  styleUrls: ['./user-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class UserGroupComponent implements OnInit, OnDestroy {
  private subscription: Subscription;
  public columnDefs: any;
  public rowData = [];
  public form: FormGroup;
  public components = {
    pendingDateRendererComponent: PendingDateRendererComponent,
  };
  @Output() addedGroup: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    private dataService: DataService,
    private formBuilder: FormBuilder,
    public translateService: LanguageService,
    private authService: AuthenticationService,
  ) {
    this.subscription = new Subscription();
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      createdAt: new Date(),
      companyId: this.authService.authData.companyId,
      permissions: 'manager',
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngOnInit(): void {
    const getUserGroup: Subscription = this.dataService
      .getObservableData('/groups')
      .subscribe((r) => {
        if (Array.isArray(r)) {
          this.rowData = r;
        } else {
          this.rowData = [r];
        }
      });
    this.subscription.add(getUserGroup);
    this.loadTranslations();
    this.translateService.onLangChange.subscribe(() => this.loadTranslations());
  }
  loadTranslations(): void {
    this.translateService
      .get([
        'people.user_group.data.id',
        'people.user_group.data.name',
        'people.user_group.data.created',
      ])
      .subscribe((translations) => {
        this.columnDefs = [
          {
            field: 'id',
            headerName: translations['people.user_group.data.id'],
            width: 386,
          },
          {
            field: 'name',
            headerName: translations['people.user_group.data.name'],
            width: 387,
          },
          {
            field: 'createdAt',
            headerName: translations['people.user_group.data.created'],
            cellRenderer: 'pendingDateRendererComponent',
            width: 387,
          },
        ];
      });
  }
  onSubmit() {
    const save: Subscription = this.dataService
      .postData('/groups', this.form.value)
      .subscribe((r) => {
        if (r.body) {
          this.rowData = [...this.rowData, r.body];
          this.addedGroup.emit(r.body);
          // clear form
          this.form.get('name').setValue('');
        }
      });
    this.subscription.add(save);
  }
}
