import {
  Component,
  EventEmitter,
  forwardRef,
  input,
  Input,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';

import {
  AngularEditorConfig,
  AngularEditorModule,
} from '@kolkov/angular-editor';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthData } from '../../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { tap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { IPost } from '../../interfaces/post';
import { HttpResponse } from '@angular/common/http';
import { LanguageService } from 'src/app/language/language.service';
import { TranslateModule } from '@ngx-translate/core';
import { ITextEditor } from '../../interfaces/tasks';

@Component({
  selector: 'app-text-editor',
  imports: [
    AngularEditorModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    TranslateModule,
  ],
  templateUrl: './text-editor.component.html',
  styleUrls: ['./text-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextEditorComponent),
      multi: true,
    },
  ],
})
export class TextEditorComponent implements OnInit {
  public calendarLocale;
  @Input() public authData: AuthData;
  @Output() public newPost: EventEmitter<any>;
  public userId: number;
  public userName: string;
  public userAvatar: string;
  public companyId: number;
  public uploadedImageUrl: string | null = null;
  customEditorConfig = input<ITextEditor>(undefined);
  public value = '';
  private onChange = (_item: string) => {};
  private onTouched = () => {};

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: '100px',
    minHeight: '0',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'yes',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Enter text here...',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    fonts: [
      { class: 'arial', name: 'Arial' },
      { class: 'times-new-roman', name: 'Times New Roman' },
      { class: 'calibri', name: 'Calibri' },
      { class: 'comic-sans-ms', name: 'Comic Sans MS' },
    ],
    customClasses: [
      {
        name: 'quote',
        class: 'quote',
      },
      {
        name: 'redText',
        class: 'redText',
      },
      {
        name: 'titleText',
        class: 'titleText',
        tag: 'h1',
      },
    ],
    // uploadUrl: 'v1/image',
    upload: (file: File) => {
      const formData: FormData = new FormData();
      formData.append('file', file);

      return this.dataService.postImage('/posts/post-image', formData).pipe(
        tap((event) => {
          if (event instanceof HttpResponse) {
            this.uploadedImageUrl = event.body?.imageUrl;
          }
        }),
      );
    },
    uploadWithCredentials: true,
    sanitize: false,
    toolbarPosition: 'top',
    toolbarHiddenButtons: [['bold', 'italic'], ['fontSize']],
  };
  constructor(
    private dataService: DataService,
    public translate: LanguageService,
  ) {
    this.newPost = new EventEmitter();
    this.calendarLocale = this.translate.calendarLocale;
  }

  ngOnInit(): void {
    if (this.customEditorConfig()) {
      this.editorConfig = {
        ...this.editorConfig,
        ...this.customEditorConfig(),
      };
    } else {
      this.userId = this.authData.id;
      this.userAvatar = this.authData.avatar;
      this.userName = this.authData.firstName + ' ' + this.authData.lastName;
      this.companyId = this.authData.companyId;
    }
  }
  writeValue(item: string | null): void {
    this.value = item ?? '';
  }
  registerOnChange(fn: (item: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onChangeModel(data: string) {
    this.value = data;
    this.onChange(data);
  }
  addPost() {
    const post: IPost = {
      userId: this.userId,
      avatar: this.userAvatar,
      title: this.userName,
      subtitle: new Date(),
      likesOwners: '',
      text: this.value,
      createdAt: new Date(),
      image: null,
      likes: 0,
      companyId: this.companyId,
    };
    this.dataService.postData('/posts', post).subscribe((r) => {
      this.value = '';
      this.onChange(this.value);
      this.newPost.emit(r.body);
    });
  }
}
