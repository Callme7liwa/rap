import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adminEmail = 'admin@lyricscape.com';
const adminPassword = 'Admin1234!';
const saltRounds = 10;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✅ Admin already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      display_name: 'Admin',
      role: Role.ADMIN,
    },
  });

  console.log('✅ Admin created');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
