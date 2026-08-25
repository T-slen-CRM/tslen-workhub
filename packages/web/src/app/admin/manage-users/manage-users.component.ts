import {
  Component,
  ComponentRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DataService } from '../../services/data.service';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';
import { ThemeService } from '../../services/theme.service';
import { ManageUsersAggridComponent } from '../../components/manage-users-aggrid/manage-users-aggrid.component';
import { Subscription } from 'rxjs';
import { UserGroupComponent } from '../../pages/users/user-group/user-group.component';
import { AuthData, AuthenticationService } from '../../services/auth.service';
import {
  IUserChiefRelationsObject,
  UserGeneralData,
} from '../../interfaces/userConfig';
import { PermissionsVisualizationDirective } from '../../theme/shared/directives/permissions-visualization/permissions-visualization.directive';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { UserOnStageComponent } from '../../feature/users/user-on-stage/user-on-stage.component';
import { UsersModule } from '../../pages/users/users.module';
import { UserJobPositionComponent } from '../../pages/users/user-job-position/user-job-position.component';
import { ComponentsModule } from '../../components/components.module';
import { CardModule } from '../../theme/shared/components';
import { NgIf } from '@angular/common';
import { IJobPosition } from '../../pages/users/user-job-position/job-positionin-interface';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TranslateModule,
    PermissionsVisualizationDirective,
    MatTabsModule,
    MatButtonModule,
    UserOnStageComponent,
    UsersModule,
    UserJobPositionComponent,
    ComponentsModule,
    CardModule,
    NgIf,
  ],
})
export class ManageUsersComponent implements OnInit, OnDestroy {
  @ViewChild('usersAgGridComp') usersAgGridComp: ManageUsersAggridComponent;
  @ViewChild('groupsAgGrid', { read: ViewContainerRef })
  groupsAgGrid: ViewContainerRef;
  private groupsAgGridComponentRef: ComponentRef<UserGroupComponent>;
  public preparedUsersData: UserGeneralData[];

  public usersOnProbation!: UserGeneralData[];
  public usersOnLayOff!: UserGeneralData[];
  public usersOnBoarding!: UserGeneralData[];

  selectedUser: any;
  selectedUserId: any;
  loading: boolean;
  private subscription: Subscription;
  private authService = inject(AuthenticationService);
  // public userChiefRelationsObject: IUserChiefRelationsObject;
  userGroups: any;
  jobPositions: any;

  constructor(
    private dataService: DataService,
    private toastr: ToastrService,
    private userService: UserService,
  ) {
    this.subscription = new Subscription();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngOnInit(): void {
    this.loading = true;
    const getUsers: Subscription = this.dataService
      .getAllUsers()
      .subscribe((response) => {
        const body = response.body as UserGeneralData[];
        this.preparedUsersData = this.addUserGroupValue(body);

        this.usersOnProbation = this.filterOnProbationUsers(
          this.preparedUsersData,
        );
        this.usersOnLayOff = this.filterOnLayOffUsers(this.preparedUsersData);
        this.usersOnBoarding = this.filterOnBoardingUsers(
          this.preparedUsersData,
        );

        this.selectedUser = this.prepareSelectedUser(body);
        this.selectedUserId = this.selectedUser[0]?.value;
        this.loading = false;
      });
    this.subscription.add(getUsers);
  }

  prepareSelectedUser(data: any) {
    return data.filter((item: any) => {
      return item.currentUser;
    });
  }
  getSelectedValues(event) {
    this.selectedUserId = event.data[0]?.value;
  }
  changeUser() {
    this.loading = true;
    this.dataService
      .getObservableData('/auth/change-user/' + this.selectedUserId)
      .subscribe((response) => {
        if (response.accessToken && response.user) {
          localStorage.setItem('jwtToken', response.accessToken);
          const user = response.user as AuthData;
          ///this.themeService.setThemeColor(!!response.body['useDarkTheme']);
          this.toastr.success('Current user has been changed', 'Changed');
          this.userService.setUserFirstName(user.firstName);
          this.userService.setUserLastName(user.lastName);
          this.userService.setUserId(user.id);
          this.authService.updateAuthDataSignal(user);
        } else {
          this.toastr.warning('Something went wrong', 'Alert');
        }
        this.loading = false;
      });
  }
  actionAfterSavingUser() {
    this.usersAgGridComp?.loadColumnDefs();
  }
  // loadGroupsAgGridComponent(){
  //   this.loading = true;
  //   this.groupsAgGrid.clear();
  //   this.groupsAgGridComponentRef = this.groupsAgGrid.createComponent(UserGroupComponent);
  //   this.loading = false;
  // }
  // onTabChanged(event){
  //   const index = event.index;
  //   if (index === 2){
  //     this.loadGroupsAgGridComponent();
  //   }
  // }
  prepareUserChiefRelationsObject(preparedUsersData: UserGeneralData[]) {
    const usersObjectFromEntries = Object.fromEntries(
      this.preparedUsersData.map((user: any) => [user.email, user]),
    );

    return preparedUsersData.reduce(
      (
        previousValue: IUserChiefRelationsObject,
        currentValue: UserGeneralData,
      ) => {
        const userChiefRelations = currentValue.userChiefRelations;
        const currentUserId = currentValue.id;
        if (userChiefRelations && Array.isArray(userChiefRelations)) {
          userChiefRelations.forEach((relation: any) => {
            const chiefEmail = relation.chiefEmail;
            if (!usersObjectFromEntries[chiefEmail]) {
              return;
            }
            const chiefName =
              usersObjectFromEntries[chiefEmail].firstName +
              ' ' +
              usersObjectFromEntries[chiefEmail].lastName;
            const chiefId = usersObjectFromEntries[chiefEmail].id;
            if (!previousValue[currentUserId]) {
              previousValue[currentUserId] = [
                { chiefEmail, chiefName, chiefId },
              ];
            } else {
              previousValue[currentUserId].push({
                chiefEmail,
                chiefName,
                chiefId,
              });
            }
          });
        }
        return previousValue;
      },
      {} as IUserChiefRelationsObject,
    );
  }
  filterOnProbationUsers(preparedUsersData) {
    return preparedUsersData.filter((user: any) => {
      if (!user.userProbation) {
        return false;
      }
      const startProbationDate = new Date(user.userProbation.start);
      const endProbationDate = new Date(user.userProbation.end);
      return startProbationDate <= new Date() && endProbationDate > new Date();
    });
  }
  addUserGroupValue(body: UserGeneralData[]) {
    return Array.isArray(body)
      ? body.map((user: UserGeneralData) => {
          user.group = user.firstName + ' ' + user.lastName + ' #' + user.id;
          user.value = user.id;
          return user;
        })
      : [];
  }
  filterOnLayOffUsers(preparedUsersData: UserGeneralData[]) {
    return preparedUsersData.filter((user: UserGeneralData) => {
      return (
        user.lastDayInCompany && new Date(user.lastDayInCompany) > new Date()
      );
    });
  }
  filterOnBoardingUsers(preparedUsersData: UserGeneralData[]) {
    return preparedUsersData.filter((user: UserGeneralData) => {
      return (
        user.firstDayInCompany && new Date(user.firstDayInCompany) > new Date()
      );
    });
  }
  addedUserGroup(userGroups: any) {
    this.userGroups = userGroups;
  }
  addedJobPosition(jobPositions: IJobPosition) {
    this.jobPositions = jobPositions;
  }
}
