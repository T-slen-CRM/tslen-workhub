import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { LiveKitGrpcService } from './live-kit.grpc.service';
import { CreateLiveKitDto } from '../dto/create-live-kit.dto';
import { WebhookDto } from '../dto/webhook.dto';

@Controller()
export class LiveKitGrpcController {
    constructor (private service: LiveKitGrpcService){}
  @GrpcMethod('LiveKitMicroservice', 'LiveKitToken')
    async liveKitToken (data: CreateLiveKitDto) {
        return this.service.serviceGrpc(data)
    }

  @GrpcMethod('LiveKitMicroservice', 'LivekitWebhook')
  livekitWebhook (data: WebhookDto) {
      console.log('data', data)
      return {
          success:'r'
      };
  }
}
