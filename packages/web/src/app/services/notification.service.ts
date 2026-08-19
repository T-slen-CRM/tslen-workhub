import {Injectable} from '@angular/core';
import {Notification, Notifications} from "../interfaces/notifications";
import {BehaviorSubject} from "rxjs";


@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    public countUnreadNotifications: BehaviorSubject<number>;
    public notifications: BehaviorSubject<Notifications> = new BehaviorSubject<Notifications>([]);
    public initialLoadStarted = false;
    // Guards against every mounted NotificationBellComponent instance independently
    // subscribing to the single app-wide `notification$` socket stream — without this,
    // a single live notification would be processed once per mounted instance and
    // double-counted/duplicated across the shared state.
    public liveNotificationsSubscribed = false;

    constructor() {
        this.countUnreadNotifications = new BehaviorSubject<number>(null);
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

