import {Directive, Input} from '@angular/core';

@Directive({
  selector: '[appExpansionPanel]',
  standalone: true
})
export class PanelDirective {
  @Input() public panelTitle: string;
  @Input() public panelId: number;
  @Input() public expanded: boolean;
  @Input() public description: string;

}
