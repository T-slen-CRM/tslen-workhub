import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ICellRendererParams } from 'ag-grid-community';
import { UserCardInfoComponent } from '../../pages/users/user-card-info/user-card-info.component';

// Opens the read-only user-card-info popup instead of navigating to a
// separate route - see manage-users-aggrid.component.ts's "name" column.
@Component({
  selector: 'app-user-name-cell-renderer',
  template: `<a href="javascript:" (click)="openUserCard()">{{ name }}</a>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class UserNameCellRendererComponent {
  id: number;
  name: string;

  private dialog = inject(MatDialog);

  agInit(params: ICellRendererParams): void {
    this.id = params.data.id;
    this.name = `${params.data.firstName} ${params.data.lastName}`;
  }

  openUserCard(): void {
    this.dialog.open(UserCardInfoComponent, {
      width: '480px',
      data: { id: this.id },
    });
  }
}
