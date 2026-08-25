import {
  Component,
  OnInit,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AuthData, AuthenticationService } from '../../services/auth.service';

@Component({
  selector: 'app-custom-header-page',
  templateUrl: './custom-header-page.component.html',
  styleUrls: ['./custom-header-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CustomHeaderPageComponent implements OnInit {
  @Input() headerRoutes: any;
  @Input() mainHeader: string;
  public isManager: boolean;
  public userId: number;
  public authData: AuthData;
  constructor(private AuthService: AuthenticationService) {}

  ngOnInit(): void {
    this.authData = this.AuthService.authData;
    this.isManager = this.authData.userRole === 'manager';
    this.userId = this.authData.userId;
  }
}
