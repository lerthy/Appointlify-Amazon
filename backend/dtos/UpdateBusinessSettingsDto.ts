import { IsOptional, IsString, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class UpdateBusinessSettingsDto {
  @IsOptional()
  @IsString()
  business_name?: string;

  @IsOptional()
  @IsString()
  business_hours?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  allow_online_booking?: boolean;

  @IsOptional()
  @IsNumber()
  advance_booking_days?: number;

  @IsOptional()
  @IsObject()
  notification_settings?: Record<string, any>;
}

