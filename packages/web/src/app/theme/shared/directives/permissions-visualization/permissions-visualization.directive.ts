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

      if (!permissions.includes(role)) {
        this.viewContainer.clear();
      } else {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    }
  }
}
