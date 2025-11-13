import { IsUUID, IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEmployeeDto {
  @IsUUID()
  @IsNotEmpty()
  business_id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

