import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import {
  IUserChiefRelationsObject,
  UserGeneralData,
} from '../../../interfaces/userConfig';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-on-stage',
  imports: [DatePipe, MatCardModule, NgOptimizedImage, RouterModule],
  templateUrl: './user-on-stage.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './user-on-stage.component.scss',
})
export class UserOnStageComponent {
  @Input() users: UserGeneralData[];
  @Input() userChiefRelationsObject: IUserChiefRelationsObject;
  @Input() stageType: string;
}
