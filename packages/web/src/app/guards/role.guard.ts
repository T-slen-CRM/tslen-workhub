import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {AuthenticationService} from "../services/auth.service";

@Injectable({
  providedIn: 'root'
})
export class RoleGuard  {

  constructor(private authService: AuthenticationService) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const role: string = this.authService.authDataSignal().role;
    if (route.data.roles.includes(role)) {
      return true;
    }
    return false;
  }
}
