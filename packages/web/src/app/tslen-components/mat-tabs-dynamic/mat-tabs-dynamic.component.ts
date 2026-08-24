import {
  AfterViewInit,
  Component,
  ContentChildren,
  QueryList,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { TabDirective } from '../directives/tab.directive';
import { MatTabsModule } from '@angular/material/tabs';
@Component({
  selector: 'app-mat-tabs-dynamic',
  imports: [CommonModule, MatTabsModule],
  templateUrl: './mat-tabs-dynamic.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./mat-tabs-dynamic.component.scss'],
})
export class MatTabsDynamicComponent implements AfterViewInit {
  public index = 0;
  @ContentChildren(TabDirective, { read: TemplateRef })
  templates: QueryList<any>;
  @ContentChildren(TabDirective) tabs: QueryList<TabDirective>;
  currentTab: TemplateRef<any>;

  setTemplate(index: number) {
    this.index = index;
    this.currentTab = this.templates.get(index);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.setTemplate(this.index);
    }, 0);
  }
}
