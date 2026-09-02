'use client';

interface Bed {
  id: string;
  bedCode: string;
  floor: number;
  section: string;
  position: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  patientName?: string | null;
  patientId?: string | null;
  notes?: string | null;
  machine?: {
    id: string;
    machineCode: string;
    status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
    notes?: string | null;
  } | null;
  nurseSchedules?: Array<{
    startTime: string;
    endTime: string;
    nurse: {
      name: string;
    };
  }>;
}

interface BedUnitProps {
  bed: Bed;
  onClick: (bed: Bed) => void;
  showCode?: boolean;
}

import { isMachineDamagedOrRepaired } from '@/lib/bedUtils';
export { isMachineDamagedOrRepaired };

export default function BedUnit({ bed, onClick, showCode = true }: BedUnitProps) {
  const isRusak = bed.machine && bed.machine.status === 'MAINTENANCE';
  const isRepair = bed.machine && bed.machine.status === 'AVAILABLE' && bed.machine.notes && bed.machine.notes.startsWith('[REPAIRED]');

  const statusClass =
    isRusak
      ? 'bed-maintenance-rusak'
      : (isRepair || bed.status === 'MAINTENANCE')
      ? 'bed-maintenance-repair'
      : bed.status === 'AVAILABLE'
      ? 'bed-available'
      : bed.status === 'OCCUPIED'
      ? 'bed-occupied'
      : 'bed-maintenance-repair';

  const machineDamagedOrRepaired = isMachineDamagedOrRepaired(bed.machine);

  let tooltipText = '';
  if (machineDamagedOrRepaired && bed.machine) {
    const isRusak = bed.machine.status === 'MAINTENANCE';
    tooltipText = `${bed.bedCode}: Mesin ${bed.machine.machineCode} (${isRusak ? 'Rusak ❌' : 'Repaired 🛠️'})`;
  } else if (bed.status === 'OCCUPIED' && bed.patientName) {
    tooltipText = `${bed.bedCode}: ${bed.patientName}`;
  } else if (bed.status === 'MAINTENANCE') {
    tooltipText = `${bed.bedCode}: Dalam Perawatan`;
  } else {
    tooltipText = `${bed.bedCode}: Tersedia`;
  }

  if (bed.nurseSchedules && bed.nurseSchedules.length > 0) {
    const activeNs = bed.nurseSchedules[0];
    const startStr = new Date(activeNs.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const endStr = new Date(activeNs.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    tooltipText += `\nPerawat: ${activeNs.nurse.name} (${startStr} - ${endStr})`;
  }

  return (
    <div
      className={`bed-unit ${statusClass}`}
      onClick={() => onClick(bed)}
      title={tooltipText}
      role="button"
      aria-label={tooltipText}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(bed)}
    >
      <div className="bed-rect">
        {showCode && <span>{bed.bedCode.replace('L2-', '').replace('L3-', '')}</span>}
      </div>
      <div className="machine-sq" title={bed.machine ? bed.machine.machineCode : ''} />
    </div>
  );
}
