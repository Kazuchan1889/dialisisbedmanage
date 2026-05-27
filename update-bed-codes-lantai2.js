/**
 * Script to update Lantai 2 bed codes to match the floor map image.
 * Run: node update-bed-codes-lantai2.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mappings = [
  // KALIKS ROOM (4 bed)
  { old: 'L2-A1', new: 'T29' },
  { old: 'L2-A2', new: 'A30' },
  { old: 'L2-A3', new: 'T28' },
  { old: 'L2-A4', new: 'T31' },

  // KORTEKS ROOM (7 bed)
  { old: 'L2-B1', new: 'A27' },
  { old: 'L2-B2', new: 'A26' },
  { old: 'L2-B3', new: 'T21' },
  { old: 'L2-B4', new: 'A25' },
  { old: 'L2-B5', new: 'T22' },
  { old: 'L2-B6', new: 'A24' },
  { old: 'L2-B7', new: 'T23' },

  // MEDULA ROOM - Bagian 1 (6 bed, 2-col: left=T20/T19/T18, right=T8/T9/T10)
  { old: 'L2-C1', new: 'T20' },
  { old: 'L2-C2', new: 'T8'  },
  { old: 'L2-C3', new: 'T19' },
  { old: 'L2-C4', new: 'T9'  },
  { old: 'L2-C5', new: 'T18' },
  { old: 'L2-C6', new: 'T10' },

  // MEDULA ROOM - Bagian 2 (7 bed, 2-col: left=T17/T16/T15, right=T11/T12/T13/T14)
  { old: 'L2-C7',  new: 'T17' },
  { old: 'L2-C8',  new: 'T11' },
  { old: 'L2-C9',  new: 'T16' },
  { old: 'L2-C10', new: 'T12' },
  { old: 'L2-C11', new: 'T15' },
  { old: 'L2-C12', new: 'T13' },
  { old: 'L2-C13', new: 'T14' },

  // PAPILA ROOM (7 bed, layout: [empty,T1], [T7,T2], [T6,T3], [T5,T4])
  { old: 'L2-D1', new: 'T1' },
  { old: 'L2-D2', new: 'T7' },
  { old: 'L2-D3', new: 'T2' },
  { old: 'L2-D4', new: 'T6' },
  { old: 'L2-D5', new: 'T3' },
  { old: 'L2-D6', new: 'T5' },
  { old: 'L2-D7', new: 'T4' },
];

async function main() {
  console.log('Starting bed code update for Lantai 2...\n');

  // Step 1: Rename to temp names to avoid unique constraint conflicts
  for (const m of mappings) {
    try {
      await prisma.bed.update({
        where: { bedCode: m.old },
        data: { bedCode: `__TEMP__${m.new}` },
      });
      console.log(`  Temp: ${m.old} → __TEMP__${m.new}`);
    } catch (e) {
      console.warn(`  SKIP (not found): ${m.old} — ${e.message}`);
    }
  }

  // Step 2: Rename from temp to final names
  for (const m of mappings) {
    try {
      await prisma.bed.update({
        where: { bedCode: `__TEMP__${m.new}` },
        data: { bedCode: m.new },
      });
      console.log(`  Final: __TEMP__${m.new} → ${m.new}`);
    } catch (e) {
      console.warn(`  SKIP final: ${m.new} — ${e.message}`);
    }
  }

  console.log('\n✅ Done! All Lantai 2 bed codes updated.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
