import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading-logo',
  templateUrl: './loading-logo.component.html',
  styleUrls: ['./loading-logo.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class LoadingLogoComponent {
  public imagePath = input('/assets/images/.png');
  public isLoading = input(false);
  public bar = input(false);
}
