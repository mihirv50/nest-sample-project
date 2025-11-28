import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AuthDto {
  @IsNotEmpty()
  @IsString()
  fname: string;
  @IsNotEmpty()
  @IsString()
  lname: string;
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @IsNotEmpty()
  @IsString()
  password: string;
}
