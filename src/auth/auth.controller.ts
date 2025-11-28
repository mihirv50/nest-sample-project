import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards()
  @Post('signup')
  signup(@Body() body: AuthDto) {
    return this.authService.signup(body);
  }
  @Post('signin')
  signin(@Body() body: {email: string; password: string}) {
    return this.authService.signin(body);
  }
}
