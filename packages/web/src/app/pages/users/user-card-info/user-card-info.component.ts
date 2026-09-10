import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UserGeneralData } from '../../../interfaces/userConfig';
import { DataService } from '../../../services/data.service';
import { Observable } from 'rxjs';
import { AsyncPipe, DatePipe, NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';

export interface UserCardInfoDialogData {
  id: number;
}

// Read-only quick-view popup (see People's user list, which opens this as a
// dialog) - general info as plain labeled rows, never editable. The full
// editable form lives at UserProfileComponent instead.
@Component({
  selector: 'app-user-card-info',
  imports: [
    AsyncPipe,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    NgOptimizedImage,
    TranslateModule,
  ],
  templateUrl: './user-card-info.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './user-card-info.component.scss',
})
export class UserCardInfoComponent implements OnInit {
  user$: Observable<UserGeneralData>;
  defaultUserAvatar = '/assets/images/profile/default.png';

  private dataService = inject(DataService);
  public data = inject<UserCardInfoDialogData>(MAT_DIALOG_DATA);

  ngOnInit() {
    this.user$ = this.dataService.getObservableData(`/users/${this.data.id}`);
  }
}
