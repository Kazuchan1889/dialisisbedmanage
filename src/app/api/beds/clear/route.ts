import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { floor, date } = body;

    if (!floor) {
      return NextResponse.json({ error: 'Lantai diperlukan' }, { status: 400 });
    }

    // Ambil ID semua bed di lantai tersebut
    const beds = await prisma.bed.findMany({
      where: { floor: Number(floor) },
      select: { id: true }
    });
    
    const bedIds = beds.map(b => b.id);

    if (bedIds.length > 0) {
      if (date) {
        const startOfDay = new Date(`${date}T00:00:00.000+07:00`);
        const endOfDay   = new Date(`${date}T23:59:59.999+07:00`);
        
        // 1. Hapus jadwal pasien pada hari tersebut
        await prisma.patientSchedule.deleteMany({
          where: { 
            bedId: { in: bedIds },
            AND: [
              { startTime: { lte: endOfDay } },
              { endTime: { gte: startOfDay } }
            ]
          }
        });

        // 2. Hapus jadwal perawat pada hari tersebut
        await prisma.nurseSchedule.deleteMany({
          where: { 
            bedId: { in: bedIds },
            AND: [
              { startTime: { lte: endOfDay } },
              { endTime: { gte: startOfDay } }
            ]
          }
        });
      } else {
        // Fallback jika tdk ada date
        await prisma.patientSchedule.deleteMany({ where: { bedId: { in: bedIds } } });
        await prisma.nurseSchedule.deleteMany({ where: { bedId: { in: bedIds } } });
      }

      // 3. Kembalikan status mesin yang sedang dipakai menjadi tersedia
      await prisma.machine.updateMany({
        where: { 
          bedId: { in: bedIds },
          status: 'IN_USE'
        },
        data: {
          status: 'AVAILABLE'
        }
      });

      // 4. Reset status bed
      await prisma.bed.updateMany({
        where: { id: { in: bedIds } },
        data: {
          status: 'AVAILABLE',
          patientName: null,
          patientId: null,
          notes: null,
        },
      });
    }

    return NextResponse.json(
      { message: `Berhasil mengosongkan ${beds.length} bed beserta data jadwalnya di lantai ${floor}.`, count: beds.length },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
