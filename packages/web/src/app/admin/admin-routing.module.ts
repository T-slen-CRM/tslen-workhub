import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {ManageUserUpdateComponent} from "./manage-users/manage-user-update/manage-user-update.component";
import {PendingComponent} from "./pending/pending.component";
import {InventoryComponent} from './inventory/inventory.component';
import {InventoryCreateComponent} from './inventory/inventory-create/inventory-create.component';
import {InventoryUpdateComponent} from './inventory/inventory-update/inventory-update.component';
import {RoleGuard} from '../guards/role.guard';

const routes: Routes = [
  {
    path: '',
    children: [
        // {
        //   path: 'manage-users', component: ManageUsersComponent, data: { animation: 'ManageUsersComponent'}
        // },
        {
          path: 'manage-user-update/:id', component: ManageUserUpdateComponent, data: { animation: 'ManageUserUpdateComponent'}
        },
        {
          path: 'pending', component: PendingComponent, data: { animation: 'PendingComponent'}
        },
        {
            path: 'company-rules',
            loadComponent: () => import('./company-rules/company-rules.component').then(module => module.CompanyRulesComponent),
        },
        {
            path: 'inventory',
            component: InventoryComponent,
            data: { animation: 'InventoryComponent'}
        },
        {
            path: 'inventory-create',
            component: InventoryCreateComponent,
            data: { animation: 'InventoryCreateComponent'}
        },
        {
            path: 'inventory-update/:id',
            component: InventoryUpdateComponent,
            data: { animation: 'InventoryUpdateComponent'}
        },
        {
            path: 'audit-log',
            loadComponent: () => import('./audit-log/audit-log.component').then(module => module.AuditLogComponent),
            canActivate: [RoleGuard],
            data: { roles: ['admin'] },
        }
      ],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
