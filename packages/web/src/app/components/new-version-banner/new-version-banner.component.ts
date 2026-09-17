import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppVersionService } from '../../services/app-version.service';

// Persistent, dismissible shell banner - never a forced reload, since this
// app has live LiveKit calls in progress that a surprise refresh would
// kill (see AppVersionService for how a redeploy is detected). Rendered
// unconditionally in AdminComponent's shell, alongside the global loading
// bar - the app's existing pattern for always-mounted cross-cutting UI.
@Component({
  selector: 'app-new-version-banner',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="new-version-banner">
        <span>{{ 'newVersionBanner.message' | translate }}</span>
        <button type="button" class="new-version-banner-refresh" (click)="refresh()">
          {{ 'newVersionBanner.refresh' | translate }}
        </button>
        <button type="button" class="new-version-banner-close" [attr.aria-label]="'newVersionBanner.dismiss' | translate" (click)="dismiss()">
          &times;
        </button>
      </div>
    }
  `,
  styles: [`
    .new-version-banner {
      position: fixed;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      z-index: 2000;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: #323232;
      color: #fff;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      font-size: 14px;
    }
    .new-version-banner-refresh {
      color: #8ab4ff;
      background: none;
      border: none;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }
    .new-version-banner-close {
      color: #fff;
      background: none;
      border: none;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
    }
  `],
})
export class NewVersionBannerComponent {
  private appVersionService = inject(AppVersionService);
  private dismissed = signal(false);

  visible = computed(() => this.appVersionService.newVersionAvailable() && !this.dismissed());

  refresh(): void {
    window.location.reload();
  }

  dismiss(): void {
    this.dismissed.set(true);
  }
}
