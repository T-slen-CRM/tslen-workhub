import { Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { map, take } from 'rxjs';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { LiveKitWebSocketService } from '../../pages/live-kit/live-kitWebSocket.service';
import { Notification, Notifications } from '../../interfaces/notifications';
import { NotificationModalComponent } from '../../theme/shared/components/notification-modal/notification-modal-component/notification-modal.component';

@Component({
    selector: 'app-notification-bell',
    standalone: true,
    imports: [CommonModule, MatBadgeModule, MatMenuModule, TranslateModule],
    templateUrl: './notification-bell.component.html',
    styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent implements OnInit {
    public userId = input<number>();

    public notifications: Notifications = [];
    public unreadNotiCount: number = null;

    private dataService = inject(DataService);
    private notificationService = inject(NotificationService);
    private liveKitWebSocketService = inject(LiveKitWebSocketService);
    private dialog = inject(MatDialog);
    private destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        // Mirror the shared, singleton service state into local fields so the template
        // (whose *ngFor/matBadge bindings stay unchanged) stays in sync with whichever
        // mounted bell instance (top nav / left nav) last changed something.
        this.notificationService.notifications
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((notifications: Notifications) => {
                this.notifications = notifications;
            });

        this.notificationService.countUnreadNotifications
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((count: number) => {
                this.unreadNotiCount = count;
            });

        // Only the first-mounted instance triggers the initial GET — both instances still
        // receive the result through the subscriptions above once it resolves.
        if (!this.notificationService.initialLoadStarted) {
            this.notificationService.initialLoadStarted = true;
            this.getNotifications();
        }

        // `notification$` is a single app-wide socket stream; if every mounted instance
        // subscribed and pushed to shared state independently, one live event would be
        // processed once per mounted instance and double-counted/duplicated. Only the
        // first-mounted instance processes live arrivals; every instance still sees the
        // result via the subscriptions above.
        if (!this.notificationService.liveNotificationsSubscribed) {
            this.notificationService.liveNotificationsSubscribed = true;
            this.liveKitWebSocketService.notification$
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((notification: Notification) => {
                    const updatedNotifications = [{
                        id: notification.id,
                        title: notification.title,
                        message: notification.message,
                        time: this.notificationService.timeSince(new Date(), new Date(notification.createdAt)),
                        isRead: notification.isRead,
                    }, ...this.notificationService.notifications.value];
                    this.notificationService.notifications.next(updatedNotifications);
                    const currentCount = this.notificationService.countUnreadNotifications.value;
                    this.notificationService.countUnreadNotifications.next((currentCount || 0) + 1);
                });
        }
    }

    getNotifications(): void {
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
                        time: this.notificationService.timeSince(new Date(), new Date(item.createdAt)),
                        isRead: item.isRead,
                    };
                })),
                take(1),
            )
            .subscribe((notifications: Notifications) => {
                this.notificationService.countUnreadNotifications.next(unreadCount === 0 ? null : unreadCount);
                this.notificationService.notifications.next(notifications);
            });
    }

    openNotification(notification: Notification): void {
        if (notification.isRead === 0) {
            this.dataService.updateData('/notifications/', notification.id, { isRead: 1 })
                .pipe(take(1))
                .subscribe(() => {
                    const updatedNotifications = this.notificationService.notifications.value.map((item: Notification) => {
                        if (item.id === notification.id) {
                            return { ...item, isRead: 1 };
                        }
                        return item;
                    });
                    this.notificationService.notifications.next(updatedNotifications);
                });
            const currentCount = this.notificationService.countUnreadNotifications.value;
            const newCount = currentCount - 1;
            this.notificationService.countUnreadNotifications.next(newCount === 0 ? null : newCount);
        }
        this.openDialog(notification);
    }

    openDialog(notification: Notification): void {
        this.dialog.open(NotificationModalComponent, {
            width: '50%',
            position: {},
            data: {
                title: notification.title,
                message: notification.message,
                time: notification.time,
            },
        });
    }

    markAsRead(): void {
        const notificationsIds = this.notifications.reduce((ids: number[], item: Notification) => {
            if (item.isRead === 0) {
                ids.push(item.id);
            }
            return ids;
        }, []);
        if (notificationsIds.length > 0) {
            this.dataService.postData('/notifications/mark-as-read', notificationsIds)
                .pipe(take(1))
                .subscribe(() => {
                    const updatedNotifications = this.notificationService.notifications.value.map((item: Notification) => {
                        return { ...item, isRead: 1 };
                    });
                    this.notificationService.notifications.next(updatedNotifications);
                    this.notificationService.countUnreadNotifications.next(null);
                });
        }
    }

    clearAll(): void {
        const notificationsIds = this.notifications.reduce((ids: number[], item: Notification) => {
            ids.push(item.id);
            return ids;
        }, []);
        if (notificationsIds.length > 0) {
            this.dataService.postData('/notifications/clear-all', notificationsIds)
                .pipe(take(1))
                .subscribe(() => {
                    this.notificationService.notifications.next([]);
                    this.notificationService.countUnreadNotifications.next(null);
                });
        }
    }
}
