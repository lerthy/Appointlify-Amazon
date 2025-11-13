import { IsUUID, IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateServiceDto {
  @IsUUID()
  @IsNotEmpty()
  business_id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @IsNotEmpty()
  duration!: number;

  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

