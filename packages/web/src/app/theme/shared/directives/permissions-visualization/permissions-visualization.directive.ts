import {Directive, Input, ViewContainerRef, inject, TemplateRef} from '@angular/core';
import { AuthenticationService } from "../../../../services/auth.service";

@Directive({
  selector: '[appPermissionsVisualization]',
  standalone: true,
})
export class PermissionsVisualizationDirective{
  private authService = inject(AuthenticationService);
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  @Input() public set appPermissionsVisualization (permissions: string[]) {
    if (permissions.length) {
      const role = this.authService.authDataSignal().role;
      const shouldShow = permissions.includes(role);
      const isShown = this.viewContainer.length > 0;

      // Inline array literals in the template (e.g. *appPermissionsVisualization="['admin']")
      // create a new array reference on every change-detection cycle, so this setter fires far
      // more often than "permissions actually changed" - guard against re-creating (or
      // re-clearing) a view that's already in the right state, since createEmbeddedView doesn't
      // dedupe on its own and would otherwise stack up duplicate views on every CD cycle.
      if (shouldShow && !isShown) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      } else if (!shouldShow && isShown) {
        this.viewContainer.clear();
      }
    }
  }
}
