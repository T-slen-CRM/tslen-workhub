import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../../services/data.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-auth-signup',
  templateUrl: './auth-signup.component.html',
  styleUrls: ['./auth-signup.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AuthSignupComponent implements OnInit, OnDestroy {
  pageTraslate: { [key: string]: string } = {};
  lastLang: string;
  companyForm: FormGroup;
  userForm: FormGroup;
  registered = false;
  loading = false;
  message: string;
  hidePassword = true;
  companyId: number;
  private subscription: Subscription;

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private toastrService: ToastrService,
    private router: Router,
    private translateService: LanguageService,
  ) {
    this.subscription = new Subscription();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ngOnInit() {
    const def = this.translateService.setDefaultLangFromBrowser();
    this.translateService.changeLangBrowser(def);
    this.translateService
      .get([
        'auth_signup.companyUserTitle',
        'auth_signup.createCompanyUserTitle',
        'auth_signup.form.company.nameLabel',
        'auth_signup.form.company.countryLabel',
        'auth_signup.form.company.nameRequired',
        'auth_signup.form.company.countryRequired',
        'auth_signup.form.company.submitButton',
        'auth_signup.form.user.firstNameLabel',
        'auth_signup.form.user.firstNameRequired',
        'auth_signup.form.user.lastNameLabel',
        'auth_signup.form.user.lastNameRequired',
        'auth_signup.form.user.emailLabel',
        'auth_signup.form.user.emailRequired',
        'auth_signup.form.user.passwordLabel',
        'auth_signup.form.user.passwordRequired',
        'auth_signup.form.user.passwordMinLength',
        'auth_signup.form.user.confirmPasswordLabel',
        'auth_signup.form.user.confirmPasswordRequired',
        'auth_signup.form.user.passwordsDoNotMatch',
        'auth_signup.form.user.submitButton',
        'auth_signup.links.alreadyHaveCompany',
        'auth_signup.links.sign',
        'auth_signup.links.support',
      ])
      .subscribe((transition: { [key: string]: string }) => {
        this.pageTraslate = transition;
      });
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      country: ['', Validators.required],
      companyDaysOffRules: [
        [
          {
            id: null,
            timeOff: 10,
            hospital: 10,
            vocation: 10,
            transfer: 10,
            home: 10,
            useScheduler: 0,
            resetYearly: 0,
          },
        ],
      ],
      daysOffSchedulers: [
        [
          { requestType: 'timeOff', timeCoefficient: 0, repeatBy: 'month' },
          { requestType: 'vocation', timeCoefficient: 0, repeatBy: 'month' },
          { requestType: 'transfer', timeCoefficient: 0, repeatBy: 'month' },
          { requestType: 'home', timeCoefficient: 0, repeatBy: 'month' },
          { requestType: 'hospital', timeCoefficient: 0, repeatBy: 'month' },
        ],
      ],
    });
    this.userForm = this.fb.group(
      {
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
        company: '',
        role: 'manager',
        isActive: 1,
        companyId: null,
        language: this.translateService.setDefaultLangFromBrowser(),
      },
      { validators: [this.requireConfirmPassword] },
    );
  }
  async onSubmit() {
    this.message = null;
    this.loading = true;
    const createCompany: Subscription = this.dataService
      .postData('/company', this.companyForm.value)
      .subscribe({
        next: (response: { body: any; status: number }) => {
          this.loading = false;
          if (response.body['error']) {
            this.message = response.body['error'];
          }
          if (response.status === 201) {
            this.companyId = response.body['id'];
            this.userForm.get('companyId').setValue(this.companyId);
            this.toastrService.success('Company created successfully');
          }
        },
        error: (err) => {
          this.loading = false;
          this.message = err.error.error;
          this.toastrService.error('Company not created');
        },
      });
    this.subscription.add(createCompany);
  }
  loadColumnDefs(): void {}
  sendUserForm() {
    this.loading = true;
    const saveUser: Subscription = this.dataService
      .postData('/users/signup', { ...this.userForm.value })
      .subscribe({
        next: (response: { body: any; status: number }) => {
          this.loading = false;
          if (response.body['error']) {
            this.message = response.body['error'];
          }
          this.toastrService.success('User created successfully');
          this.router.navigate(['/auth/signin']);
        },
        error: (err) => {
          this.loading = false;
          this.message = err.error.error;
          this.toastrService.error('User not created');
        },
      });
    this.subscription.add(saveUser);
  }
  get f() {
    return this.companyForm.controls;
  }

  requireConfirmPassword(form: FormGroup) {
    if (form.get('password').value !== form.get('confirmPassword').value) {
      return { requireConfirmPassword: true };
    }
    return null;
  }
}
