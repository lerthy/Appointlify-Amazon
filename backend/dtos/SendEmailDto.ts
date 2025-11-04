import { IsString, IsEmail, IsNotEmpty, ValidateIf } from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ValidateIf(o => !o.text)
  @IsString()
  @IsNotEmpty()
  html?: string;

  @ValidateIf(o => !o.html)
  @IsString()
  @IsNotEmpty()
  text?: string;
}

