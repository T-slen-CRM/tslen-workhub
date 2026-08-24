import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { DataService } from '../../../services/data.service';
import { UploadCreativeModalComponent } from '../../../components/upload-creative-modal/upload-creative-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';
import {
  AuthData,
  AuthenticationService,
} from '../../../services/auth.service';
import { Router } from '@angular/router';
import { BehaviorSubject, forkJoin, Subscription } from 'rxjs';
import { decrypt, encrypt } from '../../../helpers/crypto';
import { IDaysOffValue } from '../../../interfaces/daysOff';
import { IGoogleCalendarData } from '../../../interfaces/google-api';
import { IUploadService } from '../../../services/upload/upload';
import { UserPhotoSingleUploadService } from '../../../services/upload/user-photo-single-upload.service';
import { IJobPosition } from '../user-job-position/job-positionin-interface';
import { IEvent } from '../../../interfaces/events';
import { ImageService } from '../../../services/image.service';
import { ConfigurationService } from '../../../services/ConfigurationService';
import { viewport } from '@popperjs/core';
import { LanguageService } from 'src/app/language/language.service';
import { IUserGooglePermissions } from 'src/app/services/auth.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  providers: [
    {
      provide: IUploadService,
      useClass: UserPhotoSingleUploadService,
    },
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class UserProfileComponent implements OnInit, OnDestroy {
  userId: number;
  form: FormGroup;
  changePasswordForm: FormGroup;
  submitted: boolean;
  loading: boolean;
  loadingBeforeData: boolean;
  message: string;
  defaultUserAvatar = '';
  headerRoutes = [
    { value: 'Update profile', url: '', type: 'last', params: {} },
  ];
  mainHeaderPage: string;
  private randomPassword: string;
  private authData: AuthData;
  private subscription$: Subscription;
  public userRoles = ['user', 'manager'];
  public userRole: string;
  public routerId: number;
  public userGroups: object[];
  public usersByCompany: any;
  private companyId: number;
  private hashPassword: string;
  @Output() userChanges: EventEmitter<boolean> = new EventEmitter<boolean>();
  public userDaysOff: IDaysOffValue;
  public savedForm$ = new BehaviorSubject<IDaysOffValue>({} as IDaysOffValue);
  public googleCalendarData$ = new BehaviorSubject<IGoogleCalendarData>(
    {} as IGoogleCalendarData,
  );

  public acceptedFileTypes = `image/png, image/jpeg`;

  public jobPositions: IJobPosition[] = [];
  //TODO add interface
  public eventsByUserRequest: IEvent[];
  public userAvatar: any;
  hidePassword = true;
  hideConfirmPassword = true;
  public googlePermissions: IUserGooglePermissions;

  @Input() set inputUserGroups(value: any) {
    if (this.userGroups && value) {
      this.userGroups = [...this.userGroups, value];
    }
  }
  @Input() set inputJobPositions(value: any) {
    if (this.jobPositions && value) {
      this.jobPositions = [...this.jobPositions, value];
    }
  }

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    public dialog: MatDialog,
    private toastr: ToastrService,
    private authService: AuthenticationService,
    private router: Router,
    public translateService: LanguageService,
  ) {
    this.defaultUserAvatar = '/assets/images/profile/default.png';
    this.authData = this.authService.authDataSignal();
    this.googlePermissions = this.authData.googlePermissions;
    this.userId = this.authData.id;
    this.userRole = this.authData.role;
    this.companyId = this.authData.companyId;
    this.subscription$ = new Subscription();
  }

  ngOnDestroy(): void {
    this.subscription$.unsubscribe();
  }
  loadTranslations(): void {
    this.translateService
      .get(['people.profile.name', 'people.profile.update_profile'])
      .subscribe((translatedValue: string) => {
        this.mainHeaderPage = translatedValue['people.profile.name'];
        this.headerRoutes[0].value =
          translatedValue['people.profile.update_profile'];
      });
  }

  ngOnInit(): void {
    this.loadTranslations();
    this.translateService.onLangChange.subscribe(() => this.loadTranslations());
    this.routerId = parseInt(this.router.url.split('/').pop(), 10);
    this.createDefaultFormGroup();
    if (this.routerId) {
      this.getUserData(this.routerId);
    } else {
      this.getDateForNewUser();
    }
    this.randomPassword = Math.random().toString(36).slice(-16);
  }
  onSubmit() {
    this.submitted = true;
    this.message = null;
    if (this.form.invalid) {
      return;
    } else {
      // this.passwordCryptoConvert('encrypt');
      this.loading = true;
      if (this.routerId) {
        this.updateUser();
      } else {
        this.saveUser();
      }
    }
  }
  changePassword() {
    this.submitted = true;
    this.message = null;
    if (this.changePasswordForm.invalid) {
      return;
    } else {
      this.form.addControl(
        'password',
        new FormControl(this.changePasswordForm.get('password').value),
      );
      this.updateUser();
    }
  }
  openUploadDialog(): void {
    const dialogRef = this.dialog.open(UploadCreativeModalComponent, {
      width: '50%',
      position: { top: '20%', left: '30%' },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.fileName) {
        const fileUrl =
          environment.ftpDomain +
          this.authData.companyId +
          '-' +
          this.authData.userId +
          '-' +
          result.fileName;
        this.form.get('avatar').patchValue(fileUrl);
      }
    });
  }
  getDateForNewUser() {
    this.loadingBeforeData = true;
    const getUser: Subscription = forkJoin([
      this.dataService.getObservableData('/groups'),
      this.dataService.getObservableData('/users'),
      this.dataService.getObservableData('/job-position'),
    ]).subscribe((response) => {
      const allGroups: object = response[0];
      this.usersByCompany = response[1];
      this.jobPositions = response[2];
      if (Array.isArray(allGroups)) {
        this.userGroups = allGroups;
      } else {
        this.userGroups = [allGroups];
      }
      this.loadingBeforeData = false;
    });
    this.subscription$.add(getUser);
  }
  getUserData(id: number) {
    this.loadingBeforeData = true;
    const getUser: Subscription = forkJoin([
      this.dataService.getObservableData('/users/' + id),
      this.dataService.getObservableData('/groups'),
      this.dataService.getObservableData('/users'),
      this.dataService.getObservableData('/job-position'),
    ]).subscribe((response) => {
      const userData: any = response[0];
      this.userDaysOff = userData?.daysOff;
      const userGroupId: any = userData?.userRelationToGroups[0]?.groupId;
      const userChiefId: any = userData?.userChiefRelations[0]?.chiefId;
      const allGroups: object = response[1];
      this.usersByCompany = response[2];
      this.jobPositions = response[3];
      if (Array.isArray(allGroups)) {
        this.userGroups = allGroups;
      } else {
        this.userGroups = [allGroups];
      }
      this.form.patchValue(userData);
      if (userGroupId) {
        this.form.get('userGroups').patchValue(userGroupId);
      }
      if (userChiefId) {
        this.form.get('chiefId').patchValue(userChiefId);
      }
      this.form
        .get('userProbation')
        .get('isProbation')
        .valueChanges.subscribe((value) => {
          if (value === false) {
            // reset probation
            this.form.get('userProbation').get('start').patchValue(null);
            this.form.get('userProbation').get('end').patchValue(null);
          }
        });
      // this.passwordCryptoConvert('decrypt');
      this.loadingBeforeData = false;
      // google calendar
      if (userData?.googleCalendars?.calendarId) {
        this.googleCalendarData$.next(userData.googleCalendars);
      }
      this.eventsByUserRequest = userData?.eventsByUsersRequest;

      this.userAvatar = response[0].avatar;
    });
    this.subscription$.add(getUser);
  }
  createDefaultFormGroup() {
    this.form = this.fb.group({
      id: null,
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      // email: ['', Validators.required],
      // password: [this.randomPassword, Validators.required],
      country: [''],
      company: [''],
      address: [],
      phone: [],
      skype: [],
      emailSpare: [],
      avatar: [this.defaultUserAvatar],
      role: ['user'],
      createdAt: [],
      updatedAt: [],
      userRelationToGroups: [],
      userGroups: [],
      chiefId: [],
      mentorId: [],
      userChiefRelations: [],
      jobPosition: [],
      birthDay: [],
      firstDayInCompany: [],
      lastDayInCompany: [],
      daysOff: [],
      companyId: this.companyId,
      isActive: 1,
    });
    this.form.addControl(
      'userProbation',
      new FormGroup({
        id: new FormControl(),
        userId: new FormControl(),
        start: new FormControl(),
        end: new FormControl(),
        isProbation: new FormControl(0),
        isChanged: new FormControl(0),
      }),
    );
    if (!this.routerId) {
      this.form.addControl(
        'email',
        new FormControl('', [Validators.required, Validators.email]),
      );
      this.form.addControl(
        'password',
        new FormControl(this.randomPassword, [Validators.required]),
      );
    }
    this.changePasswordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
      },
      {
        validators: [this.requireConfirmPassword],
      },
    );
  }
  requireConfirmPassword(form: FormGroup) {
    if (form.get('password').value !== form.get('confirmPassword').value) {
      return { requireConfirmPassword: true };
    }
    return null;
  }
  saveUser() {
    this.form.get('createdAt').patchValue(new Date());
    this.setUserGroups();
    this.setChiefId();
    const save: Subscription = this.dataService
      .postData('/users', { ...this.form.value })
      .subscribe((response) => {
        this.loading = false;
        this.userChanges.emit(true);
        this.toastr.success('User`s settings has been saved', 'Saved');
      });
    this.subscription$.add(save);
  }
  updateUser() {
    this.form.get('updatedAt').patchValue(new Date());
    this.setUserGroups();
    this.setChiefId();
    this.setDaysOff();
    const update: Subscription = this.dataService
      .updateData('/users/', this.routerId, { ...this.form.value })
      .subscribe((response) => {
        this.loading = false;
        this.userChanges.emit(true);
        this.toastr.success('User`s settings has been saved', 'Saved');
      });
    this.subscription$.add(update);
  }
  passwordCryptoConvert(type: string) {
    let hash;
    const pass = this.form.value.password;
    if (type === 'encrypt') {
      hash = encrypt(pass);
      this.hashPassword = hash;
    } else {
      hash = decrypt(pass);
      this.form.get('password').patchValue(hash);
    }
  }
  setUserGroups() {
    if (this.form.value.userGroups) {
      let userRelationToGroups;
      if (
        this.form.value.userRelationToGroups &&
        this.form.value.userRelationToGroups.length > 0
      ) {
        userRelationToGroups = this.form.get('userRelationToGroups').value;
        userRelationToGroups = userRelationToGroups.map((item) => {
          item.groupId = this.form.value.userGroups;
          return item;
        });
      } else {
        userRelationToGroups = [{ groupId: this.form.value.userGroups }];
      }
      this.form.get('userRelationToGroups').patchValue(userRelationToGroups);
    }
  }
  setChiefId() {
    if (this.form.value.chiefId) {
      let userChiefRelations;
      if (
        this.form.value.userChiefRelations &&
        this.form.value.userChiefRelations.length > 0
      ) {
        userChiefRelations = this.form.get('userChiefRelations').value;
        userChiefRelations = userChiefRelations.map((item) => {
          item.chiefId = this.form.value.chiefId;
          return item;
        });
      } else {
        userChiefRelations = [
          { userId: this.userId, chiefId: this.form.value.chiefId },
        ];
      }
      this.form.get('userChiefRelations').patchValue(userChiefRelations);
    }
  }
  setDaysOff() {
    const daysOff = this.savedForm$.getValue();
    // if userDaysOff object without field is empty return
    if (daysOff && Object.keys(daysOff).length === 0) {
      return;
    }
    this.form.get('daysOff').patchValue(daysOff);
  }

  completeUpload(event: any) {
    if (event) {
      this.getUserData(this.routerId);
    }
  }
}
