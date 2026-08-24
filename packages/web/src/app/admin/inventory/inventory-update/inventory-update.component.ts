import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { InventoryService } from '../services/inventory.service';
import { ToastrService } from 'ngx-toastr';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UnsubscribeOnDestroyAdapter } from '../../../helpers/UnsubscribeOnDestroyAdapter';

import { ComponentsModule } from '../../../components/components.module';
import { DateTimeInputComponent } from '../../../feature/date-time-input/date-time-input.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { IInventoryHistory, IUsers } from '../interfaces/inventory';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-inventory-update',
  imports: [
    MatIconModule,
    ComponentsModule,
    DateTimeInputComponent,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './inventory-update.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './inventory-update.component.scss',
})
export class InventoryUpdateComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit
{
  public form: FormGroup;
  private inventoryService = inject(InventoryService);
  private toastr = inject(ToastrService);
  private router = inject(Router);
  private id: number;
  public usersList: IUsers[] = [];
  public showHistory: boolean = false;
  public historyData: IInventoryHistory[] = [];
  private previousUserId: number | null = null;

  ngOnInit(): void {
    this.form = this.inventoryService.getCreateInventoryForm();
    this.id = Number(this.router.url.split('/').pop());
    const getInventory = forkJoin([
      this.inventoryService.getOneInventory(this.id),
      this.inventoryService.getAllUsers(),
    ]).subscribe(([inventoryResponse, usersResponse]) => {
      this.previousUserId = inventoryResponse.userId || null;
      this.form.patchValue(inventoryResponse);
      this.historyData = inventoryResponse.inventoryByUserHistory;
      this.changeDate(this.historyData);
      this.usersList = usersResponse;
    });
    this.subscription.add(getInventory);
  }

  saveInventory() {
    this.inventoryService
      .updateInventory(
        this.id,
        this.form.value,
        this.historyData,
        this.previousUserId,
      )
      .subscribe(
        (response: any) => {
          this.toastr.success('Inventory updated successfully');
          this.router.navigate(['/admin/inventory']);
        },
        (error) => {
          this.toastr.error('Error updating inventory');
        },
      );
  }
  openHistory() {
    this.showHistory = !this.showHistory;
  }
  changeDate(data: IInventoryHistory[]) {
    this.historyData = data.map((item) => {
      item.formattedStartDate = this.inventoryService.formatDateReadable(
        item.startDate,
      );
      item.formattedEndDate = this.inventoryService.formatDateReadable(
        item.endDate,
      );
      item.userName = item.user.firstName + ' ' + item.user.lastName;
      return item;
    });
  }
}
