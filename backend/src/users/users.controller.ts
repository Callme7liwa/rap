import { Body, Controller, Get, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';
import { SafeUserRecord } from './users.repository';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles(Role.USER, Role.ARTIST, Role.ADMIN)
  getMe(@CurrentUser() user: JwtUser): Promise<SafeUserRecord | null> {
    return this.usersService.getMe(user.id);
  }

  @Put('me')
  @Roles(Role.USER, Role.ARTIST, Role.ADMIN)
  updateMe(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateMeDto,
  ): Promise<SafeUserRecord> {
    return this.usersService.updateMe(user.id, dto);
  }
}
