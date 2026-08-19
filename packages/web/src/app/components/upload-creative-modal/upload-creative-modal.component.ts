import {Component, Inject, OnInit} from '@angular/core';

import {IUploadService} from '../../services/upload/upload';
import {MultipleUploadCreativeService} from '../../services/upload/multiple-upload-creative.service';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';


@Component({
    selector: 'app-upload-creative-modal',
    templateUrl: './upload-creative-modal.component.html',
    styleUrls: ['./upload-creative-modal.component.scss'],
    providers: [{
            provide: IUploadService,
            useClass: MultipleUploadCreativeService
        }],
    standalone: false
})
export class UploadCreativeModalComponent implements OnInit{
  folderId: number;
  file: File | null | undefined;
  format: string;
  width: number;
  height: number;
  name: string;
  originName: string;
  url: string;
  public acceptedFileTypes = `image/png, image/jpeg, image/gif, video/mp4, audio/mp3`;
  public uploadLimit = 10;
  public uploadTooltip = `You can upload up to ${this.uploadLimit} files at once. Accepted file types: ${this.acceptedFileTypes}. Max size: image - 5MB, video - 30MB`;
  public uploadComplete: boolean;
  public folders = [];
  public foldersKeys = [];
  constructor(
              public dialog: MatDialog,
              @Inject(MAT_DIALOG_DATA) public data: any,
              public dialogRef: MatDialogRef<UploadCreativeModalComponent>,
  ) {}

  ngOnInit() {
    this.folders = this.data.folders;
    this.foldersKeys = Object.keys(this.folders);
  }
  closeDialog() {
    this.dialogRef.close(this.uploadComplete);
  }
}
