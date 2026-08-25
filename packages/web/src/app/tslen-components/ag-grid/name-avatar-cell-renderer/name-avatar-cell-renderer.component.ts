import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AgRendererComponent } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-name-avatar-cell-renderer',
  styleUrls: ['./name-avatar-cell-renderer.component.scss'],
  template: ` <div>
    <img class="img-radius" [src]="avatar" alt="Generic placeholder image" />
    <span>{{ name }}</span>
  </div>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class NameAvatarCellRendererComponent implements AgRendererComponent {
  public avatar: string;
  public name: string;
  agInit(params: ICellRendererParams): void {
    const valueArr = params.value ? params.value.split('|') : [];
    this.avatar =
      valueArr.length > 0 ? valueArr[0] : '/assets/images/profile/default.png';
    this.name = valueArr.length > 0 ? valueArr[1] : '';
  }

  refresh(_params: ICellRendererParams): boolean {
    return false;
  }

  constructor() {}
}
