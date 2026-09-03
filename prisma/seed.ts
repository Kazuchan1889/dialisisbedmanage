import { PrismaClient, Role, BedStatus, MachineStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Lantai 2 bed layout (original)
const lantai2Beds = [
  // Kaliks Room (4 beds)
  { bedCode: 'T28', floor: 2, section: 'KALIKS', position: 1 },
  { bedCode: 'A29', floor: 2, section: 'KALIKS', position: 2 },
  { bedCode: 'T27', floor: 2, section: 'KALIKS', position: 3 },
  { bedCode: 'A30', floor: 2, section: 'KALIKS', position: 4 },

  // Korteks Room (7 beds)
  { bedCode: 'A26', floor: 2, section: 'KORTEKS', position: 1 },
  { bedCode: 'A25', floor: 2, section: 'KORTEKS', position: 2 },
  { bedCode: 'T20', floor: 2, section: 'KORTEKS', position: 3 },
  { bedCode: 'A24', floor: 2, section: 'KORTEKS', position: 4 },
  { bedCode: 'T21', floor: 2, section: 'KORTEKS', position: 5 },
  { bedCode: 'T23', floor: 2, section: 'KORTEKS', position: 6 },
  { bedCode: 'T22', floor: 2, section: 'KORTEKS', position: 7 },

  // Medula Room (12 beds)
  { bedCode: 'T19', floor: 2, section: 'MEDULA', position: 1 },
  { bedCode: 'T18', floor: 2, section: 'MEDULA', position: 2 },
  { bedCode: 'T17', floor: 2, section: 'MEDULA', position: 3 },
  { bedCode: 'T16', floor: 2, section: 'MEDULA', position: 4 },
  { bedCode: 'T15', floor: 2, section: 'MEDULA', position: 5 },
  { bedCode: 'T14', floor: 2, section: 'MEDULA', position: 6 },
  { bedCode: 'T8',  floor: 2, section: 'MEDULA', position: 7 },
  { bedCode: 'T9',  floor: 2, section: 'MEDULA', position: 8 },
  { bedCode: 'T10', floor: 2, section: 'MEDULA', position: 9 },
  { bedCode: 'T11', floor: 2, section: 'MEDULA', position: 10 },
  { bedCode: 'T12', floor: 2, section: 'MEDULA', position: 11 },
  { bedCode: 'T13', floor: 2, section: 'MEDULA', position: 12 },

  // Papila Room (7 beds)
  { bedCode: 'T1', floor: 2, section: 'PAPILA', position: 1 },
  { bedCode: 'T7', floor: 2, section: 'PAPILA', position: 2 },
  { bedCode: 'T2', floor: 2, section: 'PAPILA', position: 3 },
  { bedCode: 'T6', floor: 2, section: 'PAPILA', position: 4 },
  { bedCode: 'T3', floor: 2, section: 'PAPILA', position: 5 },
  { bedCode: 'T5', floor: 2, section: 'PAPILA', position: 6 },
  { bedCode: 'T4', floor: 2, section: 'PAPILA', position: 7 },
];

// Lantai 3 bed layout (matching the floor map)
const lantai3Beds = [
  // Papila Room (6 beds)
  { bedCode: 'B34', floor: 3, section: 'PAPILA', position: 1 },
  { bedCode: 'B35', floor: 3, section: 'PAPILA', position: 2 },
  { bedCode: 'B33', floor: 3, section: 'PAPILA', position: 3 },
  { bedCode: 'B36', floor: 3, section: 'PAPILA', position: 4 },
  { bedCode: 'B32', floor: 3, section: 'PAPILA', position: 5 },
  { bedCode: 'T37', floor: 3, section: 'PAPILA', position: 6 },

  // Medula Room (4 beds)
  { bedCode: 'T39', floor: 3, section: 'MEDULA', position: 1 },
  { bedCode: 'T40', floor: 3, section: 'MEDULA', position: 2 },
  { bedCode: 'T38', floor: 3, section: 'MEDULA', position: 3 },
  { bedCode: 'A41', floor: 3, section: 'MEDULA', position: 4 },

  // Korteks Room (3 beds)
  { bedCode: 'T B44', floor: 3, section: 'KORTEKS', position: 1 },
  { bedCode: 'B B43', floor: 3, section: 'KORTEKS', position: 2 },
  { bedCode: 'A B42', floor: 3, section: 'KORTEKS', position: 3 },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'Administrator',
      role: Role.ADMIN,
      active: true,
    },
  });
  console.log('✅ Admin user created:', admin.username);

  // Clean up old Lantai 2 beds and machines
  console.log('🧹 Cleaning up Lantai 2 machines and beds...');
  await prisma.machine.deleteMany({ where: { floor: 2 } });
  await prisma.bed.deleteMany({ where: { floor: 2 } });

  // Seed Lantai 2 beds and machines
  for (const bedData of lantai2Beds) {
    const bed = await prisma.bed.create({
      data: { ...bedData, status: BedStatus.AVAILABLE },
    });

    const machineCode = `M-${bedData.bedCode}`;
    await prisma.machine.create({
      data: {
        machineCode,
        floor: bedData.floor,
        status: MachineStatus.AVAILABLE,
        bedId: bed.id,
      },
    });
  }
  console.log(`✅ Lantai 2: ${lantai2Beds.length} beds + machines created`);

  // Clean up old Lantai 3 beds and machines
  console.log('🧹 Cleaning up Lantai 3 machines and beds...');
  await prisma.machine.deleteMany({ where: { floor: 3 } });
  await prisma.bed.deleteMany({ where: { floor: 3 } });

  // Seed Lantai 3 beds and machines
  for (const bedData of lantai3Beds) {
    const bed = await prisma.bed.create({
      data: { ...bedData, status: BedStatus.AVAILABLE },
    });

    const machineCode = `M-${bedData.bedCode}`;
    await prisma.machine.create({
      data: {
        machineCode,
        floor: bedData.floor,
        status: MachineStatus.AVAILABLE,
        bedId: bed.id,
      },
    });
  }
  console.log(`✅ Lantai 3: ${lantai3Beds.length} beds + machines created`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
