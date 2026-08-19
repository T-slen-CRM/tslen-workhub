import {Directive, Input} from '@angular/core';

@Directive({
  selector: '[appTab]',
  standalone: true,
})
export class TabDirective {
  @Input() public name: string;
  @Input() public tabId: number;
}
