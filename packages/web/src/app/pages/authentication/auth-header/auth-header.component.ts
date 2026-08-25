import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'app-auth-header',
  templateUrl: './auth-header.component.html',
  styleUrls: ['./auth-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AuthHeaderComponent implements OnInit {
  @Input() signTitle: string;
  @Input() signRouterLink: string[];

  constructor() {}

  ngOnInit(): void {}
}
