import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AlertComponent implements OnInit {
  @Input() type: string;
  @Input() dismiss: string;

  public dismissAlert(element) {
    element.parentElement.removeChild(element);
  }

  constructor() {}

  ngOnInit() {}
}
