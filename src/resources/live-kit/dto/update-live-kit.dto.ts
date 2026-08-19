import { PartialType } from '@nestjs/mapped-types';
import { CreateLiveKitDto } from './create-live-kit.dto';

export class UpdateLiveKitDto extends PartialType(CreateLiveKitDto) {}
