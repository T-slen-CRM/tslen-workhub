import { Controller, Post, Body, Res, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Response } from 'express';
import { lastValueFrom } from 'rxjs';
import { WebhookDto } from './dto/webhook.dto';

interface LiveKitMicroservice {
  LivekitWebhook(data: { body: Buffer; authorization: string });
}

@Controller('livekit')
export class LiveKitWebhookController implements OnModuleInit {
    private livekitService: LiveKitMicroservice;
    constructor (@Inject('LIVEKIT_PACKAGE') private readonly client: ClientGrpc) {}

    onModuleInit () {
        this.livekitService = this.client.getService<LiveKitMicroservice>('LiveKitMicroservice');
    }

    @Post('webhook')
    async handleWebhook (
    @Body() dto: WebhookDto,
    @Res() res: Response): Promise<void> {
        try {
            await lastValueFrom(
                this.livekitService.LivekitWebhook({
                    body: dto.body,
                    authorization: dto.authorization,
                }));
        } catch (error) {
            console.error('gRPC error validating webhook event:', error);
        }
        res.status(200).send();
    }
}
