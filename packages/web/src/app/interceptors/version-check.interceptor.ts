import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppVersionService } from '../services/app-version.service';

@Injectable()
export class VersionCheckInterceptor implements HttpInterceptor {
  private appVersionService = inject(AppVersionService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      tap((event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse) {
          this.appVersionService.checkVersion(event.headers.get('X-App-Version'));
        }
      }),
    );
  }
}
