import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const safeUserSelect = {
  id: true,
  email: true,
  display_name: true,
  bio: true,
  avatar_url: true,
  role: true,
  created_at: true,
  updated_at: true,
  artist: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.UserSelect;

export type SafeUserRecord = Prisma.UserGetPayload<{
  select: typeof safeUserSelect;
}>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number): Promise<SafeUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  }

  findByIdForJwt(
    id: number,
  ): Promise<Pick<User, 'id' | 'email' | 'role'> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
  }

  findByEmailWithPassword(
    email: string,
  ): Promise<Pick<User, 'id' | 'email' | 'password' | 'role'> | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, role: true },
    });
  }

  findByEmail(email: string): Promise<Pick<User, 'id'> | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  create(data: Prisma.UserCreateInput): Promise<SafeUserRecord> {
    return this.prisma.user.create({
      data,
      select: safeUserSelect,
    });
  }

  update(id: number, data: Prisma.UserUpdateInput): Promise<SafeUserRecord> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
  }
}
