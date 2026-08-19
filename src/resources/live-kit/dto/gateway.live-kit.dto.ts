import { IsNumber, IsString } from 'class-validator';

export class UserIdDto {
  @IsNumber()
      userId: string;
}

export class IncomingCallDto {
  @IsNumber()
      callerId: string;

  @IsString()
      callerName: string;

  @IsString()
      callerLastName: string;

  @IsNumber()
      calleeId: string;

  @IsString()
      img: string;
}

export class CallConnectionDto {
  @IsNumber()
      calleeId: string;

  @IsNumber()
      callerId: string;
}


