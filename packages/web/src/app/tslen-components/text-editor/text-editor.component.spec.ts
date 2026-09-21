import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { HttpResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { TextEditorComponent } from './text-editor.component';
import { DataService } from '../../services/data.service';
import { LanguageService } from 'src/app/language/language.service';

describe('TextEditorComponent', () => {
  function createComponent(): {
    component: TextEditorComponent;
    dataServiceSpy: jasmine.SpyObj<DataService>;
    toastrSpy: jasmine.SpyObj<ToastrService>;
  } {
    const dataServiceSpy = jasmine.createSpyObj('DataService', ['postImage']);
    dataServiceSpy.postImage.and.returnValue(of(new HttpResponse({ body: { imageUrl: 'https://example.com/a.png' } })));
    const toastrSpy = jasmine.createSpyObj('ToastrService', ['warning']);
    const languageServiceStub = { calendarLocale: {} } as unknown as LanguageService;

    TestBed.configureTestingModule({});
    // TextEditorComponent declares a signal input() field, which asserts an
    // active Angular injection context even when constructed directly
    // (not via TestBed.createComponent) - runInInjectionContext supplies
    // that without needing to stand up the component's full template/DI
    // graph just to unit-test the upload() callback.
    const component = TestBed.runInInjectionContext(
      () => new TextEditorComponent(dataServiceSpy, languageServiceStub, toastrSpy),
    );
    return { component, dataServiceSpy, toastrSpy };
  }

  function makeFile(name: string, sizeBytes: number): File {
    return new File([new Uint8Array(sizeBytes)], name);
  }

  describe('image upload validation - mirrors PostsController\'s MaxFileSizeValidator (2MB) and ALLOWED_FILE_EXTENSIONS', () => {
    it('rejects a file over 2MB without calling postImage, and warns the user', (done) => {
      const { component, dataServiceSpy, toastrSpy } = createComponent();
      const bigFile = makeFile('photo.png', 3 * 1024 * 1024);

      component.editorConfig.upload!(bigFile).subscribe({
        complete: () => {
          expect(dataServiceSpy.postImage).not.toHaveBeenCalled();
          expect(toastrSpy.warning).toHaveBeenCalled();
          done();
        },
      });
    });

    it('rejects a disallowed file extension without calling postImage, and warns the user', (done) => {
      const { component, dataServiceSpy, toastrSpy } = createComponent();
      const svgFile = makeFile('photo.svg', 1024);

      component.editorConfig.upload!(svgFile).subscribe({
        complete: () => {
          expect(dataServiceSpy.postImage).not.toHaveBeenCalled();
          expect(toastrSpy.warning).toHaveBeenCalled();
          done();
        },
      });
    });

    it('uploads a valid file normally, with no warning', () => {
      const { component, dataServiceSpy, toastrSpy } = createComponent();
      const goodFile = makeFile('photo.png', 1024);

      component.editorConfig.upload!(goodFile).subscribe();

      expect(dataServiceSpy.postImage).toHaveBeenCalledWith('/posts/post-image', jasmine.any(FormData));
      expect(toastrSpy.warning).not.toHaveBeenCalled();
    });
  });
});
