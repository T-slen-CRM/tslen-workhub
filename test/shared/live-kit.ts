import { CreateLiveKitDto } from "src/resources/live-kit/dto/create-live-kit.dto";
import { WebhookDto } from "src/resources/live-kit/dto/webhook.dto";

export const dto: CreateLiveKitDto = {
    roomName: 'test-room',
    participantName: 'test-user',
};

export const webhook: WebhookDto = {
    body: Buffer.from("Hello world"),
    authorization: "Bearer my-secret-token"
};