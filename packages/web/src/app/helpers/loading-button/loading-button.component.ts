import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-button',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  templateUrl: './loading-button.component.html',
  styleUrl: './loading-button.component.scss',
})
export class LoadingButtonComponent {
  public loading = input(false);
}
