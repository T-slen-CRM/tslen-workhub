import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-incoming-call-dialog',
  templateUrl: './incoming-call.component.html',
  styleUrls: ['./incoming-call.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslateModule],
})
export class IncomingCallComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<any>,
  ) {}

  accept() {
    this.dialogRef.close(true);
  }

  reject() {
    this.dialogRef.close(false);
  }
}
