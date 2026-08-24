import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IProgressInfo } from './interface/progressbar';
@Component({
  selector: 'app-progressbar-bootstrap',
  imports: [CommonModule],
  templateUrl: './progressbar-bootstrap.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./progressbar-bootstrap.component.scss'],
})
export class ProgressbarBootstrapComponent {
  @Input() progressInfos: IProgressInfo[];
}
