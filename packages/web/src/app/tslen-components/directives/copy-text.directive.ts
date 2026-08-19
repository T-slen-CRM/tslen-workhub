import {Directive, HostListener, Input} from '@angular/core';
import {ToastrService} from "ngx-toastr";

@Directive({
    selector: '[appCopyText]',
    standalone: true,
})
export class CopyTextDirective {

    @Input() public copyText = '';

    constructor(private toastr: ToastrService) {}

    @HostListener('click', ['$event'])
    public onClick(event: MouseEvent): void {
        event.preventDefault();
        if (!this.copyText) {
            return;
        }
        navigator.clipboard.writeText(this.copyText.toString());
        this.toastr.success('Text has been copied', 'Copied');
    }

}
