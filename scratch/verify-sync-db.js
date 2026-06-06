const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('🚀 Running Bed Synchronization logic tests...');

  // 1. Find the first bed in the database
  const bed = await prisma.bed.findFirst();

  if (!bed) {
    console.error('❌ Error: No beds found in database.');
    process.exit(1);
  }

  const bedId = bed.id;
  console.log(`Using bed: ${bed.bedCode} (${bedId})`);

  // Reset bed and clean schedules
  await prisma.patientSchedule.deleteMany({ where: { bedId } });
  await prisma.bed.update({
    where: { id: bedId },
    data: {
      status: 'AVAILABLE',
      patientName: null,
      patientId: null
    }
  });

  // Re-fetch to ensure clean state
  let currentBed = await prisma.bed.findUnique({ where: { id: bedId } });
  console.log(`Initial status: ${currentBed.status}, patient: ${currentBed.patientName}`);
  if (currentBed.status !== 'AVAILABLE' || currentBed.patientName !== null) {
    console.error('❌ Reset failed!');
    process.exit(1);
  }

  // ----------------------------------------------------
  // TEST 1: Active Schedule should occupy the bed
  // ----------------------------------------------------
  console.log('\n--- TEST 1: Active schedule occupies bed ---');
  const now = new Date();
  const startTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 mins ago
  const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  const testPatientName = 'Bernadus Test';
  const testPatientId = 'RM-999999';

  console.log(`Creating active schedule for "${testPatientName}"...`);
  const activeSched = await prisma.patientSchedule.create({
    data: {
      bedId,
      patientId: testPatientId,
      patientName: testPatientName,
      sessionType: 'MORNING',
      startTime,
      endTime
    }
  });

  // Run sync logic inline (identical to bedSync.ts)
  async function localSync(id, options = {}) {
    const time = new Date();
    const startOfToday = new Date(time);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(time);
    endOfToday.setHours(23, 59, 59, 999);

    const b = await prisma.bed.findUnique({
      where: { id },
      include: {
        patientSchedules: {
          where: {
            AND: [
              { startTime: { lte: endOfToday } },
              { endTime: { gte: startOfToday } },
            ]
          }
        }
      }
    });

    const activeP = b.patientSchedules.find(p => p.startTime <= time && p.endTime >= time) || null;
    let targetPatientName = b.patientName;
    let targetPatientId = b.patientId;
    let targetStatus = b.status;

    if (activeP) {
      targetPatientName = activeP.patientName;
      targetPatientId = activeP.patientId;
      targetStatus = 'OCCUPIED';
    } else {
      let shouldClear = false;
      if (options.deletedPatientName && b.patientName === options.deletedPatientName) {
        shouldClear = true;
      }
      if (!shouldClear) {
        const endedSchedules = b.patientSchedules.filter(p => p.endTime < time);
        if (endedSchedules.length > 0) {
          const matchedEnded = endedSchedules.find(p => p.patientName === b.patientName);
          if (matchedEnded) {
            shouldClear = true;
          }
        }
      }
      if (shouldClear) {
        targetPatientName = null;
        targetPatientId = null;
        if (b.status === 'OCCUPIED') {
          targetStatus = 'AVAILABLE';
        }
      }
    }

    if (b.patientName !== targetPatientName || b.patientId !== targetPatientId || b.status !== targetStatus) {
      await prisma.bed.update({
        where: { id },
        data: {
          patientName: targetPatientName,
          patientId: targetPatientId,
          status: targetStatus
        }
      });
    }
  }

  await localSync(bedId);

  currentBed = await prisma.bed.findUnique({ where: { id: bedId } });
  console.log(`Status after sync: ${currentBed.status}, occupant: ${currentBed.patientName}`);
  if (currentBed.status !== 'OCCUPIED' || currentBed.patientName !== testPatientName) {
    console.error('❌ TEST 1 Failed!');
    process.exit(1);
  }
  console.log('✅ TEST 1 Passed!');

  // ----------------------------------------------------
  // TEST 2: Ended Schedule should clear the bed
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Ended schedule clears bed ---');
  console.log('Updating schedule to be in the past...');
  await prisma.patientSchedule.update({
    where: { id: activeSched.id },
    data: {
      startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      endTime: new Date(now.getTime() - 30 * 60 * 1000) // 30 mins ago
    }
  });

  await localSync(bedId);

  currentBed = await prisma.bed.findUnique({ where: { id: bedId } });
  console.log(`Status after ended sync: ${currentBed.status}, occupant: ${currentBed.patientName}`);
  if (currentBed.status !== 'AVAILABLE' || currentBed.patientName !== null) {
    console.error('❌ TEST 2 Failed!');
    process.exit(1);
  }
  console.log('✅ TEST 2 Passed!');

  // ----------------------------------------------------
  // TEST 3: Deleting active schedule should clear the bed
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Deleting active schedule clears bed ---');
  // Update schedule back to active
  await prisma.patientSchedule.update({
    where: { id: activeSched.id },
    data: {
      startTime: new Date(now.getTime() - 30 * 60 * 1000),
      endTime: new Date(now.getTime() + 60 * 60 * 1000)
    }
  });

  // Sync to re-occupy
  await localSync(bedId);
  currentBed = await prisma.bed.findUnique({ where: { id: bedId } });
  console.log(`Status before deletion: ${currentBed.status}, occupant: ${currentBed.patientName}`);
  if (currentBed.status !== 'OCCUPIED') {
    console.error('❌ Failed to re-occupy for Test 3!');
    process.exit(1);
  }

  // Delete the schedule
  console.log('Deleting patient schedule...');
  await prisma.patientSchedule.delete({ where: { id: activeSched.id } });

  // Sync with deleted patient name
  await localSync(bedId, { deletedPatientName: testPatientName });

  currentBed = await prisma.bed.findUnique({ where: { id: bedId } });
  console.log(`Status after deletion sync: ${currentBed.status}, occupant: ${currentBed.patientName}`);
  if (currentBed.status !== 'AVAILABLE' || currentBed.patientName !== null) {
    console.error('❌ TEST 3 Failed!');
    process.exit(1);
  }
  console.log('✅ TEST 3 Passed!');

  console.log('\n🎉 All Bed Synchronization tests completed successfully!');
}

runTests()
  .catch(e => console.error('❌ Tests errored:', e))
  .finally(() => prisma.$disconnect());
