import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthenticationService } from "../services/auth.service";
import {catchError, map} from "rxjs/operators";
import { Observable, of} from "rxjs";
@Injectable({
  providedIn: 'root'
})
export class AuthGuard  {
  constructor(private router: Router,
              private authService: AuthenticationService) { }
  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<boolean> | boolean {
      if (Object.keys(this.authService.authData).length && this.isLoggedIn()) {
          return true;
      }
      return this.authService.getAuthData(this.router).pipe((map((isSession: boolean): boolean  =>  {
          if (isSession && this.isLoggedIn()) {
                  return isSession;
              }
              this.router.navigate(['auth/login']);
              return isSession;
      }), catchError(_e => {
          this.router.navigate(['auth/login']);
          return of(false);
      })));

    // const isLoggedIn = this.isLoggedIn();
    // if (!isLoggedIn){
    //   this.router.navigate(['/login'])
    // }
    // return isLoggedIn
  }
  public isLoggedIn(): boolean {
    let status = false;
    if (localStorage.getItem('isLoggedIn') === 'true') {
      status = true;
    }
    return status;
  }
}
