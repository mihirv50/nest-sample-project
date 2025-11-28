import { Controller, Get, UseGuards } from '@nestjs/common';;
import { GetUser } from '../auth//decorators';
import { JwtGuard } from 'src/auth/guards';

@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  @Get('me')
  getMe(@GetUser('id') userId: string){
        return { userId };
    }
}