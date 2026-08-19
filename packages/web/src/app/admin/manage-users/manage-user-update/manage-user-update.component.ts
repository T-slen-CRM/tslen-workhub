import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {DataService} from "../../../services/data.service";
import {UploadCreativeModalComponent} from "../../../components/upload-creative-modal/upload-creative-modal.component";
import {MatDialog} from "@angular/material/dialog";
import {ToastrService} from "ngx-toastr";
import {Router} from "@angular/router";

@Component({
    selector: 'app-manage-user-update',
    templateUrl: './manage-user-update.component.html',
    styleUrls: ['./manage-user-update.component.scss'],
    standalone: false
})
export class ManageUserUpdateComponent implements OnInit {
  id: number;
  userId: number;
  form: FormGroup;
  submitted = false;
  //registered = false;
  loading = false;
  message: string;
  userAvatar = '';
  headerRoutes = [{value: 'Manage users', url: '/admin/manage-users', type: 'npt-last' , params: {}}, {value: 'Update profile', url: '', type: 'last' , params: {}}];
  mainHeaderPage = 'Profile settings';

  constructor(
      private fb: FormBuilder,
      private dataService: DataService,
      public dialog: MatDialog,
      private toastr: ToastrService,
      private router: Router
  ) { }

  ngOnInit(): void {
    this.id = parseInt(this.router.url.split('/').pop(), 10);

    this.form = this.fb.group({
      id: [this.id],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', Validators.required],
      country: [''],
      company: [''],
      address: [],
      phone: [],
      skype: [],
      emailSpare: [],
    });
    this.dataService.getOneUser(this.id).subscribe(response =>{
      const body = response.body;
      this.userId = body['id'];
      if (body['avatar']){
        this.userAvatar = body['avatar'];
      } else {
        this.userAvatar ='/assets/images/profile/default.png'
      }
      this.form.patchValue(body);
    })

  }
  onSubmit(){
    this.submitted = true;
    this.message = null;
    if (this.form.invalid) {
      return;
    }else {
      this.loading = true;
      //update/:id
      this.dataService.updateData('/users/', this.userId, this.form.value).subscribe((response) => {
        this.loading = false;
        //{positionClass: 'toast-top-right', closeButton: true, timeOut: 5000}
        this.toastr.success('User`s settings has been saved', 'Saved');
        if (response.status === 201) {
          //this.registered = true;
        }
       // window.location.reload;
      });
    }
  }
  openUploadDialog(): void {
    const dialogRef = this.dialog.open(UploadCreativeModalComponent, {
      width: '50%',
      position:{ top: '20%', left: '30%' },
      data: {uploadType: 'user-photo'}
      //height: '50%',
    });
  }

}
