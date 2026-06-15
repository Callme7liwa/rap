import { Role } from '@prisma/client';

export interface JwtUser {
  id: number;
  email: string;
  role: Role;
}
