import {
  Component,
  inject,
  input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { UserGeneralData } from '../../../interfaces/userConfig';
import { DataService } from '../../../services/data.service';
import { Observable } from 'rxjs';
import { AsyncPipe, DatePipe, NgOptimizedImage } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';

// Read-only quick-view card (see People's user list, which links here) -
// general info as plain labeled rows, never editable. The full editable
// form lives at UserProfileComponent instead.
@Component({
  selector: 'app-user-card-info',
  imports: [
    AsyncPipe,
    DatePipe,
    MatCardModule,
    MatDividerModule,
    NgOptimizedImage,
    TranslateModule,
  ],
  templateUrl: './user-card-info.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './user-card-info.component.scss',
})
export class UserCardInfoComponent implements OnInit {
  id = input.required({ transform: (v) => (v ? +v : 0) });
  user$: Observable<UserGeneralData>;
  defaultUserAvatar = '/assets/images/profile/default.png';

  private dataService = inject(DataService);

  ngOnInit() {
    this.user$ = this.dataService.getObservableData(`/users/${this.id()}`);
  }
}
