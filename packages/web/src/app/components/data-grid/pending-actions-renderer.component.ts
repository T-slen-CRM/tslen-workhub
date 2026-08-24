import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { DataService } from '../../services/data.service';
import { PendingService } from '../../services/pending.service';
import { Subscription, take } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { DeleteConfirmModalComponent } from '../delete-confirm-modal/delete-confirm-modal.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-pending-actions-renderer',
  template: `<span>
    <div class="pending-actions-renderer">
      <button
        mat-icon-button
        color="primary"
        matTooltip="Approve"
        matTooltipPosition="above"
        aria-label="Approve"
        (click)="onApprove()"
        [class.spinner]="loading"
        [disabled]="loading"
      >
        <i class="fa fa-check icon"></i>
      </button>
      <button
        mat-icon-button
        color="primary"
        matTooltip="Disapprove"
        matTooltipPosition="above"
        aria-label="cancel"
        (click)="onDelete()"
        [class.spinner]="loadingDisapprove"
        [disabled]="loadingDisapprove"
      >
        <i class="fas fa-times icon"></i>
      </button>
    </div>
  </span>`,
  styles: [
    `
      .pending-actions-renderer {
        display: flex;
        justify-content: space-evenly;
        align-items: center;
      }
      .icon {
        font-size: 16px;
      }

      @keyframes spinner {
        to {
          transform: rotate(360deg);
        }
      }

      .spinner:before {
        content: '';
        box-sizing: border-box;
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        margin-top: -10px;
        margin-left: -10px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        border-top-color: #4051b5;
        animation: spinner 0.8s linear infinite;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class PendingActionsRendererComponent implements OnDestroy {
  params: any;
  visibility = false;
  isChecked = false;
  id: number;
  gridApi: any;
  loading: boolean;
  loadingDisapprove: boolean;
  public subscriptions: Subscription;
  public userId: number;
  public creative: string;

  constructor(
    private dataService: DataService,
    private pendingService: PendingService,
    private notificationService: NotificationService,
    public dialog: MatDialog,
  ) {
    this.subscriptions = new Subscription();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  agInit(params: any): void {
    this.params = params;
    this.id = params.data.id;
    this.gridApi = params.api;
    this.userId = params.data.userId;
  }
  confirmDeleteDialog(): void {
    const dialogRef = this.dialog.open(DeleteConfirmModalComponent, {
      width: '400px',
      data: { title: 'Do you want to disapprove this event?' },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
      }
    });
  }
  onDelete() {
    const dialogRef = this.dialog.open(DeleteConfirmModalComponent, {
      width: '400px',
      data: {
        text: 'Do you want to disapprove this event?',
        title: 'Disapproving',
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadingDisapprove = result;
        this.updateData(-1);
      }
    });
  }
  onApprove() {
    this.loading = true;
    this.updateData(1);
  }
  updateData(status) {
    const updateData: Subscription = this.dataService
      .updateData('/events-by-user/', this.id, {
        id: this.id,
        approved: status,
        userId: this.userId,
      })
      .subscribe((res) => {
        this.removeAgGridRow(status);
        this.pendingService.setCreativePendingCount(-1);
        // this.createNotification(status);
      });
    this.subscriptions.add(updateData);
  }

  removeAgGridRow(status) {
    const selectedNode = this.params.node;
    const selectedData = selectedNode.data;
    this.params.api.applyTransaction({ remove: [selectedData] });
    if (status === 1) {
      this.loading = false;
    } else {
      this.loadingDisapprove = false;
    }
  }
}
