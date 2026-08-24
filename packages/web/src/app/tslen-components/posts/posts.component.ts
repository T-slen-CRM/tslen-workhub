import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  signal,
  WritableSignal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DataService } from '../../services/data.service';
import { EMPTY, map, Observable, of, Subscription, switchMap } from 'rxjs';
import { AuthData } from '../../services/auth.service';
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
export class PostsComponent implements OnInit, OnDestroy {
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
  public userRole: string;
  private subscription$: Subscription;
  @Input() public authData: AuthData;
  private staticPostsArr: IPost[] = [];
  public showEditor: WritableSignal<boolean> = signal(false);
  showMore() {
    this.showCountOfPost += 5;
  }
  ngOnDestroy() {
    this.subscription$.unsubscribe();
  }

  ngOnInit(): void {
    this.userId = this.authData.userId;
    this.userRole = this.authData.userRole;
    this.isAdmin = this.userRole === 'admin' || this.userRole === 'manager';
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
      .subscribe((r) => {});
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
      .subscribe((res) => {
        this.staticPostsArr = this.staticPostsArr.filter(
          (item) => item.id !== post.id,
        );
        this.posts = of(this.staticPostsArr);
      });
  }
  showPostEditor() {
    this.showEditor.update((value) => !value);
  }
  // deletePost(post: IPost) {
  //   const deletePost: Subscription = this.dataService.deleteData('/posts/', +post.id)
  //       .subscribe(r => {
  //         this.staticPostsArr = this.staticPostsArr.filter(item => item.id !== post.id);
  //         this.posts = of(this.staticPostsArr);
  //       });
  //   this.subscription$.add(deletePost);
  // }
}
