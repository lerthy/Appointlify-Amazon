import { IsOptional, IsString, IsNumber, IsUUID, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsOptional()
  @IsUUID()
  business_id?: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;
}

