import {Directive, HostListener} from '@angular/core';

@Directive({
    selector: '[appToggleFullScreen]',
    standalone: false
})
export class ToggleFullScreenDirective {
  @HostListener('click')
  onClick() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }
}
