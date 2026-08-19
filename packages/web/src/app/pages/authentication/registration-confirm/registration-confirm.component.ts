import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {DataService} from '../../../services/data.service';

@Component({
    selector: 'app-registration-confirm',
    templateUrl: './registration-confirm.component.html',
    styleUrls: ['./registration-confirm.component.scss'],
    standalone: false
})
export class RegistrationConfirmComponent implements OnInit {
  hash = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
  ) { }

  ngOnInit(): void {
    this.hash = this.route.snapshot.paramMap.get('hash');
    this.loading = true;
    this.dataService.confirmEmail(this.hash).subscribe(
      (response) => {
        if ( response.status === 200 ) {
          this.loading = false;
          localStorage.setItem('isLoggedIn', 'true');
          // localStorage.setItem('token', response.body['userEmail']);
          // localStorage.setItem('balance', response.body['balance']);
          this.router.navigate(['campaigns/create']).catch();
        }
      });
  }

}
