import { Component, OnInit } from '@angular/core';
import {AuthenticationService} from "../../../services/auth.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";

@Component({
    selector: 'app-auth-reset-password',
    templateUrl: './auth-reset-password.component.html',
    styleUrls: ['./auth-reset-password.component.scss'],
    standalone: false
})
export class AuthResetPasswordComponent implements OnInit {
  form: FormGroup;
  message: string;
  submitted = false;
  successSubmit = false;
  loading = false;
  constructor(
      private authService: AuthenticationService,
      private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.form = this.fb.group({
      email: ['', Validators.required]
    })
  }
  onSubmit(){
    this.loading = true;
    this.authService.forgotPassword({data: this.form.value}).subscribe(response => {
      this.loading = false;
      if (response.body['error']) {
        this.message = response.body['error'];
      } else {
        this.successSubmit = true;
      }
    })
  }

}
