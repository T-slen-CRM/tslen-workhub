import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../../services/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Observable, Subscription } from 'rxjs';
import { UnsubscribeOnDestroyAdapter } from '../../../helpers/UnsubscribeOnDestroyAdapter';
import { ConfigurationService } from '../../../services/ConfigurationService';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-auth-signin',
  templateUrl: './auth-signin.component.html',
  styleUrls: ['./auth-signin.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AuthSigninComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit
{
  pageTraslate: Record<string, string> = {};
  hide = true;
  loginForm: FormGroup;
  loading: boolean;
  email: string;
  password: string;
  message: string;
  hidePassword = true;
  public hideGoogleLogin$: Observable<boolean>;

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private fb: FormBuilder,
    private configService: ConfigurationService,
    private translateService: LanguageService,
  ) {
    super();
    this.loginForm = this.fb.group({
      email: ['', Validators.required /*, Validators.email*/],
      password: ['', Validators.required],
      rememberMe: [],
      isSocial: [false],
      googleToken: [''],
    });
  }

  ngOnInit() {
    const def = this.translateService.setDefaultLangFromBrowser();
    this.translateService.changeLangBrowser(def);
    this.translateService
      .get([
        'auth_signin.sign_google',
        'auth_signin.email.name',
        'auth_signin.email.require_email',
        'auth_signin.password.name',
        'auth_signin.password.require_password',
        'auth_signin.or',
        'auth_signin.text',
        'auth_signin.sign_button',
        'auth_signin.create_button',
      ])
      .subscribe((transition: Record<string, string>) => {
        this.pageTraslate = transition;
      });
    // if route has query params token
    const token = this.router.url.split('?token=')[1];
    if (token) {
      localStorage.setItem('jwtToken', token);
      localStorage.setItem('isLoggedIn', 'true');
      this.router.navigate(['/pages/main-wall']);
    }


    this.hideGoogleLogin$ =
      this.authenticationService.isGoogleLogged$.asObservable();
  }

  get f() {
    return this.loginForm.controls;
  }
  async googleLogin() {
    const apiHost = this.configService.getApiHost();
    window.location.href = apiHost + '/auth/google-auth';
  }

  async login(isGoogle = false, isFacebook = false) {
    if (!isGoogle && !isFacebook && this.loginForm.invalid) {
      return;
    } else {
      const login: Subscription = this.authenticationService
        .login(this.loginForm.value)
        .subscribe({
          next: (response: { body: any; status: number }) => {
            const data: any = response.body;
            if (response.status === 200 && data.accessToken) {
              localStorage.setItem('jwtToken', data.accessToken);
              localStorage.setItem('isLoggedIn', 'true');
              this.router.navigate(['/pages/main-wall']);
            }
          },
          error: (_err) => {
            this.loading = false;
            this.message = 'Please check your username and password';
          },
        });
      this.subscription.add(login);
    }
  }
  setEmailToForm(user) {
    this.loginForm.get('email').patchValue(user.email);
    this.loginForm.get('isSocial').patchValue(true);
    this.loginForm.get('googleToken').setValue(user.idToken);
  }
}
