import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-inventory-render',
  template: `<mat-label matTooltip="show inventory details">
    <a [routerLink]="['/admin/inventory-update/' + inventoryId]">
      {{ params.value }}
    </a>
  </mat-label> `,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class InventoryRenderComponent {
  public params: any;
  public inventoryId: number;

  constructor() {}

  agInit(params: any): void {
    this.params = params;
    this.inventoryId = params.data.id;
  }
}
