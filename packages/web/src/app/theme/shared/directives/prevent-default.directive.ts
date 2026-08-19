import {Directive, HostListener} from '@angular/core';

@Directive({
    selector: '[appPreventDefault]',
    standalone: false
})
export class PreventDefaultDirective {
    @HostListener('click', ["$event"])
    public onClick(event: any) {
        event.stopPropagation();
        event.preventDefault();
    }
}
