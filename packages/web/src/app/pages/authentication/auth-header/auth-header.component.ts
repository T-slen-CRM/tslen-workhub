import {Component, Input, OnInit} from '@angular/core';

@Component({
    selector: 'app-auth-header',
    templateUrl: './auth-header.component.html',
    styleUrls: ['./auth-header.component.scss'],
    standalone: false
})
export class AuthHeaderComponent implements OnInit {
  @Input('signTitle') signTitle: string;
  @Input('signRouterLink') signRouterLink: string[];

  constructor() { }

  ngOnInit(): void {
  }

}
