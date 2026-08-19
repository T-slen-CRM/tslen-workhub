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
    private today = new Date();

    private dataService = inject(DataService);
    private notificationService = inject(NotificationService);
    private liveKitWebSocketService = inject(LiveKitWebSocketService);
    private dialog = inject(MatDialog);
    private destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.getNotifications();
        this.liveKitWebSocketService.notification$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((notification: Notification) => {
                this.notifications = [{
                    id: notification.id,
                    title: notification.title,
                    message: notification.message,
                    time: this.notificationService.timeSince(this.today, new Date(notification.createdAt)),
                    isRead: notification.isRead,
                }, ...this.notifications];
                this.unreadNotiCount = (this.unreadNotiCount || 0) + 1;
            });
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
                        time: this.notificationService.timeSince(this.today, new Date(item.createdAt)),
                        isRead: item.isRead,
                    };
                })),
                take(1),
            )
            .subscribe((notifications: Notifications) => {
                this.unreadNotiCount = unreadCount === 0 ? null : unreadCount;
                this.notifications = notifications;
            });
    }

    openNotification(notification: Notification): void {
        if (notification.isRead === 0) {
            this.dataService.updateData('/notifications/', notification.id, { isRead: 1 })
                .pipe(take(1))
                .subscribe(() => {
                    this.notifications = this.notifications.map((item: Notification) => {
                        if (item.id === notification.id) {
                            item.isRead = 1;
                        }
                        return item;
                    });
                });
            this.unreadNotiCount = this.unreadNotiCount - 1;
            if (this.unreadNotiCount === 0) {
                this.unreadNotiCount = null;
            }
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
                    this.unreadNotiCount = null;
                    this.notifications = this.notifications.map((item: Notification) => {
                        item.isRead = 1;
                        return item;
                    });
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
                    this.unreadNotiCount = null;
                    this.notifications = [];
                });
        }
    }
}
