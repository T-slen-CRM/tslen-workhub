import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AlertModule, BreadcrumbModule, CardModule, ModalModule } from './components';
import { DataFilterPipe } from './components/data-table/data-filter.pipe';

import { NgClickOutsideModule} from 'ng-click-outside2';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { ApexChartComponent } from './components/chart/apex-chart/apex-chart.component';
import {ApexChartService} from './components/chart/apex-chart/apex-chart.service';
import {DarkModeButtonModule} from "./components/dark-mode-button/dark-mode-button.module";
import {MatStepperModule} from "@angular/material/stepper";
import {NotificationModalModule} from "./components/notification-modal/notification-modal.module";
import {
  PERFECT_SCROLLBAR_CONFIG,
  PerfectScrollbarConfigInterface,
  PerfectScrollbarModule
} from "ngx-perfect-scrollbar-next";

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true
};

@NgModule({
  imports: [
    CommonModule,
    PerfectScrollbarModule,
    FormsModule,
    ReactiveFormsModule,
    AlertModule,
    CardModule,
    BreadcrumbModule,
    ModalModule,
    DarkModeButtonModule,
    NotificationModalModule
  ],
  exports: [
    MatStepperModule,
    CommonModule,
    PerfectScrollbarModule,
    FormsModule,
    ReactiveFormsModule,
    AlertModule,
    CardModule,
    BreadcrumbModule,
    ModalModule,
    DataFilterPipe,
    NgClickOutsideModule,
    SpinnerComponent,
    ApexChartComponent,
  ],
  declarations: [
    DataFilterPipe,
    SpinnerComponent,
    ApexChartComponent,
  ],
  providers: [
    {
      provide: PERFECT_SCROLLBAR_CONFIG,
      useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG
    },
    ApexChartService
  ]
})
export class SharedModule { }
