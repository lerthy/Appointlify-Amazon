export class RegisterDto {
  name!: string;
  email!: string;
  password!: string;
  confirm!: string;
  description!: string;
  logo?: string; // URL after upload
}

