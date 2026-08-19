import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class WebhookDto {
  @Transform(({ value }) => Buffer.from(value, 'base64'))
      body: Buffer;

  @IsString()
  @IsNotEmpty()
      authorization: string;
}
