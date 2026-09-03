const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

  // Medula Room (13 beds)
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
  { bedCode: 'L2-BLANK', floor: 2, section: 'MEDULA', position: 13 },

  // Papila Room (7 beds)
  { bedCode: 'T1', floor: 2, section: 'PAPILA', position: 1 },
  { bedCode: 'T7', floor: 2, section: 'PAPILA', position: 2 },
  { bedCode: 'T2', floor: 2, section: 'PAPILA', position: 3 },
  { bedCode: 'T6', floor: 2, section: 'PAPILA', position: 4 },
  { bedCode: 'T3', floor: 2, section: 'PAPILA', position: 5 },
  { bedCode: 'T5', floor: 2, section: 'PAPILA', position: 6 },
  { bedCode: 'T4', floor: 2, section: 'PAPILA', position: 7 },
];

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
  console.log('🔄 Syncing beds in database...');

  const allTargetBeds = [...lantai2Beds, ...lantai3Beds];
  const targetCodes = new Set(allTargetBeds.map(b => b.bedCode));

  // 1. Check existing beds in db
  const existingBeds = await prisma.bed.findMany({
    include: { machine: true, nurseSchedules: true, patientSchedules: true }
  });

  // 2. Ensure all target beds exist or are updated
  for (const b of allTargetBeds) {
    const existing = await prisma.bed.findUnique({ where: { bedCode: b.bedCode } });
    if (existing) {
      await prisma.bed.update({
        where: { bedCode: b.bedCode },
        data: {
          floor: b.floor,
          section: b.section,
          position: b.position,
        }
      });
      console.log(`  Updated bed: ${b.bedCode}`);
    } else {
      const created = await prisma.bed.create({
        data: {
          bedCode: b.bedCode,
          floor: b.floor,
          section: b.section,
          position: b.position,
          status: 'AVAILABLE'
        }
      });
      console.log(`  Created bed: ${b.bedCode}`);
      
      const machineCode = `M-${b.bedCode.replace(/\s+/g, '')}`;
      await prisma.machine.upsert({
        where: { machineCode },
        update: { bedId: created.id, floor: b.floor },
        create: {
          machineCode,
          floor: b.floor,
          status: 'AVAILABLE',
          bedId: created.id
        }
      });
    }
  }

  // 3. Remove obsolete beds that are no longer in target list
  const obsoleteBeds = existingBeds.filter(b => !targetCodes.has(b.bedCode));
  for (const ob of obsoleteBeds) {
    console.log(`  Removing obsolete bed: ${ob.bedCode} (Floor ${ob.floor})`);
    if (ob.machine) {
      await prisma.machine.delete({ where: { id: ob.machine.id } }).catch(() => {});
    }
    await prisma.bed.delete({ where: { id: ob.id } }).catch(e => {
      console.warn(`    Could not delete ${ob.bedCode}: ${e.message}`);
    });
  }

  // Verification
  const finalBeds = await prisma.bed.findMany({
    orderBy: [{ floor: 'asc' }, { bedCode: 'asc' }]
  });
  console.log(`\n✅ Finished sync! Total beds now in DB: ${finalBeds.length}`);
  console.log('Lantai 2 beds:', finalBeds.filter(b => b.floor === 2).map(b => b.bedCode).join(', '));
  console.log('Lantai 3 beds:', finalBeds.filter(b => b.floor === 3).map(b => b.bedCode).join(', '));
}

main().catch(console.error).finally(() => prisma.$disconnect());
