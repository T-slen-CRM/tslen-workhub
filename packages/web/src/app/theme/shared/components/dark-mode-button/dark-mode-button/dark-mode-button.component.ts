import {Component, Input, OnInit} from '@angular/core';
import {ThemeService} from "../../../../../services/theme.service";
import {DataService} from "../../../../../services/data.service";
import {Subscription} from "rxjs";

@Component({
    selector: 'app-dark-mode-button',
    templateUrl: './dark-mode-button.component.html',
    styleUrls: ['./dark-mode-button.component.scss'],
    standalone: false
})
export class DarkModeButtonComponent implements OnInit {
  @Input() isDarkTheme: boolean;
  @Input() userId: number;
  subscriptions: Subscription;
  loading: boolean;
  constructor(
      private themeService: ThemeService,
      private dataService: DataService
  ) {
    this.subscriptions = new Subscription();
  }
  ngOnDestroy(){
    this.subscriptions.unsubscribe();
  }

  ngOnInit(): void {
  }

  changeThemeColor(){
    this.themeService.changeThemeColor();
    this.loading = true;
    const updateUser = this.dataService.updateData('/users/', this.userId, {useDarkTheme: !this.isDarkTheme}).subscribe(response =>{
      this.loading = false;
    })
    this.subscriptions.add(updateUser);
  }
}
