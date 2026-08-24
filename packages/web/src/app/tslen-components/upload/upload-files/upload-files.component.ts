import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';

import { HttpEventType, HttpResponse } from '@angular/common/http';

import { IUploadService } from '../../../services/upload/upload';
import { IProgressInfo } from '../../progressbar-bootstrap/interface/progressbar';
import { ProgressbarBootstrapComponent } from '../../progressbar-bootstrap/progressbar-bootstrap.component';
import { MessagesListComponent } from '../../messages-list/messages-list.component';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-upload-files',
  imports: [
    MatInputModule,
    MatButtonModule,
    ProgressbarBootstrapComponent,
    MessagesListComponent,
    TranslateModule,
  ],
  templateUrl: './upload-files.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./upload-files.component.scss'],
})
export class UploadFilesComponent {
  public selectedFiles?: FileList;
  public progressInfos: IProgressInfo[] = [];
  public message: string[] = [];
  @Input() public params: any;
  @Input() public multipleSelection: boolean;
  @Input() public acceptedFileTypes: string;
  @Input() public uploadLabel: string;
  @Input() public uploadLimit: number;
  @Output() public uploadComplete: EventEmitter<boolean>;

  private readonly subscription: Subscription;
  private countUploadFiles = 0;
  @Input() public disableSelect: boolean;

  constructor(private uploadService: IUploadService) {
    this.subscription = new Subscription();
    this.uploadComplete = new EventEmitter<boolean>();
    this.uploadLimit = 1;
  }
  selectFiles(event): void {
    this.message = [];
    this.progressInfos = [];
    this.selectedFiles = event.target.files;

    if (this.selectedFiles) {
      // check file size
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const file = this.selectedFiles[i];
        // check image type
        if (
          file.type === 'image/png' ||
          file.type === 'image/jpeg' ||
          file.type === 'image/gif'
        ) {
          if (file.size > 5 * 1000 * 1000) {
            this.message.push('File ' + file.name + ' is too large to upload.');
          }
        }
        if (file.type === 'video/mp4' || file.type === 'video/quicktime') {
          if (file.size > 30 * 1000 * 1000) {
            this.message.push('File ' + file.name + ' is too large to upload.');
          }
        }
      }
      // clear input if file size is too big
      if (this.message.length > 0) {
        this.selectedFiles = null;
      }
    }
  }
  uploadFiles(): void {
    this.message = [];

    if (this.selectedFiles) {
      if (this.selectedFiles.length > this.uploadLimit) {
        this.message.push(
          'You can only upload up to ' + this.uploadLimit + ' files.',
        );
        return;
      }

      for (let i = 0; i < this.selectedFiles.length; i++) {
        this.upload(i, this.selectedFiles[i], this.params);
      }
    }
  }
  upload(idx: number, file: File, params = null): void {
    this.progressInfos[idx] = { value: 0, name: file.name };

    if (file) {
      const upload: Subscription = this.uploadService
        .upload(file, params)
        .subscribe({
          next: (event: any) => {
            if (event.type === HttpEventType.UploadProgress) {
              this.progressInfos[idx].value = Math.round(
                (100 * event.loaded) / event.total,
              );
            } else if (event instanceof HttpResponse) {
              const msg = 'Uploaded the file successfully: ' + file.name;
              this.message.push(msg);
              this.countUploadFiles++;
              // output completed upload files
              if (this.countUploadFiles === this.selectedFiles.length) {
                this.uploadComplete.emit(true);
                this.selectedFiles = null;
                this.countUploadFiles = 0;
              }
            }
          },
          error: (err: any) => {
            this.progressInfos[idx].value = 0;
            const msg = 'Could not upload the file: ' + file.name;
            this.message.push(msg);
          },
        });
      this.subscription.add(upload);
    }
  }
}
