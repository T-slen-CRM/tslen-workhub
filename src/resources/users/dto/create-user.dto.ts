import { IsDate, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '../../../common/guards/roles/role.enum';
import { DaysOffEntityDto } from '../../company-days-off-rules/dto/daysOffEntity.dto';
import { CreateEventsByUserDto } from 'src/resources/events-by-user/dto/create-events-by-user.dto';
import { CreateGoogleCalendarDto } from '../../google-calendar/dto/create-google-calendar.dto';
import { UserRelationToGroupDto } from './userRelationToGroup.dto';
import { UserChiefRelationEntityDto } from './userChiefRelationEntity.dto';
import { UserProbationDto } from './userProbation.dto';
import { CreateJobPositionDto } from 'src/resources/job-position/dto/create-job-position.dto';
import { TaskUserAssignmentDto } from 'src/resources/tasks/dto/taskUserAssignment.dto';
import { TaskProjectPermissionDto } from 'src/resources/task-project/dto/taskProjectPermission.dto';
import { IUserGooglePermissions } from '../../auth/auth.service';


export class CreateUserDto{
    id: number;

  @IsOptional()
      language: string;

  @IsOptional()
      role: Role;

  @IsOptional()
      firstName: string;

  @IsOptional()
      lastName: string;

  @IsOptional()
      email: string;

  @IsOptional()
      country: string;

  @IsOptional()
      password: string;

  @IsOptional()
      avatar: string;

  @IsOptional()
      company: string;

  @IsOptional()
      address: string;

  @IsOptional()
      phone: string;

  @IsOptional()
      skype: string;

  @IsOptional()
      emailSpare: string;

  @IsOptional()
      tokenActivation: string;

  @IsOptional()
      tokenReset: string;

  @IsOptional()
      isActive: number;

  @IsOptional()
      companyId: number;

  @IsOptional()
      chiefId: number;

  @IsOptional()
      mentorId: number;

  @IsOptional()
      birthDay: Date;

  @IsOptional()
      firstDayInCompany: Date;

  @IsOptional()
  @Transform(({ value }) => !value ? null : new Date(value))
  @IsDate()
      lastDayInCompany: Date | null;

  @IsOptional()
      jobPosition: string;

  @IsOptional()
      userRelationToGroups: UserRelationToGroupDto[];

  @IsOptional()
      daysOff: DaysOffEntityDto[];

  @IsOptional()
      eventsByUsers: CreateEventsByUserDto[];

  @IsOptional()
      eventsByUsersRequest: CreateEventsByUserDto[];

  @IsOptional()
      userChiefRelationsByChief: UserChiefRelationEntityDto[];

  @IsOptional()
      userChiefRelations: UserChiefRelationEntityDto[];

  @IsOptional()
      taskProjectPermissions: TaskProjectPermissionDto[];

  @IsOptional()
      googleCalendars: CreateGoogleCalendarDto;

  @IsOptional()
      userProbation: UserProbationDto;

  @IsOptional()
      jobPositionDetails: CreateJobPositionDto[];

  @IsOptional()
      taskUserAssignmentRelations: TaskUserAssignmentDto[];

  @IsOptional()
      lastLogin: Date | null;

  @IsOptional()
  @IsNumber()
      loginCount: number | null;

  @IsOptional()
      googlePermissions: IUserGooglePermissions;

}
