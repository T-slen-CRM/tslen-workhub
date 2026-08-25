import { Injectable, NgZone } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

import { AuthenticationService } from './auth.service';
import {ToastrService} from "ngx-toastr";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthenticationService,
    private ngZone: NgZone,
    private router: Router,
    private toastr: ToastrService
  ) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(catchError(err => {
      const errorForClient = err.error.message || err.statusText;
      if (err.status === 401 || err.status === 403) {
        this.authService.logout();
        this.ngZone.run(() => this.router.navigate(['/auth/login']));
        this.toastr.warning(errorForClient, 'Alert');
      }
      if (err.status === 0){
        this.toastr.warning(errorForClient, 'Error');
        //this.toastr.warning('You choose too many data at one time!', 'Alert');
      } else if (err.status === 404){
        this.toastr.warning(errorForClient, 'Error');
      }

      // const error = err.error.message || err.statusText;
      return throwError(errorForClient);
    }));
  }
}
