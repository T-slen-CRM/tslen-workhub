import { Controller, Post, Body, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { CreateLiveKitDto } from './dto/create-live-kit.dto';

interface LiveKitTokenMicroservice {
  LiveKitToken(data: { roomName: string; participantName: string }): Observable<{ token: string }>;
}

@Controller('api')
export class LiveKitTokenController implements OnModuleInit {
    private livekitService: LiveKitTokenMicroservice;

    constructor (@Inject('LIVEKIT_PACKAGE') private readonly client: ClientGrpc) {}

    onModuleInit () {
        this.livekitService = this.client.getService<LiveKitTokenMicroservice>('LiveKitMicroservice');
    }

  @Post('token')
    async getToken (@Body() body: CreateLiveKitDto) {
        const obs = this.livekitService.LiveKitToken(body);
        const response = await lastValueFrom(obs);
        return { token: response.token };
    }
}
