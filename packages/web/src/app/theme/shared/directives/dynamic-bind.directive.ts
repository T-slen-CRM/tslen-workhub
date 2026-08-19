import {Directive, ElementRef, Input} from '@angular/core';

@Directive({
  selector: '[appDynamicBind]'
})
export class DynamicBindDirective {

  @Input() appDynamicBind: any;
  //value: any;

  constructor(ref: ElementRef<HTMLInputElement>) {
    this.el = ref.nativeElement;
    //this.value = ref.nativeElement.value;
  }

  el: HTMLInputElement;

}
