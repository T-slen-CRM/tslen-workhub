import { Component, OnInit } from '@angular/core';
import {Observable} from "rxjs";
import {IDaysOffObject} from "../../../interfaces/dashboard";
import {AuthData, AuthenticationService} from "../../../services/auth.service";
import {DataService} from "../../../services/data.service";
import {ThemeService} from "../../../services/theme.service";

@Component({
    selector: 'app-personal-schedule',
    templateUrl: './personal-schedule.component.html',
    styleUrls: ['./personal-schedule.component.scss'],
    standalone: false
})
export class PersonalScheduleComponent implements OnInit {

  public userId: number; // for test
  public isDarkTheme: boolean;
  public userData$: Observable<any>;
  public usersList$: Observable<any>;
  public daysOffItems: IDaysOffObject;
  public daysOffKeys: string[];
  private authData: AuthData;

  constructor(private authService: AuthenticationService,
              private dataService: DataService,
              private themeService: ThemeService) {
    this.authData = this.authService.authDataSignal();
    this.userId = this.authData.id;
    this.daysOffItems = {
      hospital: {name: 'Hospital', value: 0, color: '#06acc1', icon: 'fa-solid fa-sack-dollar'},
      timeOff: {name: 'Time off', value: 0, color: '#06acc1', icon: 'fa-solid fa-hand-holding-dollar'},
      vocation: {name: 'Vocation', value: 0, color: '#06acc1', icon: 'fa fa-coins'},
    };
    this.daysOffKeys = Object.keys(this.daysOffItems);
  }

  ngOnInit() {
    this.userData$ = this.dataService.getObservableData('/users/' + this.userId);
    this.usersList$ = this.dataService.getObservableData('/users');
    this.themeService.isDarkTheme.subscribe(value => {
      this.isDarkTheme = value;
    });
  }
}
