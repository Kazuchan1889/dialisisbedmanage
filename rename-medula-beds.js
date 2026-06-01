const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Medula Room renumbering: T39→T38, T40→T39, T41→T40, T42→T41, T43→T42
  // Use temp prefix to avoid unique constraint conflicts
  const renames = [
    { from: 'T39', to: 'T38' },
    { from: 'T40', to: 'T39' },
    { from: 'T41', to: 'T40' },
    { from: 'T42', to: 'T41' },
    { from: 'T43', to: 'T42' },
  ];

  console.log('=== Renaming Medula Room beds (Lantai 3) ===\n');

  // Step 1: Rename all to temp codes
  for (const r of renames) {
    const bed = await prisma.bed.findFirst({ where: { bedCode: r.from } });
    if (!bed) { console.log(`⚠️  Bed ${r.from} not found, skipping.`); continue; }
    const tmp = `_TMP_${r.from}`;
    await prisma.bed.update({ where: { id: bed.id }, data: { bedCode: tmp } });
    console.log(`  ${r.from} → ${tmp}`);
  }

  // Step 2: Rename temp codes to final codes
  for (const r of renames) {
    const tmp = `_TMP_${r.from}`;
    const bed = await prisma.bed.findFirst({ where: { bedCode: tmp } });
    if (!bed) { console.log(`⚠️  Temp bed ${tmp} not found, skipping.`); continue; }
    await prisma.bed.update({ where: { id: bed.id }, data: { bedCode: r.to } });
    console.log(`  ${tmp} → ${r.to} ✅`);
  }

  // Verify
  console.log('\n=== Verification ===');
  const medula = await prisma.bed.findMany({ where: { floor: 3, section: 'MEDULA' }, orderBy: { bedCode: 'asc' } });
  for (const b of medula) {
    console.log(`  ${b.bedCode} (section: ${b.section}, position: ${b.position})`);
  }

  console.log('\n✅ Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
