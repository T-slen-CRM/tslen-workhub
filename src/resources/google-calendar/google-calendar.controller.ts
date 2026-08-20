import { Controller, Param, Delete, Get, ParseIntPipe } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendar } from './entities/google-calendar.entity';
import { DeleteResult } from 'typeorm';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';

@Controller('google-calendar')
export class GoogleCalendarController {
    constructor (
      private googleCalendarService: GoogleCalendarService
    ) {}
  @Get('authorize')
    async authorize (
      @User() user: Users
    ): Promise<GoogleCalendar> {
        return this.googleCalendarService.authorize(user);
    }

  @Delete(':id')
  async remove (@Param('id', ParseIntPipe) id: number, @User() user: Users): Promise<DeleteResult> {
      return this.googleCalendarService.remove(id, user);
  }
  @Get('create-google-meeting')
  async createMeetingSpace (@User() user: Users): Promise<{ uri: string }> {
      return await this.googleCalendarService.createMeetingSpace(user);
  }
}
