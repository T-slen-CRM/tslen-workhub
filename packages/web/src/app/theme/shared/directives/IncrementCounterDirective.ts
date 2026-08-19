import {Input, AfterViewInit, Component, ElementRef, OnInit, Renderer2, Directive, SimpleChange} from '@angular/core';

@Directive({
  selector: '[appIncrementCounter]'
})

export class IncrementCounterDirective implements AfterViewInit {

  // tslint:disable-next-line:no-input-rename
  @Input('appIncrementCounter') end = 0;
  @Input('appIncrementCounterDuration') duration = 1000;
  @Input('appIncrementCounterOffset') offset = 50;
  constructor(private elRef: ElementRef, private renderer: Renderer2) {}

  ngAfterViewInit(): void {
    this.counterFunc(this.end, this.duration);
  }
  // tslint:disable-next-line:use-lifecycle-interface
  ngOnChanges(changes: { [property: string]: SimpleChange }) {
    const change: SimpleChange = changes.dates;
    this.counterFunc(changes.end.currentValue, this.duration, this.offset);
  }

  private counterFunc(end: number, duration: number = 1000, offset: number = 50) {
    let range, current: number, step, timer: any;
    // tslint:disable-next-line:prefer-const
    let counter = Math.ceil(end / offset);
    range = end;
    current = 0;
    step = Math.abs(Math.floor(duration / range));
    timer = setInterval(() => {
      current += counter;
      if (current >= end) {
        current = end;
        clearInterval(timer);
      }
      this.setText(current);
    }, step);
  }
  setText(n: number) {
    this.renderer.setProperty(this.elRef.nativeElement, 'innerText', `${n.toLocaleString()}`);
  }
}
