import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from '../../users/users.repository';
import { JwtPayload } from '../types/jwt-payload.type';
import { JwtUser } from '../types/jwt-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {
    const secret = configService.getOrThrow<string>('JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    const user = await this.usersRepository.findByIdForJwt(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid token user');
    }

    return user;
  }
}
