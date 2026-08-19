import { IsDefined } from 'class-validator';

export class CreateLiveKitDto {

  @IsDefined()
      roomName: string;

  @IsDefined()
      participantName: string

}
