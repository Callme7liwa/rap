import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SafeUserRecord, UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

export interface AuthResponse {
  access_token: string;
  user: SafeUserRecord;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const password = await bcrypt.hash(dto.password, 12);
    const user = await this.usersRepository.create({
      email,
      password,
      display_name: dto.display_name,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersRepository.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const safeUser = await this.usersRepository.findById(user.id);

    if (!safeUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(safeUser);
  }

  private buildAuthResponse(user: SafeUserRecord): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user,
    };
  }
}
