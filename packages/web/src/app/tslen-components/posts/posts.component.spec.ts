import { ElementRef, QueryList } from '@angular/core';
import { of } from 'rxjs';
import { PostsComponent } from './posts.component';
import { DataService } from '../../services/data.service';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';

describe('PostsComponent', () => {
  function createComponent(): PostsComponent {
    const dataServiceStub = { getObservableData: () => of([]) } as unknown as DataService;
    const dialogStub = {} as MatDialog;
    const sanitizerStub = { bypassSecurityTrustHtml: (v: string) => v } as unknown as DomSanitizer;
    return new PostsComponent(dataServiceStub, dialogStub, sanitizerStub);
  }

  function fakeContentEls(
    entries: { postId: number; scrollHeight: number; clientHeight: number }[],
  ): QueryList<ElementRef<HTMLElement>> {
    const elements = entries.map((e) => ({
      nativeElement: {
        dataset: { postId: String(e.postId) },
        scrollHeight: e.scrollHeight,
        clientHeight: e.clientHeight,
      },
    }));
    return { forEach: (cb: (el: unknown) => void) => elements.forEach(cb) } as unknown as QueryList<ElementRef<HTMLElement>>;
  }

  describe('collapse/expand for long posts', () => {
    it('marks a post overflowing when its content exceeds the collapsed height', () => {
      const component = createComponent();
      component.postContentEls = fakeContentEls([{ postId: 1, scrollHeight: 500, clientHeight: 300 }]);

      component.ngAfterViewChecked();

      expect(component.isOverflowing(1)).toBe(true);
    });

    it('does not mark a post overflowing when its content fits within the collapsed height', () => {
      const component = createComponent();
      component.postContentEls = fakeContentEls([{ postId: 1, scrollHeight: 200, clientHeight: 300 }]);

      component.ngAfterViewChecked();

      expect(component.isOverflowing(1)).toBe(false);
    });

    it('toggleExpand flips isExpanded for that post only, not others', () => {
      const component = createComponent();

      component.toggleExpand(1);

      expect(component.isExpanded(1)).toBe(true);
      expect(component.isExpanded(2)).toBe(false);

      component.toggleExpand(1);

      expect(component.isExpanded(1)).toBe(false);
    });

    it('keeps the previously-known overflow state for an expanded post instead of re-measuring (max-height:none while expanded means scrollHeight===clientHeight, which would otherwise look like it stopped overflowing)', () => {
      const component = createComponent();
      component.postContentEls = fakeContentEls([{ postId: 1, scrollHeight: 500, clientHeight: 300 }]);
      component.ngAfterViewChecked();
      component.toggleExpand(1);

      component.postContentEls = fakeContentEls([{ postId: 1, scrollHeight: 300, clientHeight: 300 }]);
      component.ngAfterViewChecked();

      expect(component.isOverflowing(1)).toBe(true);
    });

    it('is a no-op before the view children are available', () => {
      const component = createComponent();
      component.postContentEls = undefined as unknown as QueryList<ElementRef<HTMLElement>>;

      expect(() => component.ngAfterViewChecked()).not.toThrow();
    });

    it('isOverflowing/isExpanded are false for an undefined post id', () => {
      const component = createComponent();

      expect(component.isOverflowing(undefined)).toBe(false);
      expect(component.isExpanded(undefined)).toBe(false);
    });
  });
});
