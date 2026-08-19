import {Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {DataService} from "../../../../../services/data.service";
import {ToastrService} from "ngx-toastr";
import {Notifications} from "../../../../../interfaces/notifications";
import {NotificationService} from "../../../../../services/notification.service";
import {Subscription, take} from "rxjs";

@Component({
    selector: 'app-notification-form',
    templateUrl: './notification-form.component.html',
    styleUrls: ['./notification-form.component.scss'],
    standalone: false
})
export class NotificationFormComponent implements OnInit {
  public form: FormGroup;
  public loading: boolean;
  @Input() usersData: any;
  private subscriptions: Subscription;

  constructor(
      private fb: FormBuilder,
      private dataService: DataService,
      private toastr: ToastrService,
      private notificationService: NotificationService
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      message: ['', Validators.required]
    });
    this.subscriptions = new Subscription();
  }

  ngOnDestroy(){
    this.subscriptions.unsubscribe();
  }

  ngOnInit(): void {
  }

  createNotification(){
    if (this.form.invalid) {
      return;
    } else {
      this.loading = true;
      const data: Notifications = this.notificationService.prepareNotificationsForAllUsers(this.form.value, this.usersData);
      const createNotification: Subscription = this.dataService.postData('/notifications/create', data)
          .pipe(take(1))
          .subscribe(res => {
        this.loading = false;
        if (res.status === 200){
          this.form.patchValue({title: '', message: ''});
          this.toastr.success('Notification was created!', 'Saved');
        } else {
          this.toastr.warning('Something went wrong!', 'Alert');
        }
      });
      this.subscriptions.add(createNotification);
    }
  }

}
