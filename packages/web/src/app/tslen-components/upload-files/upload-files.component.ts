import {
  Component,
  forwardRef,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';

import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-upload-files',
  imports: [MatInputModule, MatButtonModule, TranslateModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => UploadFilesComponent),
    },
  ],
  templateUrl: './upload-files.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./upload-files.component.scss'],
})
export class UploadFilesComponent implements ControlValueAccessor {
  public selectedFiles?: FileList;
  public message: string[] = [];
  @Input() public params: any;
  @Input() public multipleSelection: boolean;
  @Input() public acceptedFileTypes: string;
  @Input() public uploadLabel: string;
  @Input() public buttonLabel: string;
  @Input() public uploadLimit: number;
  value: any;

  private readonly subscription: Subscription;
  private countUploadFiles = 0;
  @Input() public disableSelect: boolean;
  onChange: any = () => {};
  onTouch: any = () => {};

  constructor(private toastr: ToastrService) {
    this.subscription = new Subscription();
    this.uploadLimit = 1;
  }
  writeValue(value: any): void {
    this.value = value;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }
  selectFiles(event): void {
    this.message = [];
    this.selectedFiles = event.target.files;

    if (this.selectedFiles) {
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const file = this.selectedFiles[i];
        if (
          file.type === 'image/png' ||
          file.type === 'image/jpeg' ||
          file.type === 'image/gif'
        ) {
          if (file.size > 5 * 1000 * 1000) {
            this.message.push('File ' + file.name + ' is too large to upload.');
          }
        }
      }
      if (this.message.length > 0) {
        this.selectedFiles = null;
      }
      this.uploadFiles();
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
      const formData = new FormData();
      for (let i = 0; i < this.selectedFiles.length; i++) {
        formData.append(`attachments`, this.selectedFiles[i]);
      }
      this.onChange(formData);
      this.onTouch();
      this.toastr.success('Files uploaded successfully');
    }
  }
}
