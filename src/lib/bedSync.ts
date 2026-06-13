import { prisma } from './prisma';

interface SyncOptions {
  deletedPatientName?: string | null;
}

export async function syncBedState(bedId: string, options?: SyncOptions) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    include: {
      machine: true,
      nurseSchedules: {
        where: {
          startTime: { lte: now },
          endTime: { gte: now },
        },
        include: {
          nurse: {
            select: { id: true, name: true, role: true }
          }
        },
        take: 1
      },
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

  if (!bed) return null;

  let activePatient = bed.patientSchedules.find(p => p.startTime <= now && p.endTime >= now) || null;
  if (!activePatient && bed.patientSchedules.length > 0) {
    activePatient = bed.patientSchedules[0];
  }
  const activeNurse = bed.nurseSchedules[0] || null;

  let targetPatientName = bed.patientName;
  let targetPatientId = bed.patientId;
  let targetStatus = bed.status;

  if (activePatient) {
    targetPatientName = activePatient.patientName;
    targetPatientId = activePatient.patientId;
    targetStatus = 'OCCUPIED';
  } else {
    // No active patient schedule right now.
    let shouldClear = false;

    // 1. Explicitly clear if a deleted/modified patient name is provided and matches the current occupant
    if (options?.deletedPatientName && bed.patientName === options.deletedPatientName) {
      shouldClear = true;
    }

    // 2. Clear if there was a patient schedule for today that has ended
    if (!shouldClear) {
      const endedSchedules = bed.patientSchedules.filter(p => p.endTime < now);
      if (endedSchedules.length > 0) {
        const matchedEnded = endedSchedules.find(p => p.patientName === bed.patientName);
        if (matchedEnded) {
          shouldClear = true;
        }
      }
    }

    if (shouldClear) {
      targetPatientName = null;
      targetPatientId = null;
      if (bed.status === 'OCCUPIED') {
        targetStatus = 'AVAILABLE';
      }
    }
  }

  // Adjust status based on nurse/technician override
  if (activeNurse && activeNurse.nurse.role === 'TECHNICIAN') {
    targetStatus = 'MAINTENANCE';
  } else if (activeNurse && !activePatient && targetStatus === 'AVAILABLE') {
    targetStatus = 'OCCUPIED';
  }

  const needsUpdate =
    bed.patientName !== targetPatientName ||
    bed.patientId !== targetPatientId ||
    bed.status !== targetStatus;

  if (needsUpdate) {
    await prisma.bed.update({
      where: { id: bed.id },
      data: {
        patientName: targetPatientName,
        patientId: targetPatientId,
        status: targetStatus as any
      }
    });
    // Update local object so returned object is up-to-date
    bed.patientName = targetPatientName;
    bed.patientId = targetPatientId;
    bed.status = targetStatus as any;
  }

  return bed;
}

export async function syncAllBedsState(floor?: number) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const beds = await prisma.bed.findMany({
    where: floor ? { floor } : undefined,
    include: {
      machine: true,
      nurseSchedules: {
        where: {
          startTime: { lte: now },
          endTime: { gte: now },
        },
        include: {
          nurse: {
            select: { id: true, name: true, role: true }
          }
        },
        take: 1
      },
      patientSchedules: {
        where: {
          AND: [
            { startTime: { lte: endOfToday } },
            { endTime: { gte: startOfToday } },
          ]
        }
      }
    },
    orderBy: [{ floor: 'asc' }, { section: 'asc' }, { position: 'asc' }],
  });

  for (const bed of beds) {
    let activePatient = bed.patientSchedules.find(p => p.startTime <= now && p.endTime >= now) || null;
    if (!activePatient && bed.patientSchedules.length > 0) {
      activePatient = bed.patientSchedules[0];
    }
    const activeNurse = bed.nurseSchedules[0] || null;

    let targetPatientName = bed.patientName;
    let targetPatientId = bed.patientId;
    let targetStatus = bed.status;

    if (activePatient) {
      targetPatientName = activePatient.patientName;
      targetPatientId = activePatient.patientId;
      targetStatus = 'OCCUPIED';
    } else {
      const endedSchedules = bed.patientSchedules.filter(p => p.endTime < now);
      if (endedSchedules.length > 0) {
        const matchedEnded = endedSchedules.find(p => p.patientName === bed.patientName);
        if (matchedEnded) {
          targetPatientName = null;
          targetPatientId = null;
          if (bed.status === 'OCCUPIED') {
            targetStatus = 'AVAILABLE';
          }
        }
      }
    }

    if (activeNurse && activeNurse.nurse.role === 'TECHNICIAN') {
      targetStatus = 'MAINTENANCE';
    } else if (activeNurse && !activePatient && targetStatus === 'AVAILABLE') {
      targetStatus = 'OCCUPIED';
    }

    const needsUpdate =
      bed.patientName !== targetPatientName ||
      bed.patientId !== targetPatientId ||
      bed.status !== targetStatus;

    if (needsUpdate) {
      await prisma.bed.update({
        where: { id: bed.id },
        data: {
          patientName: targetPatientName,
          patientId: targetPatientId,
          status: targetStatus as any
        }
      });
      // Update in-memory to match
      bed.patientName = targetPatientName;
      bed.patientId = targetPatientId;
      bed.status = targetStatus as any;
    }
  }

  return beds;
}
