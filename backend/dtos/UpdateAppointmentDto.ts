import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'])
  status!: string;
}

