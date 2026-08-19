import { Component, OnInit } from '@angular/core';
import {AuthData, AuthenticationService} from '../../../services/auth.service';
import {CalendarEvent} from 'angular-calendar';
import {
  CreateOneEventDialogComponent
} from '../../../tslen-components/create-one-event-dialog/create-one-event-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {Observable, Subscription} from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import {UnsubscribeOnDestroyAdapter} from '../../../helpers/UnsubscribeOnDestroyAdapter';
import {DataService} from '../../../services/data.service';
import {UserGeneralData} from '../../../interfaces/userConfig';
import { LanguageService } from 'src/app/language/language.service';
@Component({
    selector: 'app-main-wall',
    templateUrl: './main-wall.component.html',
    styleUrls: ['./main-wall.component.scss'],
    standalone: false
})
export class MainWallComponent extends UnsubscribeOnDestroyAdapter implements OnInit {
  public authData: AuthData;
  public userData$: Observable<UserGeneralData>;
  public userId: number;
  public generalUserData: UserGeneralData;
  constructor(private authService: AuthenticationService,
              public dialog: MatDialog,
              private dataService: DataService,
              public translate: LanguageService
            ) {
    super();
    this.authData = this.authService.authDataSignal();
    this.userId = this.authData.id;
    this.userData$ = this.dataService.getObservableData('/users/' + this.userId);
  }

  ngOnInit(): void {
    const userData: Subscription = this.userData$
        .subscribe((data: UserGeneralData) => {
      this.generalUserData = data;
    });
    this.subscription.add(userData);
  }

  openCreateOneEventDialog(isRequest: number = 0, date = new Date(), events: CalendarEvent | CalendarEvent[] = []): void {
    const dialogRef = this.dialog.open(CreateOneEventDialogComponent, {
      width: '450px',
      data: {events, date, daysOffList: this.generalUserData.daysOff, isRequest }

    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.result){
        if (result.action === 'save'){
          this.saveEvents(result.result);
        }
      }
    });
  }
  saveEvents(event: CalendarEvent){
    const eventColors = this.convertEventColor(event.color);
    Object.assign(event, eventColors);
    const save: Subscription = this.dataService.postData('/events-by-user', event)
        .subscribe((response: HttpResponse<any>) => {
        });
    this.subscription.add(save);
  }
  convertEventColor(color: any){
    return {
      primaryColor: color.primary || '',
      secondaryColor: color.secondary || ''
    }
  }
}
