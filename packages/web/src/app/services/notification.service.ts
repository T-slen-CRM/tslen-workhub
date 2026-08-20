import {inject, Injectable} from '@angular/core';
import {Notification, Notifications} from "../interfaces/notifications";
import {BehaviorSubject} from "rxjs";
import {map, take} from "rxjs/operators";
import {ToastrService} from "ngx-toastr";
import {DataService} from "./data.service";
import {LiveKitWebSocketService} from "../pages/live-kit/live-kitWebSocket.service";


@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    public countUnreadNotifications: BehaviorSubject<number>;
    public notifications: BehaviorSubject<Notifications> = new BehaviorSubject<Notifications>([]);

    private dataService = inject(DataService);
    private liveKitWebSocketService = inject(LiveKitWebSocketService);
    private toastr = inject(ToastrService);
    private loadStarted = false;

    constructor() {
        this.countUnreadNotifications = new BehaviorSubject<number>(null);

        // Subscribed once, for this singleton service's own lifetime — never tied to a
        // NotificationBellComponent instance's mount/unmount. The previous "first-mounted
        // component instance claims the live socket subscription" pattern had no way to
        // hand that claim off: if that instance was ever destroyed (e.g. across a
        // logout/login cycle recreating the layout), no bell instance could process live
        // arrivals again until a full page reload.
        this.liveKitWebSocketService.notification$.subscribe((notification: Notification) => {
            const updatedNotifications = [{
                id: notification.id,
                title: notification.title,
                message: notification.message,
                time: this.timeSince(new Date(), new Date(notification.createdAt)),
                isRead: notification.isRead,
                link: notification.link,
            }, ...this.notifications.value];
            this.notifications.next(updatedNotifications);
            const currentCount = this.countUnreadNotifications.value;
            this.countUnreadNotifications.next((currentCount || 0) + 1);

            new Audio('assets/audio/join.mp3').play().catch(() => {});
            this.toastr.info(notification.message, notification.title);
        });
    }

    load(): void {
        if (this.loadStarted) {
            return;
        }
        this.loadStarted = true;
        let unreadCount = 0;
        this.dataService.getObservableData('/notifications')
            .pipe(
                map((r: any) => r.map((item: any) => {
                    if (item.isRead === 0) {
                        unreadCount++;
                    }
                    return {
                        id: item.id,
                        title: item.title,
                        message: item.message,
                        time: this.timeSince(new Date(), new Date(item.createdAt)),
                        isRead: item.isRead,
                        link: item.link,
                    };
                })),
                take(1),
            )
            .subscribe((notifications: Notifications) => {
                this.countUnreadNotifications.next(unreadCount === 0 ? null : unreadCount);
                this.notifications.next(notifications);
            });
    }

    setCountUnreadNotifications(value: number){
        this.countUnreadNotifications.next(value);
    }

    prepareNotificationsForAllUsers(notification: Notification, users: any){
        return users.map(user => {
            let item = user.data;
            return {
                title: notification.title,
                message: notification.message,
                isRead: 0,
                userId: item.id,
                createdAt: new Date
            }
        });

    }
    prepareNotificationsForOneUser(type: string, status: string, data: any){
        let message = '';
        if (type === 'creative'){
            message += `You creative ${data.name} was ${status}!`
        }
            return {
                id: null,
                title: status.charAt(0).toUpperCase() + status.slice(1),
                message: message,
                isRead: 0,
                userId: +data.userId,
                createdAt: new Date
            }
    }

    timeSince(today, date) {

        const seconds = Math.floor((today - date) / 1000);

        let interval = seconds / 31536000;

        if (interval > 1) {
            return Math.floor(interval) + " years";
        }
        interval = seconds / 2592000;
        if (interval > 1) {
            return Math.floor(interval) + " months";
        }
        interval = seconds / 86400;
        if (interval > 1) {
            return Math.floor(interval) + " days";
        }
        interval = seconds / 3600;
        if (interval > 1) {
            return Math.floor(interval) + " hours";
        }
        interval = seconds / 60;
        if (interval > 1) {
            return Math.floor(interval) + " minutes";
        }
        return Math.floor(seconds) + " seconds";
    }

}
