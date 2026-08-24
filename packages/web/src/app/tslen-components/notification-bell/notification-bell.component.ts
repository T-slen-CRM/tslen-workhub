import {
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { Notification, Notifications } from '../../interfaces/notifications';
import { NotificationModalComponent } from '../../theme/shared/components/notification-modal/notification-modal-component/notification-modal.component';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, MatBadgeModule, MatMenuModule, TranslateModule],
  templateUrl: './notification-bell.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent implements OnInit {
  public userId = input<number>();

  public notifications: Notifications = [];
  public unreadNotiCount: number = null;

  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Mirror the shared, singleton service state into local fields so the template
    // (whose *ngFor/matBadge bindings stay unchanged) stays in sync with whichever
    // mounted bell instance (top nav / left nav) last changed something. The service
    // itself owns loading and live-socket delivery, independent of this component's
    // lifecycle — see NotificationService for why that matters.
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

    this.notificationService.load();
  }

  openNotification(notification: Notification): void {
    if (notification.isRead === 0) {
      this.dataService
        .updateData('/notifications/', notification.id, { isRead: 1 })
        .pipe(take(1))
        .subscribe(() => {
          const updatedNotifications =
            this.notificationService.notifications.value.map(
              (item: Notification) => {
                if (item.id === notification.id) {
                  return { ...item, isRead: 1 };
                }
                return item;
              },
            );
          this.notificationService.notifications.next(updatedNotifications);
        });
      const currentCount =
        this.notificationService.countUnreadNotifications.value;
      const newCount = currentCount - 1;
      this.notificationService.countUnreadNotifications.next(
        newCount === 0 ? null : newCount,
      );
    }
    if (notification.link) {
      this.router.navigateByUrl(
        notification.link.replace(/^https?:\/\/[^/]+/, ''),
      );
    } else {
      this.openDialog(notification);
    }
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
    const notificationsIds = this.notifications.reduce(
      (ids: number[], item: Notification) => {
        if (item.isRead === 0) {
          ids.push(item.id);
        }
        return ids;
      },
      [],
    );
    if (notificationsIds.length > 0) {
      this.dataService
        .postData('/notifications/mark-as-read', notificationsIds)
        .pipe(take(1))
        .subscribe(() => {
          const updatedNotifications =
            this.notificationService.notifications.value.map(
              (item: Notification) => {
                return { ...item, isRead: 1 };
              },
            );
          this.notificationService.notifications.next(updatedNotifications);
          this.notificationService.countUnreadNotifications.next(null);
        });
    }
  }

  clearAll(): void {
    const notificationsIds = this.notifications.reduce(
      (ids: number[], item: Notification) => {
        ids.push(item.id);
        return ids;
      },
      [],
    );
    if (notificationsIds.length > 0) {
      this.dataService
        .postData('/notifications/clear-all', notificationsIds)
        .pipe(take(1))
        .subscribe(() => {
          this.notificationService.notifications.next([]);
          this.notificationService.countUnreadNotifications.next(null);
        });
    }
  }
}
