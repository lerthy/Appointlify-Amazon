import { IsString, IsEmail, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Subdomain must be lowercase, alphanumeric, and may contain hyphens.'
  })
  subdomain!: string;
}
