import { PrismaClient, Role, BedStatus, MachineStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Lantai 2 bed layout (updated according to user request)
const lantai2Beds = [
  // Section A - Left of Nurse Room (4 beds)
  { bedCode: 'L2-A1', floor: 2, section: 'A', position: 1 },
  { bedCode: 'L2-A2', floor: 2, section: 'A', position: 2 },
  { bedCode: 'L2-A3', floor: 2, section: 'A', position: 3 },
  { bedCode: 'L2-A4', floor: 2, section: 'A', position: 4 },

  // Section B - Under Section A (7 beds)
  { bedCode: 'L2-B1', floor: 2, section: 'B', position: 1 },
  { bedCode: 'L2-B2', floor: 2, section: 'B', position: 2 },
  { bedCode: 'L2-B3', floor: 2, section: 'B', position: 3 },
  { bedCode: 'L2-B4', floor: 2, section: 'B', position: 4 },
  { bedCode: 'L2-B5', floor: 2, section: 'B', position: 5 },
  { bedCode: 'L2-B6', floor: 2, section: 'B', position: 6 },
  { bedCode: 'L2-B7', floor: 2, section: 'B', position: 7 },

  // Section C - Right of Section B (13 beds, divided with partition)
  { bedCode: 'L2-C1', floor: 2, section: 'C', position: 1 },
  { bedCode: 'L2-C2', floor: 2, section: 'C', position: 2 },
  { bedCode: 'L2-C3', floor: 2, section: 'C', position: 3 },
  { bedCode: 'L2-C4', floor: 2, section: 'C', position: 4 },
  { bedCode: 'L2-C5', floor: 2, section: 'C', position: 5 },
  { bedCode: 'L2-C6', floor: 2, section: 'C', position: 6 },
  { bedCode: 'L2-C7', floor: 2, section: 'C', position: 7 },
  { bedCode: 'L2-C8', floor: 2, section: 'C', position: 8 },
  { bedCode: 'L2-C9', floor: 2, section: 'C', position: 9 },
  { bedCode: 'L2-C10', floor: 2, section: 'C', position: 10 },
  { bedCode: 'L2-C11', floor: 2, section: 'C', position: 11 },
  { bedCode: 'L2-C12', floor: 2, section: 'C', position: 12 },
  { bedCode: 'L2-C13', floor: 2, section: 'C', position: 13 },

  // Section D - Right of Section C (7 beds)
  { bedCode: 'L2-D1', floor: 2, section: 'D', position: 1 },
  { bedCode: 'L2-D2', floor: 2, section: 'D', position: 2 },
  { bedCode: 'L2-D3', floor: 2, section: 'D', position: 3 },
  { bedCode: 'L2-D4', floor: 2, section: 'D', position: 4 },
  { bedCode: 'L2-D5', floor: 2, section: 'D', position: 5 },
  { bedCode: 'L2-D6', floor: 2, section: 'D', position: 6 },
  { bedCode: 'L2-D7', floor: 2, section: 'D', position: 7 },
];

// Lantai 3 bed layout (matching the floor map image)
const lantai3Beds = [
  // Section A - Left (middle rows)
  { bedCode: 'L3-A1', floor: 3, section: 'A', position: 1 },
  { bedCode: 'L3-A2', floor: 3, section: 'A', position: 2 },
  { bedCode: 'L3-A3', floor: 3, section: 'A', position: 3 },
  { bedCode: 'L3-A4', floor: 3, section: 'A', position: 4 },
  { bedCode: 'L3-A5', floor: 3, section: 'A', position: 5 },
  { bedCode: 'L3-A6', floor: 3, section: 'A', position: 6 },
  { bedCode: 'L3-A7', floor: 3, section: 'A', position: 7 },
  { bedCode: 'L3-A8', floor: 3, section: 'A', position: 8 },
  { bedCode: 'L3-A9', floor: 3, section: 'A', position: 9 },
  { bedCode: 'L3-A10', floor: 3, section: 'A', position: 10 },
  // Section B - Center left
  { bedCode: 'L3-B1', floor: 3, section: 'B', position: 1 },
  { bedCode: 'L3-B2', floor: 3, section: 'B', position: 2 },
  { bedCode: 'L3-B3', floor: 3, section: 'B', position: 3 },
  { bedCode: 'L3-B4', floor: 3, section: 'B', position: 4 },
  { bedCode: 'L3-B5', floor: 3, section: 'B', position: 5 },
  { bedCode: 'L3-B6', floor: 3, section: 'B', position: 6 },
  // Section C - Center right
  { bedCode: 'L3-C1', floor: 3, section: 'C', position: 1 },
  { bedCode: 'L3-C2', floor: 3, section: 'C', position: 2 },
  { bedCode: 'L3-C3', floor: 3, section: 'C', position: 3 },
  { bedCode: 'L3-C4', floor: 3, section: 'C', position: 4 },
  { bedCode: 'L3-C5', floor: 3, section: 'C', position: 5 },
  { bedCode: 'L3-C6', floor: 3, section: 'C', position: 6 },
  // Section D - Right
  { bedCode: 'L3-D1', floor: 3, section: 'D', position: 1 },
  { bedCode: 'L3-D2', floor: 3, section: 'D', position: 2 },
  { bedCode: 'L3-D3', floor: 3, section: 'D', position: 3 },
  { bedCode: 'L3-D4', floor: 3, section: 'D', position: 4 },
  { bedCode: 'L3-D5', floor: 3, section: 'D', position: 5 },
  { bedCode: 'L3-D6', floor: 3, section: 'D', position: 6 },
  { bedCode: 'L3-D7', floor: 3, section: 'D', position: 7 },
  { bedCode: 'L3-D8', floor: 3, section: 'D', position: 8 },
  { bedCode: 'L3-D9', floor: 3, section: 'D', position: 9 },
  { bedCode: 'L3-D10', floor: 3, section: 'D', position: 10 },
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
