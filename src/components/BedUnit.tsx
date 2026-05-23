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

export default function BedUnit({ bed, onClick, showCode = true }: BedUnitProps) {
  const statusClass =
    bed.status === 'AVAILABLE'
      ? 'bed-available'
      : bed.status === 'OCCUPIED'
      ? 'bed-occupied'
      : 'bed-maintenance';

  let tooltipText =
    bed.status === 'OCCUPIED' && bed.patientName
      ? `${bed.bedCode}: ${bed.patientName}`
      : bed.status === 'MAINTENANCE'
      ? `${bed.bedCode}: Dalam Perawatan`
      : `${bed.bedCode}: Tersedia`;

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
