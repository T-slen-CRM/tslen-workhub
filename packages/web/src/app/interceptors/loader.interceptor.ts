import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpResponse } from '@angular/common/http';
import {Observable} from 'rxjs';
import { LoaderService } from '../services/loader.service';
import {tap} from 'rxjs/operators';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {

    constructor(private loaderService: LoaderService) {
    }

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        this.loaderService.reqCountInc();
        return next.handle(req)
            .pipe(tap((event: HttpEvent<any>) => {
                    if (event instanceof HttpResponse) {
                        this.loaderService.reqCountDec();
                    }
                }, (error) => {
                    this.loaderService.reqCountDec();
                })
            );
    }
}
