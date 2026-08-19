import {Component, Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import {IProgressInfo} from "./interface/progressbar";
@Component({
    selector: 'app-progressbar-bootstrap',
    imports: [CommonModule],
    templateUrl: './progressbar-bootstrap.component.html',
    styleUrls: ['./progressbar-bootstrap.component.scss']
})
export class ProgressbarBootstrapComponent {
  @Input() progressInfos: IProgressInfo[];
}
