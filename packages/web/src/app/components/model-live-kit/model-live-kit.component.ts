import { Component } from '@angular/core';
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-call-button-renderer',
    templateUrl: './model-live-kit.component.html',
    styleUrls: ['./model-live-kit.component.scss'],
    standalone: false
})
export class ModalLiveKit {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private dialogRef: MatDialogRef<any>) {}
  cancelCall(){
    this.dialogRef.close(false);
  }
}
