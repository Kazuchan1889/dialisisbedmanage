const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bedMappings = [
  // Papila Room
  { oldCode: 'B32', newCode: 'B31', section: 'PAPILA', position: 5 },
  { oldCode: 'B33', newCode: 'B32', section: 'PAPILA', position: 3 },
  { oldCode: 'B34', newCode: 'B33', section: 'PAPILA', position: 1 },
  { oldCode: 'B35', newCode: 'B34', section: 'PAPILA', position: 2 },
  { oldCode: 'B36', newCode: 'B35', section: 'PAPILA', position: 4 },
  { oldCode: 'T37', newCode: 'T36', section: 'PAPILA', position: 6 },

  // Medula Room
  { oldCode: 'T38', newCode: 'T37', section: 'MEDULA', position: 3 },
  { oldCode: 'T39', newCode: 'T38', section: 'MEDULA', position: 1 },
  { oldCode: 'T40', newCode: 'T39', section: 'MEDULA', position: 2 },
  { oldCode: 'A41', newCode: 'A40', section: 'MEDULA', position: 4 },

  // Korteks Room
  { oldCode: 'A B42', newCode: 'A B41', section: 'KORTEKS', position: 3 },
  { oldCode: 'B B43', newCode: 'B B42', section: 'KORTEKS', position: 2 },
  { oldCode: 'T B44', newCode: 'T B43', section: 'KORTEKS', position: 1 },
];

async function main() {
  console.log('🔄 Starting Floor 3 Bed Renumbering (32..44 -> 31..43)...');

  // Step 1: Rename beds and machines to temporary codes to prevent unique constraint conflicts
  console.log('\n--- Step 1: Assigning temporary codes ---');
  for (const m of bedMappings) {
    const bed = await prisma.bed.findUnique({ where: { bedCode: m.oldCode } });
    if (bed) {
      const tempCode = `_TEMP_F3_${m.newCode}`;
      await prisma.bed.update({
        where: { id: bed.id },
        data: {
          bedCode: tempCode,
          section: m.section,
          position: m.position,
        },
      });
      console.log(`  Bed: ${m.oldCode} -> ${tempCode}`);
    } else {
      console.log(`  Bed ${m.oldCode} not found in DB (might already be renamed)`);
    }

    // Check machine
    const oldMachineCode1 = `M-${m.oldCode.replace(/\s+/g, '')}`;
    const oldMachineCode2 = `M-${m.oldCode}`;
    const machine = await prisma.machine.findFirst({
      where: {
        machineCode: { in: [oldMachineCode1, oldMachineCode2] }
      }
    });

    if (machine) {
      const tempMachineCode = `_TEMPM_F3_${m.newCode.replace(/\s+/g, '')}`;
      await prisma.machine.update({
        where: { id: machine.id },
        data: { machineCode: tempMachineCode }
      });
      console.log(`  Machine: ${machine.machineCode} -> ${tempMachineCode}`);
    }
  }

  // Step 2: Rename from temporary codes to final new codes
  console.log('\n--- Step 2: Assigning final codes ---');
  for (const m of bedMappings) {
    const tempCode = `_TEMP_F3_${m.newCode}`;
    const bed = await prisma.bed.findFirst({ where: { bedCode: tempCode } });
    if (bed) {
      await prisma.bed.update({
        where: { id: bed.id },
        data: {
          bedCode: m.newCode,
          section: m.section,
          position: m.position,
        },
      });
      console.log(`  Bed: ${tempCode} -> ${m.newCode} ✅`);
    } else {
      // Check if target bed already exists or needs to be created
      const existingNewBed = await prisma.bed.findUnique({ where: { bedCode: m.newCode } });
      if (!existingNewBed) {
        const created = await prisma.bed.create({
          data: {
            bedCode: m.newCode,
            floor: 3,
            section: m.section,
            position: m.position,
            status: 'AVAILABLE'
          }
        });
        console.log(`  Created missing bed: ${m.newCode} ✅`);
      }
    }

    const tempMachineCode = `_TEMPM_F3_${m.newCode.replace(/\s+/g, '')}`;
    const machine = await prisma.machine.findFirst({ where: { machineCode: tempMachineCode } });
    const finalMachineCode = `M-${m.newCode.replace(/\s+/g, '')}`;
    if (machine) {
      await prisma.machine.update({
        where: { id: machine.id },
        data: { machineCode: finalMachineCode }
      });
      console.log(`  Machine: ${tempMachineCode} -> ${finalMachineCode} ✅`);
    }
  }

  // Step 3: Link machines to beds if not linked
  console.log('\n--- Step 3: Verifying Machine-Bed associations ---');
  for (const m of bedMappings) {
    const bed = await prisma.bed.findUnique({ where: { bedCode: m.newCode } });
    const machineCode = `M-${m.newCode.replace(/\s+/g, '')}`;
    if (bed) {
      const machine = await prisma.machine.findUnique({ where: { machineCode } });
      if (machine && machine.bedId !== bed.id) {
        await prisma.machine.update({
          where: { id: machine.id },
          data: { bedId: bed.id, floor: 3 }
        });
        console.log(`  Linked machine ${machineCode} to bed ${m.newCode}`);
      } else if (!machine) {
        await prisma.machine.create({
          data: {
            machineCode,
            floor: 3,
            status: 'AVAILABLE',
            bedId: bed.id
          }
        });
        console.log(`  Created and linked machine ${machineCode} to bed ${m.newCode}`);
      }
    }
  }

  // Step 4: Verification
  console.log('\n--- Step 4: Final Floor 3 Verification ---');
  const finalBeds = await prisma.bed.findMany({
    where: { floor: 3 },
    include: { machine: true },
    orderBy: [{ section: 'asc' }, { position: 'asc' }]
  });

  console.log(`Total Floor 3 beds in database: ${finalBeds.length}`);
  finalBeds.forEach(b => {
    console.log(`  ${b.bedCode.padEnd(8)} | Section: ${b.section.padEnd(8)} | Pos: ${b.position} | Machine: ${b.machine ? b.machine.machineCode : 'None'}`);
  });

  console.log('\n✅ Renumbering complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
