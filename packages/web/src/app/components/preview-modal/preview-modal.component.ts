import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';

@Component({
  selector: 'app-preview-modal',
  templateUrl: './preview-modal.component.html',
  styleUrls: ['./preview-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PreviewModalComponent {
  constructor(
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<PreviewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { url: string },
  ) {}
  closeModal(): void {
    this.dialogRef.close();
  }
}
