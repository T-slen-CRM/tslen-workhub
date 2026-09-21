import {
  AfterViewChecked,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  ViewChildren,
  WritableSignal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DataService } from '../../services/data.service';
import { EMPTY, map, Observable, of, Subscription, switchMap } from 'rxjs';
import { AuthData } from '../../services/auth.service';
import { Role } from '@tslen-workhub/shared';
import { DeleteConfirmModalComponent } from '../../components/delete-confirm-modal/delete-confirm-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { IPost } from '../../interfaces/post';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-posts',
  templateUrl: './posts.component.html',
  styleUrls: ['./posts.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PostsComponent implements OnInit, OnDestroy, AfterViewChecked {
  constructor(
    private dataService: DataService,
    public dialog: MatDialog,
    private sanitizer: DomSanitizer,
  ) {
    this.subscription$ = new Subscription();
  }
  public posts: Observable<IPost[]>;
  public showCountOfPost = 5;
  public isAdmin: boolean;
  public userId: number;
  public userRole: Role;
  private subscription$: Subscription;
  @Input() public authData: AuthData;
  private staticPostsArr: IPost[] = [];
  public showEditor: WritableSignal<boolean> = signal(false);

  // Collapse/expand for long posts - same technique as
  // task-create-edit.component.ts's description preview (max-height +
  // overflow:hidden CSS, scrollHeight vs clientHeight to detect overflow),
  // generalized from one item to a feed of many, keyed by post id.
  @ViewChildren('postContentEl') postContentEls!: QueryList<ElementRef<HTMLElement>>;
  private expandedPostIds = signal<Set<number>>(new Set());
  private overflowingPostIds = signal<Set<number>>(new Set());

  ngAfterViewChecked(): void {
    if (!this.postContentEls) {
      return;
    }
    const next = new Set<number>();
    this.postContentEls.forEach((ref) => {
      const el = ref.nativeElement;
      const postId = Number(el.dataset['postId']);
      if (this.expandedPostIds().has(postId)) {
        // max-height:none while expanded makes scrollHeight===clientHeight
        // regardless of real content length - can't re-measure in this
        // state, so keep whatever was already known before expanding.
        if (this.overflowingPostIds().has(postId)) {
          next.add(postId);
        }
        return;
      }
      if (el.scrollHeight > el.clientHeight) {
        next.add(postId);
      }
    });
    // Only write when something actually changed - ngAfterViewChecked runs
    // every change-detection cycle, and writing to a signal read in the
    // template on every single run (even when nothing changed) would
    // trigger another cycle indefinitely.
    if (!this.setsEqual(next, this.overflowingPostIds())) {
      this.overflowingPostIds.set(next);
    }
  }

  private setsEqual(a: Set<number>, b: Set<number>): boolean {
    if (a.size !== b.size) {
      return false;
    }
    for (const value of a) {
      if (!b.has(value)) {
        return false;
      }
    }
    return true;
  }

  isExpanded(postId: number | undefined): boolean {
    return postId !== undefined && this.expandedPostIds().has(postId);
  }

  isOverflowing(postId: number | undefined): boolean {
    return postId !== undefined && this.overflowingPostIds().has(postId);
  }

  toggleExpand(postId: number | undefined): void {
    if (postId === undefined) {
      return;
    }
    this.expandedPostIds.update((set) => {
      const next = new Set(set);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }

  showMore() {
    this.showCountOfPost += 5;
  }
  ngOnDestroy() {
    this.subscription$.unsubscribe();
  }

  ngOnInit(): void {
    this.userId = this.authData.id;
    this.userRole = this.authData.role;
    this.isAdmin = this.userRole === Role.Admin || this.userRole === Role.Manager;
    this.posts = this.dataService.getObservableData('/posts').pipe(
      map((r: IPost[]) => {
        this.staticPostsArr = r;
        return r;
      }),
    );
  }
  safeHtml(postText: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(postText);
  }
  addLike(post: IPost) {
    const likesOwnerArray = post.likesOwners.split('|');
    const userLikeIndex = likesOwnerArray.indexOf('' + this.userId);
    if (userLikeIndex === -1) {
      likesOwnerArray.push('' + this.userId);
      post.likes += 1;
    } else {
      likesOwnerArray.splice(userLikeIndex, 1);
      post.likes -= 1;
    }
    post.likesOwners = likesOwnerArray.join('|');
    const updatePost = this.dataService
      .updateData('/posts/', post.id, post)
      .subscribe((_r) => {});
    this.subscription$.add(updatePost);
  }
  addPost(post: IPost) {
    this.staticPostsArr.unshift(post);
    this.posts = of(this.staticPostsArr);
  }
  confirmDeleteDialog(post: IPost): void {
    const dialogRef = this.dialog.open(DeleteConfirmModalComponent, {
      width: '400px',
      data: { text: 'Do you want to delete this event?' },
    });
    dialogRef
      .afterClosed()
      .pipe(
        switchMap((result) => {
          if (result) {
            return this.dataService.deleteData('/posts/', +post.id);
          } else {
            return EMPTY;
          }
        }),
      )
      .subscribe((_res) => {
        this.staticPostsArr = this.staticPostsArr.filter(
          (item) => item.id !== post.id,
        );
        this.posts = of(this.staticPostsArr);
      });
  }
  showPostEditor() {
    this.showEditor.update((value) => !value);
  }
}
