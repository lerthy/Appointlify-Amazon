import { IsString, IsNotEmpty } from 'class-validator';

export class SendSmsDto {
  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}

