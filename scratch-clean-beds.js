const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up floor 3 beds...');
  const validBedCodes = [
    'L3-A1', 'L3-A2', 'L3-A3', 'L3-A4', 'L3-A5', 'L3-A6', 'L3-A7',
    'L3-B1', 'L3-B2', 'L3-B3', 'L3-B4', 'L3-B5', 'L3-B6',
    'L3-C1', 'L3-C2', 'L3-C3', 'L3-C4', 'L3-C5', 'L3-C6', 'L3-C7'
  ];

  // Find all beds on floor 3
  const beds = await prisma.bed.findMany({
    where: { floor: 3 }
  });
  console.log(`Currently there are ${beds.length} beds on Floor 3 in the database.`);

  const bedsToDelete = beds.filter(b => !validBedCodes.includes(b.bedCode));
  console.log(`Found ${bedsToDelete.length} beds to delete.`);

  for (const b of bedsToDelete) {
    console.log(`Deleting bed: ${b.bedCode}`);
    // First, disconnect any machines linked to this bed
    await prisma.machine.updateMany({
      where: { bedId: b.id },
      data: { bedId: null }
    });
    // Delete schedules
    await prisma.nurseSchedule.deleteMany({
      where: { bedId: b.id }
    });
    // Delete bed
    await prisma.bed.delete({
      where: { id: b.id }
    });
  }

  // Create new beds if they don't exist
  for (const code of validBedCodes) {
    const section = code.split('-')[1][0]; // A, B, or C
    const position = parseInt(code.split('-')[1].slice(1), 10);
    const existing = await prisma.bed.findUnique({
      where: { bedCode: code }
    });

    if (!existing) {
      console.log(`Creating missing bed: ${code}`);
      await prisma.bed.create({
        data: {
          bedCode: code,
          floor: 3,
          section: `Seksi ${section}`,
          position: position,
          status: 'AVAILABLE'
        }
      });
    }
  }

  const finalBeds = await prisma.bed.findMany({
    where: { floor: 3 }
  });
  console.log(`Floor 3 cleanup completed. Final count: ${finalBeds.length} beds.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
