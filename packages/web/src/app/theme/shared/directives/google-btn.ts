import {take} from 'rxjs';
import {SocialAuthService} from '@abacritt/angularx-social-login';
import {Directive, ElementRef, Input, OnInit} from '@angular/core';

declare var google;

@Directive({
    // eslint-disable-next-line @angular-eslint/directive-selector
    selector: 'google-signin-butt',
    standalone: true,
})
export class GoogleSigninButtDirective implements OnInit {

    @Input() option: boolean;

    @Input() btnText: string;

    constructor(private el: ElementRef) {
    }

    ngOnInit() {
        if (this.option) { return; }
    }
}
