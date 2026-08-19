import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private router: Router) { }
  canActivate(): boolean {
    return this.isAdmin();
  }
  public isAdmin(): boolean {
    let status = false;
    if (localStorage.getItem('role') === 'ADM') {
      status = true;
    }
    return status;
  }
}
