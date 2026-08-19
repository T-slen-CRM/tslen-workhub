import {AfterViewInit, Directive, ElementRef, Input, SimpleChanges} from '@angular/core';

@Directive({
  selector: '[creativePreviewStyle]'
})
export class CreativePreviewStyleDirective implements AfterViewInit {
  @Input('width') inputWidth: number;
  @Input('previewType') previewType: string;
  @Input('height') inputHeight: number;
  public style: any; //TODO: interface
  public maxPhonePortraitWidth = 128;
  public maxPhonePortraitHeight = 260;
  public maxPhoneLandscapeWidth = 258;
  public maxPhoneLandscapeHeight = 124;
  public maxDesktopWidth = 248;
  public maxDesktopHeight = 130;

  constructor(private elementRef: ElementRef) {
    this.style = this.elementRef.nativeElement.style;
  }

  ngAfterViewInit(): void {
    if (this.previewType === 'phone'){
      this.setStyle();
    } else {
      this.setDesktopStyle();
    }
  }
  ngOnChanges(changes: SimpleChanges){
    if (changes.inputWidth){
      this.inputWidth = changes.inputWidth.currentValue;
    } else if (changes.inputHeight){
      this.inputHeight = changes.inputHeight.currentValue;
    }

    if (this.previewType === 'phone'){
      this.setStyle();
    } else {
      this.setDesktopStyle();
    }

  }
  setStyle(){
    this.style.position = 'absolute';
    //this.style.height = 'auto';
    this.style.left = '86px';
    this.style.top = '25px';

    if (this.inputWidth < 320){ // for portrait
      this.style.width = (this.maxPhonePortraitWidth * this.inputWidth / 320) + 'px';
    } else if (this.inputWidth > 320){ // for landscape
      this.style.left = '20px';
      this.style.top = '88px';
      this.style.width = (this.maxPhoneLandscapeWidth * this.inputWidth / 480) + 'px';
      if (this.inputWidth > 480){
        this.style.width = this.maxPhoneLandscapeWidth + 'px';
      }
    }
    else {
      this.style.width = this.maxPhonePortraitWidth + 'px';
    }

    if (this.inputHeight < 480){
      this.style.height = (this.maxPhonePortraitHeight * this.inputHeight) / 480 + 'px';
    }
    else {
      this.style.height = this.maxPhonePortraitHeight + 'px';
    }
    if (this.inputWidth > 320){
      this.style.height = (this.maxPhoneLandscapeHeight * this.inputHeight) / 320 + 'px';
      if (this.inputHeight > 320){
        this.style.height = this.maxPhoneLandscapeHeight + 'px';
      }
    }
  }
  setDesktopStyle(){
    this.style.position = 'absolute';
    this.style.height = 'auto';
    this.style.left = '26px';
    this.style.top = '65px';

    if (this.inputWidth < 1024){
      this.style.width = (this.maxDesktopWidth * this.inputWidth / 1024) + 'px';
    } else {
      this.style.width = this.maxDesktopWidth + 'px';
    }
    if (this.inputHeight < 768){
      this.style.height = (this.maxDesktopHeight * this.inputHeight) / 768 + 'px';
    } else {
      this.style.height = this.maxDesktopHeight + 'px';
    }
  }
}
