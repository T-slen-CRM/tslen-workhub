import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
// import {NgbDropdownConfig} from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '../../../../../services/auth.service';
import { Router } from '@angular/router';
import { UserService } from '../../../../../services/user.service';
import { DataService } from '../../../../../services/data.service';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-nav-right',
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class NavRightComponent implements OnInit {
  userName: string;
  isLoggedIn: boolean;
  @Input() userId: number;
  @Input() userAvatar: string;
  @Input() firstName: string;
  @Input() lastName: string;
  public selectedLanguage = 'en';
  constructor(
    private authenticationService: AuthenticationService,
    private router: Router,
    private userService: UserService,
    private dataService: DataService,
    public translateService: LanguageService,
  ) {}

  ngOnInit() {
    const user = this.authenticationService.authDataSignal();

    this.dataService.getOneUser(user.id).subscribe({
      next: (userData) => {
        const body = userData.body as { language?: string };
        const langFromDb = body.language || 'en';
        this.translateService.changeLang(langFromDb);
        this.selectedLanguage = langFromDb;
      },
      error: () => {
        this.translateService.changeLang('en');
        this.selectedLanguage = 'en';
      },
    });
    //TODO: upgrade user data to one subscription
    this.userService.userFirstName.subscribe((value) => {
      if (value) {
        this.firstName = value;
      }
    });
    this.userService.userLastName.subscribe((value) => {
      if (value) {
        this.lastName = value;
      }
    });
    this.userService.userId.subscribe((value) => {
      if (value) {
        this.userId = value;
      }
    });
  }

  logout() {
    this.authenticationService.logout();
    this.router.navigate(['/auth/login']);
    //     .subscribe({
    //     next: () => {
    //         this.router.navigate(['/pages/auth/signin']);
    //     },
    //     error: () => {
    //         this.router.navigate(['/pages/auth/signin']);
    //     }
    // });
  }
  changeLanguage(lang: string) {
    this.translateService.changeLang(lang);
  }
}
