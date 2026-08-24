import {
  Component,
  ContentChildren,
  Input,
  QueryList,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { PanelDirective } from '../directives/panel.directive';

@Component({
  selector: 'app-mat-panel-dynamic',
  imports: [CommonModule, MatExpansionModule],
  templateUrl: './mat-panel-dynamic.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./mat-panel-dynamic.component.scss'],
})
export class MatPanelDynamicComponent {
  public index = 0;
  @ContentChildren(PanelDirective, { read: TemplateRef })
  templates: QueryList<any>;
  @ContentChildren(PanelDirective) panels: QueryList<PanelDirective>;

  @Input() public multiExpanded: boolean = false;
}
