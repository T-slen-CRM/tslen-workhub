import {Component, Input, OnInit} from '@angular/core';
// import {NgbDropdownConfig} from '@ng-bootstrap/ng-bootstrap';
import {AuthenticationService} from '../../../../../services/auth.service';
import {Router} from "@angular/router";
import {UserService} from "../../../../../services/user.service";
import {Notifications} from "../../../../../interfaces/notifications";
import {Notification} from "../../../../../interfaces/notifications";
import {map, Subscription, take} from "rxjs";
import {DataService} from "../../../../../services/data.service";
import {NotificationService} from "../../../../../services/notification.service";
import {MatDialog} from "@angular/material/dialog";
import {NotificationModalComponent} from "../../../../shared/components/notification-modal/notification-modal-component/notification-modal.component";
import { LanguageService } from 'src/app/language/language.service';

@Component({
    selector: 'app-nav-right',
    templateUrl: './nav-right.component.html',
    styleUrls: ['./nav-right.component.scss'],
    standalone: false
})
export class NavRightComponent implements OnInit {
  userName: string;
  isLoggedIn: boolean;
  @Input('userId') userId: number;
  @Input('userAvatar') userAvatar: string;
  @Input('firstName') firstName: string;
  @Input('lastName') lastName: string;
  public notifications: Notifications;
  private subscriptions: Subscription;
  public unreadNotiCount: number;
  public today: Date;
  public selectedLanguage: string = 'en';
  constructor(
    private authenticationService: AuthenticationService,
    private router: Router,
    private userService: UserService,
    private dataService: DataService,
    private notificationService: NotificationService,
    public dialog: MatDialog,
    public translateService: LanguageService
  ) {
    this.subscriptions = new Subscription();
    this.today = new Date();
  }

  ngOnDestroy(){
      this.subscriptions.unsubscribe();
  }

  ngOnInit() {
   const user = this.authenticationService.authDataSignal();

    this.dataService.getOneUser(user.id)
    .subscribe({
      next: (userData) => {
        const body = userData.body as { language?: string };
        const langFromDb = body.language || 'en';
        this.translateService.changeLang(langFromDb);
        this.selectedLanguage = langFromDb;
      },
      error: () => {
        this.translateService.changeLang('en');
        this.selectedLanguage = 'en';
      }
    });
      // this.getNotifications();
      // this.notificationService.countUnreadNotifications.subscribe(value => {
      //     if (this.unreadNotiCount){
      //         this.getNotifications();
      //     }
      // })
      //TODO: upgrade user data to one subscription
    this.userService.userFirstName.subscribe(value => {
      if (value){
        this.firstName = value
      }
    })
    this.userService.userLastName.subscribe(value => {
      if (value){
        this.lastName = value
      }
    })
    this.userService.userId.subscribe(value => {
      if (value){
        this.userId = value
      }
    })
  }

  logout() {
      this.authenticationService.logout();
      this.router.navigate(['/pages/auth/signin']);
      //     .subscribe({
      //     next: () => {
      //         this.router.navigate(['/pages/auth/signin']);
      //     },
      //     error: () => {
      //         this.router.navigate(['/pages/auth/signin']);
      //     }
      // });
  }
    openNotification(notification){
        if (notification.isRead === 0){
            this.dataService.updateData('/notifications/', notification.id, {isRead: 1})
                .pipe(take(1))
                .subscribe(r => {
                    this.notifications = this.notifications.map((item: Notification) =>{
                        if (item.id === notification.id){
                            item.isRead = 1
                        }
                        return item
                    })
                });
            this.unreadNotiCount = this.unreadNotiCount - 1;
            if (this.unreadNotiCount === 0){
                this.unreadNotiCount = null;
            }
        }
        //open dialog
        this.openDialog(notification);
    }

    openDialog(notification){
        this.dialog.open(NotificationModalComponent, {
            width: '50%',
            position: {},
            data: {
                title: notification.title,
                message: notification.message,
                time: notification.time
            }
        });
    }

    markAsRead(){
      const notificationsIds = this.notifications.reduce((ids: number[], item: Notification) => {
          if (item.isRead === 0){
              ids.push(item.id);
          }
          return ids
      }, [])
        if (notificationsIds.length > 0){
            this.dataService.postData('/notifications/mark-as-read/', notificationsIds)
                .pipe(take(1))
                .subscribe(r => {
                    this.unreadNotiCount = null;
                    this.notifications = this.notifications.map((item: Notification) =>{
                        item.isRead = 1;
                        return item
                    })
                });
        }

    }
    clearAll(){
      const notificationsIds = this.notifications.reduce((ids: number[], item: Notification) => {
              ids.push(item.id);
          return ids
      }, [])
        if (notificationsIds.length > 0){
            this.dataService.postData('/notifications/clear-all/', notificationsIds)
                .pipe(take(1))
                .subscribe(r => {
                    this.unreadNotiCount = null;
                    this.notifications = [];
                });
        }

    }
    getNotifications(){
        let unreadCount = 0;
        const getNotifications: Subscription = this.dataService.getObservableData('/notifications')
            .pipe(map((r: any)=>{
                    return r.map(item => {
                        if (item.isRead === 0){
                            unreadCount++
                        }
                        return {
                            id: item.id,
                            title: item.title,
                            message: item.message,
                            time: this.notificationService.timeSince(this.today, new Date(item.createdAt)),
                            isRead: item.isRead
                        }
                    })
                }
                ), take(1)
            )
            .subscribe((notifications: Notifications ) => {
                this.unreadNotiCount = unreadCount === 0 ? null : unreadCount;
                this.notifications = notifications;
            });
        this.subscriptions.add(getNotifications);
    }
    changeLanguage(lang: string) {
        this.translateService.changeLang(lang);
    }
}
