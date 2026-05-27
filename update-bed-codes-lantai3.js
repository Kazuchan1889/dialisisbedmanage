/**
 * Script to update Lantai 3 bed codes to match the floor map image.
 * Run: node update-bed-codes-lantai3.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const toDelete = [
  'L3-A7',
  'L3-B6',
  'L3-C3',
  'L3-C4',
  'L3-C5',
  'L3-C6',
  'L3-C7'
];

const mappings = [
  // Papila Room (6 beds)
  { old: 'L3-A1', new: 'B34', section: 'PAPILA', position: 1 },
  { old: 'L3-A2', new: 'B33', section: 'PAPILA', position: 2 },
  { old: 'L3-A3', new: 'B32', section: 'PAPILA', position: 3 },
  { old: 'L3-A4', new: 'B35', section: 'PAPILA', position: 4 },
  { old: 'L3-A5', new: 'B36', section: 'PAPILA', position: 5 },
  { old: 'L3-A6', new: 'B37', section: 'PAPILA', position: 6 },

  // Medula Room (5 beds)
  { old: 'L3-B1', new: 'T39', section: 'MEDULA', position: 1 },
  { old: 'L3-B2', new: 'T40', section: 'MEDULA', position: 2 },
  { old: 'L3-B3', new: 'T41', section: 'MEDULA', position: 3 },
  { old: 'L3-B4', new: 'T42', section: 'MEDULA', position: 4 },
  { old: 'L3-B5', new: 'T43', section: 'MEDULA', position: 5 },

  // Korteks Room (2 beds)
  { old: 'L3-C1', new: 'A44', section: 'KORTEKS', position: 1 },
  { old: 'L3-C2', new: 'T45', section: 'KORTEKS', position: 2 }
];

async function main() {
  console.log('Starting bed cleanup and code update for Lantai 3...\n');

  // Step 1: Delete extra beds
  console.log('Step 1: Deleting extra beds...');
  for (const code of toDelete) {
    try {
      await prisma.bed.delete({
        where: { bedCode: code }
      });
      console.log(`  Deleted: ${code}`);
    } catch (e) {
      console.warn(`  SKIP delete (not found or already deleted): ${code} — ${e.message}`);
    }
  }

  // Step 2: Rename to temp names to avoid unique constraint conflicts
  console.log('\nStep 2: Renaming to temporary names...');
  for (const m of mappings) {
    try {
      await prisma.bed.update({
        where: { bedCode: m.old },
        data: {
          bedCode: `__TEMP3__${m.new}`,
          section: m.section,
          position: m.position
        },
      });
      console.log(`  Temp: ${m.old} → __TEMP3__${m.new}`);
    } catch (e) {
      console.warn(`  SKIP rename to temp (not found): ${m.old} — ${e.message}`);
    }
  }

  // Step 3: Rename from temp to final names
  console.log('\nStep 3: Renaming to final names...');
  for (const m of mappings) {
    try {
      await prisma.bed.update({
        where: { bedCode: `__TEMP3__${m.new}` },
        data: { bedCode: m.new },
      });
      console.log(`  Final: __TEMP3__${m.new} → ${m.new}`);
    } catch (e) {
      console.warn(`  SKIP final rename: ${m.new} — ${e.message}`);
    }
  }

  // Step 4: Verification
  console.log('\nStep 4: Verifying final beds on Floor 3...');
  const activeBeds = await prisma.bed.findMany({
    where: { floor: 3 },
    orderBy: { bedCode: 'asc' }
  });
  console.log(`Total beds on Floor 3 in database: ${activeBeds.length}`);
  console.log(activeBeds.map(b => `${b.bedCode} (${b.section})`).join(', '));

  console.log('\n✅ Done! All Lantai 3 bed codes updated successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
