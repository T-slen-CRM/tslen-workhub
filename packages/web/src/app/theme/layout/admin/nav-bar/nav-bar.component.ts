import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NextConfig } from '../../../../app-config';
import { DataService } from '../../../../services/data.service';
import { ThemeService } from '../../../../services/theme.service';
import { Subscription } from 'rxjs';
import { AuthenticationService } from '../../../../services/auth.service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class NavBarComponent implements OnInit {
  public nextConfig: any;
  public menuClass: boolean;
  public collapseStyle: string;
  public windowWidth: number;
  userId: any;
  userAvatar: string;
  firstName: string;
  lastName: string;
  userRole: string;
  isDarkTheme: boolean;
  darkThemeImage: string;
  whiteThemeImage: string;
  subscriptions: Subscription;

  @Output() onNavCollapse = new EventEmitter();
  @Output() onNavHeaderMobCollapse = new EventEmitter();

  constructor(
    private dataService: DataService,
    private themeService: ThemeService,
    private authService: AuthenticationService,
  ) {
    this.nextConfig = NextConfig.config;
    this.menuClass = false;
    this.collapseStyle = 'none';
    this.windowWidth = window.innerWidth;
    this.subscriptions = new Subscription();
  }
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  ngOnInit() {
    const authData = this.authService.authDataSignal();
    this.userRole = authData['role'];
    this.userId = authData['id'];
    this.userAvatar =
      authData['avatar'] || '' /*|| '/assets/images/profile/default.png'*/;
    this.firstName = authData['firstName'];
    this.lastName = authData['lastName'];
  }

  toggleMobOption() {
    this.menuClass = !this.menuClass;
    this.collapseStyle = this.menuClass ? 'block' : 'none';
  }

  navCollapse() {
    if (this.windowWidth >= 992) {
      this.onNavCollapse.emit();
    } else {
      this.onNavHeaderMobCollapse.emit();
    }
  }
}
