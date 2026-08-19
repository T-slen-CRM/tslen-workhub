import {AfterViewInit, Directive, ElementRef, Input} from '@angular/core';

@Directive({
  selector: '[appStyleCounter]'
})
export class StyleCounterDirective implements AfterViewInit {
@Input('appStyleCounter') styleCounter = '';
  constructor(private elementRef: ElementRef) {
  }

  ngAfterViewInit(): void {
    this.elementRef.nativeElement.style.color = this.styleCounter || 'green';
  }
}
