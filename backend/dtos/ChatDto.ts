import { IsArray, IsObject, IsOptional, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsString()
  role!: string;

  @IsString()
  content!: string;
}

class ContextDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  services?: any[];

  @IsOptional()
  availableTimes?: string[];
}

export class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages!: MessageDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContextDto)
  context?: ContextDto;
}

