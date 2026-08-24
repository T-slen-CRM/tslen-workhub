import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../services/data.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-registration-confirm',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ResetPasswordComponent implements OnInit {
  hash = '';
  loading = false;
  message = null;
  resetForm: FormGroup;
  submitted = false;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private formBuilder: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.hash = this.route.snapshot.paramMap.get('hash');
    this.resetForm = this.formBuilder.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
        hash: [this.hash, Validators.required],
      },
      {
        validators: [this.requireConfirmPassword],
      },
    );
  }

  requireConfirmPassword(form: FormGroup) {
    if (form.get('password').value !== form.get('confirmPassword').value) {
      return { requireConfirmPassword: true };
    }
    return null;
  }
  get f() {
    return this.resetForm.controls;
  }

  onResetSubmit() {
    this.submitted = true;
    this.message = null;
    if (this.resetForm.invalid) {
      this.message = 'Passwords is not match!';
      return;
    } else {
      this.loading = true;
      this.dataService
        .resetPassword(this.resetForm.value)
        .subscribe((response) => {
          this.loading = false;
          if (response.body['error']) {
            this.message = response.body['error'];
          } else {
            this.router.navigate(['/auth/login']).catch();
          }
        });
    }
  }
}
