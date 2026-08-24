import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-pending-date-renderer',
  template: `<span>{{ params.value | date : 'medium' }}</span>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PendingDateRendererComponent {
  params: any;
  agInit(params: any): void {
    this.params = params;
  }
}
