import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';

import { DataService } from '../../../../services/data.service';
import { ToastrService } from 'ngx-toastr';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { IProjectPermission } from '../../../../interfaces/taskProjectPermission';
import { MatTableService } from '../../../../services/matTableService';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { UnsubscribeOnDestroyAdapter } from '../../../../helpers/UnsubscribeOnDestroyAdapter';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-project-member-action-button',
  imports: [MatIconModule, MatButtonModule, TranslateModule],
  templateUrl: './project-member-action-button.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./project-member-action-button.scss'],
})
export class ProjectMemberActionButton
  extends UnsubscribeOnDestroyAdapter
  implements AfterViewInit
{
  @ViewChild('input') public input: ElementRef;
  public loading: boolean;
  public isVisibleInputParams: string;
  public inputRow: IProjectPermission;

  constructor(
    private dataService: DataService,
    private toastService: ToastrService,
    private matTableService: MatTableService,
  ) {
    super();
    this.isVisibleInputParams = 'block';
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.input.nativeElement.innerText) {
        this.inputRow = JSON.parse(this.input.nativeElement.innerText);
        this.isVisibleInputParams = 'none';
      }
    }, 0);
  }
  onDelete() {
    this.loading = true;
    if (this.inputRow?.id) {
      this.matTableService.setChangedMembersRow({
        action: 'delete',
        row: this.inputRow,
      });
      // const deletedRow: Subscription = this.dataService.deleteData('/project-permission/', this.inputRow.id)
      //     .subscribe({
      //         next: (res) => {
      //             this.toastService.success('Project member deleted', 'Deleted');
      //
      //             this.loading = false;
      //         },
      //         error: (error) => {
      //             this.toastService.error('Something went wrong', 'Error');
      //             this.loading = false;
      //         }
      //     });
      // this.subscription.add(deletedRow);
    } else {
      this.toastService.success('Project member deleted', 'Deleted');
      this.matTableService.setChangedMembersRow({
        action: 'delete',
        row: this.inputRow,
      });
    }
  }
}
