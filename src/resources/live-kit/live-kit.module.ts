import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { LiveKitGrpcController } from './microservice/live-kit.grpc.controller';
import { LiveKitGrpcService } from './microservice/live-kit.grpc.service';
import { LiveKitTokenController } from './live-kit-token.controller';
import { LiveKitWebhookController } from './live-kit-webhook.controller';
import { LiveKitGateway } from './gateway/live-kit.gateway';
import { JwtService } from '@nestjs/jwt';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'LIVEKIT_PACKAGE',
                transport: Transport.GRPC,
                options: {
                    package: 'livekit',
                    protoPath: join(process.cwd(), 'proto/live-kit.proto'),
                    url: process.env.LIVE_KIT_SERVER
                },
            },
        ]),
    ],
    controllers: [LiveKitTokenController, LiveKitGrpcController, LiveKitWebhookController],
    providers: [LiveKitGrpcService, LiveKitGateway, JwtService],
    exports: [LiveKitGateway],
})
export class LiveKitModule {}
