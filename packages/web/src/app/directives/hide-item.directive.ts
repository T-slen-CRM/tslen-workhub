import {Directive, ElementRef, Input} from '@angular/core';

@Directive({
  selector: '[appHideItem]',
  standalone: true
})
export class HideItemDirective {
  private isHidden: boolean;
  private readonly nativeElementStyle: any;
  @Input() set hide(data: boolean){
    this.isHidden = data;
    if (this.nativeElementStyle){
      if (data){
        this.nativeElementStyle.display = 'none';
      } else {
        this.nativeElementStyle.display = 'block';
      }
    }
  }
  constructor(ref: ElementRef) {
    this.nativeElementStyle = ref.nativeElement.style;
  }

}
