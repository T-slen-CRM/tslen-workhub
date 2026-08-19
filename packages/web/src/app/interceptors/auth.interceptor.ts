import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpInterceptor } from '@angular/common/http';
import { HttpRequest } from '@angular/common/http';
import { HttpHandler } from '@angular/common/http';
import { HttpEvent } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const jwtToken = localStorage.getItem("jwtToken");

        if (jwtToken) {
            req = req.clone({
                setHeaders: {
                    Authorization: `Bearer ${jwtToken}`
                }
            });
            return next.handle(req);
        }
        else {
            return next.handle(req);
        }
    }
}
