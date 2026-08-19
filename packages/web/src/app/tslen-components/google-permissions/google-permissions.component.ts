import {Component, inject, input, InputSignal, OnInit} from '@angular/core';
import {ComponentsModule} from "../../components/components.module";
import {ConfigurationService} from "../../services/ConfigurationService";
import {GoogleCalendarComponent} from "../google-calendar/google-calendar.component";
import {MatButtonModule} from "@angular/material/button";
import {IGoogleCalendarData} from "../../interfaces/google-api";
import {BehaviorSubject} from "rxjs";
import {InfoAlertMessageComponent} from "../info-alert-message/info-alert-message.component";
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../language/language.service';

@Component({
    selector: 'app-google-permissions',
    imports: [
        ComponentsModule,
        GoogleCalendarComponent,
        MatButtonModule,
        InfoAlertMessageComponent,
        TranslateModule
    ],
    templateUrl: './google-permissions.component.html',
    styleUrl: './google-permissions.component.scss'
})
export class GooglePermissionsComponent implements OnInit {

  // add input  googlePermissions
    public googlePermissions = input({email: 0, calendar: 0, meetingSpace: 0});
    public googleCalendarData: InputSignal<BehaviorSubject<IGoogleCalendarData>> = input();
    public showGoogleCalendar = input(true);
    public infoAlertMessage = '';

  public googlePermissionsColumnDefs = [];

  private lastLang: string;
  private languageService = inject(LanguageService);

    constructor(private configService: ConfigurationService) {}

    ngOnInit(): void {
      this.lastLang = this.languageService.currentLang;
      this.loadTranslations();

      this.languageService.onLangChange.subscribe(event => {
        if (event.lang !== this.lastLang) {
          this.lastLang = event.lang;
          this.loadTranslations();
        }
      });
    }

    private loadTranslations(): void {
      this.languageService.get([
        'google_permissions.info_message',
        'google_permissions.column_email',
        'google_permissions.column_calendar',
        'google_permissions.column_meeting_space',
      ]).subscribe(translations => {
        this.infoAlertMessage = translations['google_permissions.info_message'];
        this.googlePermissionsColumnDefs = [
          {
            headerName: translations['google_permissions.column_email'],
            field: 'email',
            minWidth: 50,
            cellRenderer: (params) => params.value === 1 ? '&#10004;' : '&#10008;', // HTML tick or cross
          },
          {
            headerName: translations['google_permissions.column_calendar'],
            field: 'calendar',
            minWidth: 50,
            cellRenderer: (params) => params.value === 1 ? '&#10004;' : '&#10008;',
          },
          {
            headerName: translations['google_permissions.column_meeting_space'],
            field: 'meetingSpace',
            minWidth: 50,
            cellRenderer: (params) => params.value === 1 ? '&#10004;' : '&#10008;',
          },
        ];
      });
    }

    connectGoogle(){
    const apiHost = this.configService.getApiHost();
    window.location.href = apiHost + '/auth/google-auth';

  }

}
