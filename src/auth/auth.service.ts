import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { AuthDto } from './dto';
import bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService
  ) {}

  async signup(dto: AuthDto) {
    // Validation is handled by ValidationPipe, but keeping this as backup
    if (!dto.email || !dto.password || !dto.fname || !dto.lname) {
      throw new BadRequestException('Please provide all required fields');
    }

    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new ConflictException('user already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      fname: dto.fname,
      lname: dto.lname,
      email: dto.email,
      password: hashedPassword,
    });

    return {
      msg: 'User created successfully',
      email: user.email,
    };
  }

  async signin(dto: { email: string; password: string }) {
    // Validate input
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwtService.signAsync({
      id: user._id,
    });

    return {
      msg: 'Signed In!',
      token: token,
    };
  }
}