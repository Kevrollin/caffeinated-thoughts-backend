import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changemeStrong!1';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Seeded admin user: ${adminEmail}`);
  } else {
    // eslint-disable-next-line no-console
    console.log('Admin user already exists');
  }
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


