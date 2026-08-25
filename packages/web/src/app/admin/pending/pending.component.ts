import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DataService } from '../../services/data.service';
import { ToastrService } from 'ngx-toastr';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-pending',
  templateUrl: './pending.component.html',
  styleUrls: ['./pending.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PendingComponent implements OnInit {
  preparedUsersData: any;
  selectedUser: any;
  selectedUserId: any;
  headerRoutes = [{ value: 'Pending', url: '', type: 'last', params: {} }];
  mainHeaderPage = 'Pending';
  constructor(
    private dataService: DataService,
    private toastr: ToastrService,
    public translateService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.loadTranslations();
    this.translateService.onLangChange.subscribe(() => this.loadTranslations());
  }

  loadTranslations(): void {
    this.translateService
      .get(['people.pending.name', 'people.pending.update_pending'])
      .subscribe((translatedValue: string) => {
        this.mainHeaderPage = translatedValue['people.pending.name'];
        this.headerRoutes[0].value =
          translatedValue['people.pending.update_pending'];
      });
  }
  prepareSelectedUser(data: any) {
    return data.filter((item: any) => {
      return item.currentUser;
    });
  }
  getSelectedValues(event) {
    this.selectedUserId = event.data[0]?.value;
  }
  changeUser() {
    this.dataService
      .changeUser({ data: { userId: this.selectedUserId } })
      .subscribe((response) => {
        if (response.status === 200) {
          this.toastr.success('Current user has been changed', 'Changed');
          window.location.reload();
        } else {
          this.toastr.warning('Something went wrong', 'Alert');
        }
      });
  }
}
