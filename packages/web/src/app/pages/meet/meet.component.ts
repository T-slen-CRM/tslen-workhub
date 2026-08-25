import { Component, ChangeDetectionStrategy } from '@angular/core';

import { AsyncPipe, NgClass } from '@angular/common';
import { DataService } from '../../services/data.service';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';
import { CopyTextDirective } from '../../tslen-components/directives/copy-text.directive';
import { MatIconModule } from '@angular/material/icon';
import { TimerComponent } from '../../feature/timer-pomodoro/timer/timer.component';
import { GooglePermissionsComponent } from '../../tslen-components/google-permissions/google-permissions.component';
import {
  AuthData,
  AuthenticationService,
  IUserGooglePermissions,
} from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-meet',
  imports: [
    NgClass,
    MatButtonModule,
    AsyncPipe,
    CopyTextDirective,
    MatIconModule,
    TimerComponent,
    GooglePermissionsComponent,
    TranslateModule,
  ],
  templateUrl: './meet.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './meet.component.scss',
})
export class MeetComponent {
  public meeting$: Observable<{ uri: string }>;
  public authData: AuthData;
  public googlePermissions: IUserGooglePermissions;
  constructor(
    private dataService: DataService,
    private authService: AuthenticationService,
    public translateService: LanguageService,
  ) {
    this.authData = this.authService.authDataSignal();
    this.googlePermissions = this.authData.googlePermissions;
  }
  createMeeting() {
    this.meeting$ = this.dataService.getObservableData(
      '/google-calendar/create-google-meeting',
    );
  }
}
