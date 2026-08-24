import {
  Component,
  Input,
  OnInit,
  ViewEncapsulation,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'app-animation-modal',
  templateUrl: './animation-modal.component.html',
  styleUrls: ['./animation-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AnimationModalComponent implements OnInit {
  @Input() modalClass: string;
  @Input() contentClass: string;
  @Input() modalID: string;
  @Input() backDrop = false;

  public close(event) {
    document.querySelector('#' + event).classList.remove('md-show');
  }

  constructor() {}

  ngOnInit() {}
}
