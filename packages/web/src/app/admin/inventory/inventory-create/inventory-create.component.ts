import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';

import { ComponentsModule } from '../../../components/components.module';
import { DateTimeInputComponent } from '../../../feature/date-time-input/date-time-input.component';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { UnsubscribeOnDestroyAdapter } from '../../../helpers/UnsubscribeOnDestroyAdapter';
import { IUsers } from '../interfaces/inventory';
import { InventoryService } from '../services/inventory.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-inventory-create',
  imports: [
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
  templateUrl: './inventory-create.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './inventory-create.component.scss',
})
export class InventoryCreateComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit
{
  public title: string;
  public text: string;
  public form: FormGroup;
  public usersList: IUsers[] = [];
  private inventoryService = inject(InventoryService);
  private toastr = inject(ToastrService);
  private router = inject(Router);

  ngOnInit(): void {
    this.form = this.inventoryService.getCreateInventoryForm();
    this.getUsersData();
  }
  saveInventory() {
    this.inventoryService
      .saveInventory(this.form.value)
      .subscribe((response: any) => {
        if (response.status === 201) {
          this.toastr.success('Inventory created successfully');
          this.router.navigate(['/admin/inventory']);
        } else {
          this.toastr.error('Inventory creation failed');
        }
      });
  }
  getUsersData() {
    const allUsers = this.inventoryService
      .getAllUsers()
      .subscribe((response: IUsers[]) => {
        this.usersList = response;
      });
    this.subscription.add(allUsers);
  }
}
