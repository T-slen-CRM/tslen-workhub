import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  Renderer2
} from '@angular/core';

@Directive({
  selector: '[appInvitedLink]'
})
export class InvitedLinkDirective {
  @Input('linkedClass') linkedClass: string;
  @Output('hideLink') hideLink: EventEmitter<boolean>;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.hideLink = new EventEmitter<boolean>();
  }

  @HostListener('click', ['$event']) onClick(event) {
    const classes = this.el.nativeElement.classList;
    // if (classes.contains('slide-right')){
    //   this.removeClass('slide-right')
    //   this.addClass('slide-left');
    //   this.hideLink.emit(false);
    // } else
      if (classes.contains('slide-left')){
      this.removeClass('slide-left')
      this.hideLink.emit(true);
    } else {
      this.hideLink.emit(false);
      this.addClass('slide-left');
    }

  }

  // @HostListener('mouseleave') onMouseLeave() {
  //   this.removeClass('slide-left')
  //   this.addClass('slide-right');
  // }

  private addClass(className: string) {
    this.renderer.addClass(this.el.nativeElement, className);
  }
  private removeClass(className: string) {
    this.renderer.removeClass(this.el.nativeElement, className);
  }

}
