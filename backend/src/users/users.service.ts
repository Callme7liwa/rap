import { Injectable } from '@nestjs/common';
import { UpdateMeDto } from './dto/update-me.dto';
import { SafeUserRecord, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getMe(userId: number): Promise<SafeUserRecord | null> {
    return this.usersRepository.findById(userId);
  }

  async updateMe(userId: number, dto: UpdateMeDto): Promise<SafeUserRecord> {
    return this.usersRepository.update(userId, dto);
  }
}
