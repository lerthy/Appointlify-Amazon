import { IsString, IsEmail, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  @IsNotEmpty()
  business_id!: string;

  @IsUUID()
  @IsNotEmpty()
  service_id!: string;

  @IsUUID()
  @IsNotEmpty()
  employee_id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;
}

