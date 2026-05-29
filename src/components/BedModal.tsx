'use client';

import { useState, useEffect } from 'react';

interface NurseSchedule {
  id: string;
  nurseId: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
  shift: string;
  nurse: {
    name: string;
    role: string;
    username?: string;
  };
}

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
  nurseSchedules?: NurseSchedule[];
}

interface BedModalProps {
  bed: Bed;
  onClose: () => void;
  onSave: (updated: Bed) => void;
}

const statusLabels = {
  AVAILABLE: 'Tersedia',
  OCCUPIED: 'Terisi / Pasien',
  MAINTENANCE: 'Perawatan / Perbaikan',
};

function getNotesWithoutPrefix(notes: string | null | undefined): string {
  if (!notes) return '';
  if (notes.startsWith('[REPAIRED]')) {
    return notes.replace('[REPAIRED]', '').trim();
  }
  return notes;
}

function ShiftBadge({ shift }: { shift: string }) {
  const map: Record<string, { text: string; bg: string; color: string }> = {
    MORNING: { text: 'Pagi 🌅', bg: '#fef3c7', color: '#d97706' },
    DAY:     { text: 'Siang ☀️', bg: '#dcfce7', color: '#15803d' },
    NIGHT:   { text: 'Malam 🌙', bg: '#e0f2fe', color: '#0369a1' },
  };
  const s = map[shift] ?? map.NIGHT;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      background: s.bg, color: s.color,
    }}>{s.text}</span>
  );
}

// ─── Operational Info Panel (read-only, shown when bed is assigned) ───────────
function BedInfoPanel({
  detailedBed,
  patients,
  onDeleteSchedule,
  onEditClick,
  onUnassign,
  saving,
}: {
  detailedBed: Bed;
  patients: any[];
  onDeleteSchedule: (id: string) => void;
  onEditClick: () => void;
  onUnassign: () => void;
  saving: boolean;
}) {
  const now = new Date();

  const activeSchedules = (detailedBed.nurseSchedules || []).filter(
    (ns) => now >= new Date(ns.startTime) && now <= new Date(ns.endTime)
  );
  const upcomingSchedules = (detailedBed.nurseSchedules || []).filter(
    (ns) => now < new Date(ns.startTime)
  );
  const pastSchedules = (detailedBed.nurseSchedules || [])
    .filter((ns) => now > new Date(ns.endTime))
    .slice(0, 5); // last 5

  // Find patient detail from list
  const patientDetail = patients.find((p) => p.mrNumber === detailedBed.patientId);

  // Status color
  const statusColor = {
    AVAILABLE: { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7', dot: '#22c55e' },
    OCCUPIED:  { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', dot: '#ef4444' },
    MAINTENANCE: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d', dot: '#f59e0b' },
  }[detailedBed.status];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Status Banner ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 12,
        background: statusColor.bg, border: `1.5px solid ${statusColor.border}`,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: statusColor.dot, flexShrink: 0,
          boxShadow: `0 0 0 3px ${statusColor.border}`,
        }} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: statusColor.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Status Bed Saat Ini
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: statusColor.color }}>
            {statusLabels[detailedBed.status]}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onEditClick}
            style={{ fontSize: 11 }}
          >
            ✏️ Edit
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={onUnassign}
            disabled={saving}
            style={{ fontSize: 11 }}
          >
            🗑️ Kosongkan
          </button>
        </div>
      </div>

      {/* ── Patient Card ── */}
      {detailedBed.patientId && detailedBed.patientId !== 'MAINTENANCE' && (
        <div style={{
          background: '#ffffff', border: '1.5px solid #e0e7ff',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e6fa6 0%, #2563eb 100%)',
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0,
            }}>
              {(detailedBed.patientName || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>👥 Pasien Dialysis</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>
                {patientDetail?.title ? `${patientDetail.title}. ` : ''}{detailedBed.patientName}
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            <InfoItem label="No. Rekam Medis" value={detailedBed.patientId} mono />
            {patientDetail?.dateOfBirth && (
              <InfoItem
                label="Tanggal Lahir"
                value={new Date(patientDetail.dateOfBirth).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              />
            )}
            {patientDetail?.nik && <InfoItem label="NIK" value={patientDetail.nik} mono />}
            {patientDetail?.jknNumber && <InfoItem label="No. JKN / BPJS" value={patientDetail.jknNumber} mono />}
            {patientDetail?.initialAssessment && (
              <div style={{ gridColumn: '1 / -1' }}>
                <InfoItem label="Initial Assessment" value={patientDetail.initialAssessment} />
              </div>
            )}
            {/* Patient flags */}
            {(patientDetail?.dead || patientDetail?.travelling || patientDetail?.moved) && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {patientDetail?.dead && <span style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>💀 Dead</span>}
                {patientDetail?.travelling && <span style={{ fontSize: 10, background: '#e0e7ff', color: '#3730a3', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>✈️ Travelling</span>}
                {patientDetail?.moved && <span style={{ fontSize: 10, background: '#f1f5f9', color: '#334155', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>📦 Moved</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Maintenance Mode ── */}
      {detailedBed.status === 'MAINTENANCE' && (
        <div style={{
          background: '#fffbeb', border: '1.5px solid #fcd34d',
          borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 28 }}>🔧</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>Mode Perawatan / Perbaikan</div>
            <div style={{ fontSize: 11, color: '#78350f', marginTop: 2 }}>Bed ini sedang dalam proses maintenance atau kalibrasi</div>
          </div>
        </div>
      )}

      {/* ── Catatan ── */}
      {detailedBed.notes && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 12, padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            📝 Catatan Bed
          </div>
          <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{detailedBed.notes}</div>
        </div>
      )}

      {/* ── Machine Card ── */}
      {detailedBed.machine && (
        <div style={{
          background: '#ffffff', border: '1.5px solid #d1fae5',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
                <rect x="9" y="9" width="6" height="6" rx="1"/>
                <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>🔌 Mesin Dialysis Terhubung</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>{detailedBed.machine.machineCode}</div>
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            <InfoItem label="Lantai" value={`Lantai ${detailedBed.floor}`} />
            <InfoItem
              label="Status Mesin"
              value={
                detailedBed.machine.status === 'IN_USE' ? '🔄 Sedang Digunakan'
                : detailedBed.machine.status === 'MAINTENANCE' ? '⚠️ Perbaikan'
                : '✅ Siap'
              }
            />
            {detailedBed.machine.notes && (
              <div style={{ gridColumn: '1 / -1' }}>
                <InfoItem label="Catatan Mesin" value={getNotesWithoutPrefix(detailedBed.machine.notes)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Active Schedules ── */}
      {activeSchedules.length > 0 && (
        <ScheduleSection
          title="👨‍⚕️ Perawat / Teknisi Bertugas Sekarang"
          titleColor="#1d4ed8"
          headerBg="linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)"
          schedules={activeSchedules}
          onDelete={onDeleteSchedule}
          now={now}
          showDelete
        />
      )}

      {/* ── Upcoming Schedules ── */}
      {upcomingSchedules.length > 0 && (
        <ScheduleSection
          title="⏳ Jadwal Mendatang"
          titleColor="#0369a1"
          headerBg="linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)"
          schedules={upcomingSchedules}
          onDelete={onDeleteSchedule}
          now={now}
          showDelete
        />
      )}

      {/* ── Past Schedules ── */}
      {pastSchedules.length > 0 && (
        <ScheduleSection
          title="📋 Riwayat Tugas Terakhir"
          titleColor="#475569"
          headerBg="linear-gradient(135deg, #475569 0%, #64748b 100%)"
          schedules={pastSchedules}
          onDelete={onDeleteSchedule}
          now={now}
          showDelete={false}
        />
      )}

      {activeSchedules.length === 0 && upcomingSchedules.length === 0 && (
        <div style={{
          background: '#f8fafc', border: '1px dashed #cbd5e1',
          borderRadius: 12, padding: '16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>📭</div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Belum ada jadwal penugasan aktif</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Klik tombol Edit untuk menambah jadwal perawat</div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, color: '#1e293b',
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all',
      }}>
        {value || '—'}
      </div>
    </div>
  );
}

function ScheduleSection({
  title, titleColor, headerBg, schedules, onDelete, now, showDelete,
}: {
  title: string; titleColor: string; headerBg: string;
  schedules: NurseSchedule[]; onDelete: (id: string) => void;
  now: Date; showDelete: boolean;
}) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: headerBg, padding: '8px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{title}</div>
      </div>
      <div style={{ padding: '4px 0' }}>
        {schedules.map((ns) => {
          const start = new Date(ns.startTime);
          const end = new Date(ns.endTime);
          const isActive = now >= start && now <= end;
          return (
            <div key={ns.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderBottom: '1px solid #f1f5f9',
              background: isActive ? 'rgba(29, 78, 216, 0.04)' : '#fff',
            }}>
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: ns.nurse.role === 'TECHNICIAN'
                  ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(135deg, #1e6fa6, #2d8fd6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: 'white',
              }}>
                {ns.nurse.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{ns.nurse.name}</span>
                  <ShiftBadge shift={ns.shift} />
                  {isActive && (
                    <span style={{ fontSize: 9, background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                      ● AKTIF
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                  {ns.nurse.role === 'TECHNICIAN' ? '🔧 Teknisi' : '👤 Perawat'} ·{' '}
                  {start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                  ⏰ {start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {ns.notes && (
                  <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>
                    "{ns.notes}"
                  </div>
                )}
              </div>
              {/* Delete */}
              {showDelete && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-icon"
                  onClick={() => onDelete(ns.id)}
                  title="Hapus jadwal"
                  style={{ flexShrink: 0 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main BedModal ─────────────────────────────────────────────────────────────
export default function BedModal({ bed, onClose, onSave }: BedModalProps) {
  // Determine initial view: if bed is occupied/has data → show info panel first
  const isBedAssigned = !!(bed.patientId || bed.machine || bed.status !== 'AVAILABLE');
  const [activeView, setActiveView] = useState<'info' | 'edit'>(isBedAssigned ? 'info' : 'edit');

  const [patientName, setPatientName] = useState(bed.patientName || '');
  const [patientId, setPatientId] = useState(bed.patientId || '');
  const [notes, setNotes] = useState(bed.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [nurseSearch, setNurseSearch] = useState('');
  const [showNurseSuggestions, setShowNurseSuggestions] = useState(false);
  const [machineSearch, setMachineSearch] = useState('');
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);

  const [detailedBed, setDetailedBed] = useState<Bed>(bed);
  const [nurses, setNurses] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  const [selectedPatientMr, setSelectedPatientMr] = useState(bed.patientId || '');
  const [selectedMachineId, setSelectedMachineId] = useState(bed.machine?.id || '');
  const [selectedNurseId, setSelectedNurseId] = useState('');

  const [scheduleStartDate, setScheduleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleEndDate, setScheduleEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleStartTime, setScheduleStartTime] = useState('08:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('14:00');
  const [scheduleNotes, setScheduleNotes] = useState('');

  const refreshBed = () => {
    fetch(`/api/beds/${bed.id}`)
      .then((res) => res.json())
      .then((data) => {
        setDetailedBed(data);
        if (data.machine) setSelectedMachineId(data.machine.id);
      })
      .catch(console.error);
  };

  useEffect(() => {
    refreshBed();
    fetch('/api/users?activeOnly=true')
      .then((res) => res.json())
      .then((data) => setNurses(data))
      .catch(console.error);
    fetch('/api/patients?limit=9999')
      .then((res) => res.json())
      .then((data) => setPatients(data.patients || []))
      .catch(console.error);
    fetch('/api/machines?limit=9999')
      .then((res) => res.json())
      .then((data) => setMachines(data.machines || []))
      .catch(console.error);
  }, [bed.id]);

  useEffect(() => {
    if (patients.length > 0 && selectedPatientMr) {
      if (selectedPatientMr === 'MAINTENANCE') {
        setPatientSearch('🔧 Perawatan / Perbaikan (Tanpa Pasien)');
      } else {
        const pat = patients.find((p) => p.mrNumber === selectedPatientMr);
        if (pat) setPatientSearch(`${pat.name} (${pat.mrNumber})`);
      }
    }
  }, [patients, selectedPatientMr]);

  useEffect(() => {
    if (nurses.length > 0 && selectedNurseId) {
      const nurse = nurses.find((n) => n.id === selectedNurseId);
      if (nurse) {
        setNurseSearch(`${nurse.name} (${nurse.role === 'ADMIN' ? 'Admin' : nurse.role === 'TECHNICIAN' ? 'Teknisi' : 'Staff'})`);
      }
    } else {
      setNurseSearch('');
    }
  }, [nurses, selectedNurseId]);

  useEffect(() => {
    if (machines.length > 0 && selectedMachineId) {
      const machine = machines.find((m) => m.id === selectedMachineId);
      if (machine) setMachineSearch(`${machine.machineCode} (Lantai ${machine.floor})`);
    } else {
      setMachineSearch('');
    }
  }, [machines, selectedMachineId]);

  const now = new Date();
  const activeSchedule = detailedBed.nurseSchedules?.find(
    (ns) => now >= new Date(ns.startTime) && now <= new Date(ns.endTime)
  );

  const handlePatientSelect = (mrNumber: string) => {
    setSelectedPatientMr(mrNumber);
    if (mrNumber === 'MAINTENANCE') {
      setPatientName('Perbaikan / Perawatan');
      setPatientId('MAINTENANCE');
      setNotes('Perawatan rutin mesin/bed');
    } else {
      const pat = patients.find((p) => p.mrNumber === mrNumber);
      if (pat) {
        setPatientName(pat.name);
        setPatientId(pat.mrNumber);
      } else {
        setPatientName('');
        setPatientId('');
        setNotes('');
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let computedStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' = 'AVAILABLE';
      if (selectedPatientMr === 'MAINTENANCE') computedStatus = 'MAINTENANCE';
      else if (selectedPatientMr) computedStatus = 'OCCUPIED';

      const payload: any = {
        status: computedStatus,
        patientName: selectedPatientMr === 'MAINTENANCE' ? null : patientName,
        patientId: selectedPatientMr === 'MAINTENANCE' ? null : patientId,
        notes,
        machineId: selectedMachineId,
      };

      if (selectedNurseId) {
        const startD = new Date(scheduleStartDate);
        const endD = new Date(scheduleEndDate);
        if (startD > endD) throw new Error('Tanggal mulai penugasan tidak boleh setelah tanggal selesai.');

        const dailySchedules = [];
        const currentD = new Date(startD);
        const [shHourStr, shMinStr] = scheduleStartTime.split(':');
        const shTotalMins = parseInt(shHourStr, 10) * 60 + parseInt(shMinStr, 10);
        let shiftVal = 'NIGHT';
        if (shTotalMins >= 6 * 60 + 30 && shTotalMins <= 12 * 60) shiftVal = 'MORNING';
        else if (shTotalMins >= 12 * 60 + 30 && shTotalMins <= 17 * 60 + 30) shiftVal = 'DAY';

        while (currentD <= endD) {
          const dateStr = currentD.toISOString().split('T')[0];
          const startIso = new Date(`${dateStr}T${scheduleStartTime}:00`).toISOString();
          let endIso: string;
          if (scheduleStartTime > scheduleEndTime) {
            const nextDay = new Date(currentD);
            nextDay.setDate(nextDay.getDate() + 1);
            endIso = new Date(`${nextDay.toISOString().split('T')[0]}T${scheduleEndTime}:00`).toISOString();
          } else {
            endIso = new Date(`${dateStr}T${scheduleEndTime}:00`).toISOString();
          }
          dailySchedules.push({ nurseId: selectedNurseId, startTime: startIso, endTime: endIso, shift: shiftVal, notes: scheduleNotes });
          currentD.setDate(currentD.getDate() + 1);
        }
        payload.nurseSchedules = dailySchedules;
      }

      const res = await fetch(`/api/beds/${bed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan data bed');
      }
      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!confirm('Apakah Anda yakin ingin mengosongkan bed ini? Tindakan ini akan melepas pasien, penugasan aktif, dan koneksi mesin.')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/beds/${bed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'AVAILABLE', unassignActiveSchedule: true,
          machineId: null, patientName: null, patientId: null, notes: '',
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Gagal melepas penugasan'); }
      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Gagal melepas penugasan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal perawat ini?')) return;
    try {
      const res = await fetch(`/api/nurse-schedules/${scheduleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus');
      refreshBed();
      const updatedRes = await fetch(`/api/beds/${bed.id}`);
      const updatedData = await updatedRes.json();
      setDetailedBed(updatedData);
      onSave(updatedData);
    } catch {
      alert('Gagal menghapus jadwal perawat.');
    }
  };

  const isMachineReady = (m: any) => {
    const hasRepairedPrefix = m.notes && m.notes.startsWith('[REPAIRED]');
    return m.status === 'AVAILABLE' && !hasRepairedPrefix;
  };

  const selectableMachines = machines.filter((m) => {
    const isSameFloor = m.floor === bed.floor;
    const isCurrentlyLinked = m.bedId === bed.id;
    const isUnassignedReady = !m.bedId && isMachineReady(m);
    return isSameFloor && (isCurrentlyLinked || isUnassignedReady);
  });

  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.mrNumber.toLowerCase().includes(q);
  });

  const selectableNurses = selectedPatientMr === 'MAINTENANCE'
    ? nurses.filter((n) => n.role === 'TECHNICIAN') : nurses;
  const filteredNurses = selectableNurses.filter((n) => {
    const q = nurseSearch.toLowerCase();
    const roleText = n.role === 'ADMIN' ? 'admin' : n.role === 'TECHNICIAN' ? 'teknisi' : 'staff';
    return n.name.toLowerCase().includes(q) || roleText.includes(q);
  });

  const filteredMachines = selectableMachines.filter((m) => {
    const q = machineSearch.toLowerCase();
    return m.machineCode.toLowerCase().includes(q) || (m.notes || '').toLowerCase().includes(q);
  });

  const getPatientLabel = (p: any) => {
    let tag = '';
    if (p.dead) tag = ' [💀 Dead]';
    else if (p.travelling) tag = ' [✈️ Travelling]';
    else if (p.moved) tag = ' [📦 Moved]';
    return `${p.name} (${p.mrNumber})${tag}`;
  };

  const step1Unlocked = true;
  const step2Unlocked = true;
  const step3Unlocked = true;
  const step4Unlocked = true;

  let displayStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' = 'AVAILABLE';
  if (selectedPatientMr === 'MAINTENANCE') displayStatus = 'MAINTENANCE';
  else if (selectedPatientMr) displayStatus = 'OCCUPIED';
  else if (activeSchedule?.nurse.role === 'TECHNICIAN') displayStatus = 'MAINTENANCE';

  const statusColors = {
    AVAILABLE:   { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
    OCCUPIED:    { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    MAINTENANCE: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  };
  const sc = statusColors[displayStatus];

  const stepStyle = (unlocked: boolean) => ({
    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
    padding: '16px', marginBottom: '16px',
    boxShadow: unlocked ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
    opacity: unlocked ? 1 : 0.5,
    pointerEvents: (unlocked ? 'auto' : 'none') as any,
    transition: 'all 0.2s ease-in-out',
  });

  const stepHeaderStyle = () => ({
    fontSize: '13px', fontWeight: 700, color: '#1e293b',
    marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
  });

  const stepBadgeStyle = (unlocked: boolean) => ({
    width: '20px', height: '20px', borderRadius: '50%',
    background: unlocked ? '#1e6fa6' : '#94a3b8',
    color: 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '11px', fontWeight: 700,
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: detailedBed.status === 'OCCUPIED'
                  ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                  : detailedBed.status === 'MAINTENANCE'
                  ? 'linear-gradient(135deg, #d97706, #f59e0b)'
                  : 'linear-gradient(135deg, #059669, #10b981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M2 20v-8a2 2 0 012-2h16a2 2 0 012 2v8M4 10V6a2 2 0 012-2h12a2 2 0 012 2v4M12 14v4"/>
                </svg>
              </div>
              <div>
                <div className="modal-title">Bed {bed.bedCode}</div>
                <div className="modal-subtitle">
                  Lantai {bed.floor} · {bed.section} · Posisi {bed.position}
                </div>
              </div>
            </div>

            {/* ── Tab Toggle ── */}
            {isBedAssigned && (
              <div style={{
                display: 'flex', gap: 0, marginTop: 12,
                background: '#f1f5f9', borderRadius: 8, padding: 3,
              }}>
                <button
                  type="button"
                  onClick={() => setActiveView('info')}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none',
                    background: activeView === 'info' ? '#fff' : 'transparent',
                    color: activeView === 'info' ? '#1e6fa6' : '#64748b',
                    fontWeight: activeView === 'info' ? 700 : 500,
                    fontSize: 12, cursor: 'pointer',
                    boxShadow: activeView === 'info' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  📊 Info Operasional
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('edit')}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none',
                    background: activeView === 'edit' ? '#fff' : 'transparent',
                    color: activeView === 'edit' ? '#1e6fa6' : '#64748b',
                    fontWeight: activeView === 'edit' ? 700 : 500,
                    fontSize: 12, cursor: 'pointer',
                    boxShadow: activeView === 'edit' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  ✏️ Edit / Tambah
                </button>
              </div>
            )}
          </div>
          <button className="modal-close" onClick={onClose} style={{ alignSelf: 'flex-start' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {error && <div className="error-alert" style={{ marginBottom: 16 }}>{error}</div>}

          {/* ══ INFO VIEW ══ */}
          {activeView === 'info' && (
            <BedInfoPanel
              detailedBed={detailedBed}
              patients={patients}
              onDeleteSchedule={handleDeleteSchedule}
              onEditClick={() => setActiveView('edit')}
              onUnassign={handleUnassign}
              saving={saving}
            />
          )}

          {/* ══ EDIT VIEW ══ */}
          {activeView === 'edit' && (
            <>
              {/* Reset / Kosongkan Bed */}
              {(detailedBed.patientId || activeSchedule || detailedBed.machine) && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px',
                  padding: '12px 16px', marginBottom: '16px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>Atur Ulang / Kosongkan Bed</div>
                    <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '2px' }}>
                      Lepas pasien, jadwal penugasan, dan mesin terhubung dari bed ini.
                    </div>
                  </div>
                  <button
                    type="button" className="btn btn-danger btn-sm"
                    style={{ background: '#ef4444', color: 'white', padding: '6px 12px', fontSize: '11px', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    onClick={handleUnassign} disabled={saving}
                  >
                    Kosongkan Bed
                  </button>
                </div>
              )}

              {/* Status visual */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
                padding: '10px 14px', borderRadius: 10,
                background: sc.bg, border: `1.5px solid ${sc.border}`,
              }}>
                <div style={{ width: 40, height: 20, borderRadius: 4, background: sc.bg, border: `2px solid ${sc.border}` }} />
                <div>
                  <div style={{ fontSize: 10, color: sc.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status Bed Hasil Pengisian
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>{statusLabels[displayStatus]}</div>
                </div>
              </div>

              {/* STEP 1 */}
              <div style={stepStyle(step1Unlocked)}>
                <div style={stepHeaderStyle()}>
                  <div style={stepBadgeStyle(step1Unlocked)}>1</div>
                  <span>👥 Pilih Pasien</span>
                </div>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                  <label className="form-label">Pasien Dialysis *</label>
                  <div className="relative" style={{ position: 'relative' }}>
                    <input
                      type="text" className="form-input" style={{ paddingRight: '36px' }}
                      placeholder="Cari nama atau nomor RM pasien..."
                      value={patientSearch}
                      onChange={(e) => { setPatientSearch(e.target.value); setShowPatientSuggestions(true); if (!e.target.value) handlePatientSelect(''); }}
                      onFocus={() => setShowPatientSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowPatientSuggestions(false);
                          if (selectedPatientMr) {
                            if (selectedPatientMr === 'MAINTENANCE') {
                              setPatientSearch('🔧 Perawatan / Perbaikan (Tanpa Pasien)');
                            } else {
                              const pat = patients.find((p) => p.mrNumber === selectedPatientMr);
                              if (pat) setPatientSearch(`${pat.name} (${pat.mrNumber})`);
                              else setPatientSearch('');
                            }
                          } else setPatientSearch('');
                        }, 200);
                      }}
                    />
                    {patientSearch && (
                      <button type="button" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px' }}
                        onClick={() => { setPatientSearch(''); handlePatientSelect(''); setShowPatientSuggestions(false); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>
                  {showPatientSuggestions && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 9999, maxHeight: '180px', overflowY: 'auto', marginTop: '4px' }}>
                      <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#d97706', background: '#fffbeb', cursor: 'pointer', borderBottom: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onMouseDown={() => { handlePatientSelect('MAINTENANCE'); setPatientSearch('🔧 Perawatan / Perbaikan (Tanpa Pasien)'); setShowPatientSuggestions(false); }}>
                        🔧 Perawatan / Perbaikan (Tanpa Pasien)
                      </div>
                      {filteredPatients.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Pasien tidak ditemukan</div>
                      ) : filteredPatients.map((p) => (
                        <div key={p.id} style={{ padding: '10px 12px', fontSize: '12px', cursor: 'pointer', background: selectedPatientMr === p.mrNumber ? '#eff6ff' : '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseDown={() => { handlePatientSelect(p.mrNumber); setPatientSearch(`${p.name} (${p.mrNumber})`); setShowPatientSuggestions(false); }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{p.name}</span>
                            <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '11px' }}>({p.mrNumber})</span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {p.dead && <span style={{ fontSize: '9px', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>💀 Dead</span>}
                            {p.travelling && <span style={{ fontSize: '9px', background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>✈️ Travel</span>}
                            {p.moved && <span style={{ fontSize: '9px', background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>📦 Moved</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2 */}
              <div style={stepStyle(step2Unlocked)}>
                <div style={stepHeaderStyle()}>
                  <div style={stepBadgeStyle(step2Unlocked)}>2</div>
                  <span>📝 Catatan Pasien</span>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{selectedPatientMr === 'MAINTENANCE' ? 'Catatan Kerusakan/Perbaikan *' : 'Catatan Pasien/Bed *'}</label>
                  <textarea className="form-textarea" placeholder={selectedPatientMr === 'MAINTENANCE' ? 'Jelaskan detail perbaikan/kalibrasi...' : 'Tambahkan catatan pasien dialisis...'} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>

              {/* STEP 3 */}
              <div style={stepStyle(step3Unlocked)}>
                <div style={stepHeaderStyle()}>
                  <div style={stepBadgeStyle(step3Unlocked)}>3</div>
                  <span>📅 Penugasan & Jadwal</span>
                </div>
                {activeSchedule && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {activeSchedule.nurse.name}
                        <span className={`badge badge-${activeSchedule.nurse.role === 'TECHNICIAN' ? 'maintenance' : 'staff'}`} style={{ fontSize: 8, padding: '1px 4px' }}>
                          {activeSchedule.nurse.role === 'TECHNICIAN' ? 'Teknisi' : 'Perawat'}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: '#1e40af', marginTop: 2 }}>
                        ⏰ {new Date(activeSchedule.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(activeSchedule.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({activeSchedule.shift === 'MORNING' ? 'Pagi 🌅' : activeSchedule.shift === 'DAY' ? 'Siang ☀️' : 'Malam 🌙'})
                      </div>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => handleDeleteSchedule(activeSchedule.id)}>Hapus</button>
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: selectedNurseId ? 12 : 0, position: 'relative' }}>
                  <label className="form-label">Tugaskan Pengguna Baru *</label>
                  <div className="relative" style={{ position: 'relative' }}>
                    <input type="text" className="form-input" style={{ paddingRight: '36px' }} placeholder="Cari perawat atau teknisi..."
                      value={nurseSearch}
                      onChange={(e) => { setNurseSearch(e.target.value); setShowNurseSuggestions(true); if (!e.target.value) setSelectedNurseId(''); }}
                      onFocus={() => setShowNurseSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowNurseSuggestions(false);
                          if (selectedNurseId) {
                            const nurse = nurses.find((n) => n.id === selectedNurseId);
                            if (nurse) setNurseSearch(`${nurse.name} (${nurse.role === 'ADMIN' ? 'Admin' : nurse.role === 'TECHNICIAN' ? 'Teknisi' : 'Staff'})`);
                            else setNurseSearch('');
                          } else setNurseSearch('');
                        }, 200);
                      }}
                    />
                    {nurseSearch && (
                      <button type="button" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px' }}
                        onClick={() => { setNurseSearch(''); setSelectedNurseId(''); setShowNurseSuggestions(false); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>
                  {showNurseSuggestions && step3Unlocked && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 9999, maxHeight: '180px', overflowY: 'auto', marginTop: '4px' }}>
                      {filteredNurses.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Pengguna tidak ditemukan</div>
                      ) : filteredNurses.map((n) => (
                        <div key={n.id} style={{ padding: '10px 12px', fontSize: '12px', cursor: 'pointer', background: selectedNurseId === n.id ? '#eff6ff' : '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseDown={() => { setSelectedNurseId(n.id); setNurseSearch(`${n.name} (${n.role === 'ADMIN' ? 'Admin' : n.role === 'TECHNICIAN' ? 'Teknisi' : 'Staff'})`); setShowNurseSuggestions(false); }}>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{n.name}</span>
                          <span className={`badge badge-${n.role === 'ADMIN' ? 'admin' : n.role === 'TECHNICIAN' ? 'maintenance' : 'staff'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                            {n.role === 'ADMIN' ? '🛡️ Admin' : n.role === 'TECHNICIAN' ? '🔧 Teknisi' : '👤 Staff'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedNurseId && (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Tgl Mulai</label>
                        <input type="date" className="form-input" style={{ padding: '6px 8px', fontSize: 12 }} value={scheduleStartDate} onChange={(e) => setScheduleStartDate(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Tgl Selesai</label>
                        <input type="date" className="form-input" style={{ padding: '6px 8px', fontSize: 12 }} value={scheduleEndDate} onChange={(e) => setScheduleEndDate(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Jam Mulai</label>
                        <input type="time" className="form-input" style={{ padding: '6px 8px', fontSize: 12 }} value={scheduleStartTime} onChange={(e) => setScheduleStartTime(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Jam Selesai</label>
                        <input type="time" className="form-input" style={{ padding: '6px 8px', fontSize: 12 }} value={scheduleEndTime} onChange={(e) => setScheduleEndTime(e.target.value)} />
                      </div>
                    </div>
                    {(() => {
                      const [h, m] = scheduleStartTime.split(':');
                      const total = parseInt(h, 10) * 60 + parseInt(m, 10);
                      let shiftText = 'Malam (NIGHT) 🌙'; let sbg = '#eff6ff'; let sborder = '#3b82f6'; let scolor = '#1d4ed8';
                      if (total >= 6 * 60 + 30 && total <= 12 * 60) { shiftText = 'Pagi (MORNING) 🌅'; sbg = '#fef3c7'; sborder = '#fbbf24'; scolor = '#d97706'; }
                      else if (total >= 12 * 60 + 30 && total <= 17 * 60 + 30) { shiftText = 'Siang (DAY) ☀️'; sbg = '#ecfdf5'; sborder = '#10b981'; scolor = '#047857'; }
                      return (
                        <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 6, background: sbg, border: `1.5px solid ${sborder}`, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span>Shift Terdeteksi:</span>
                          <span style={{ color: scolor, fontWeight: 700 }}>{shiftText}</span>
                        </div>
                      );
                    })()}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Catatan Jadwal</label>
                      <input type="text" className="form-input" placeholder="Misal: Pendampingan, Shift Siang" style={{ padding: '6px 8px', fontSize: 12 }} value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 4 */}
              <div style={stepStyle(step4Unlocked)}>
                <div style={stepHeaderStyle()}>
                  <div style={stepBadgeStyle(step4Unlocked)}>4</div>
                  <span>🔌 Hubungkan Mesin Dialysis</span>
                </div>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                  <label className="form-label">Pilih Mesin Dialysis *</label>
                  <div className="relative" style={{ position: 'relative' }}>
                    <input type="text" className="form-input" style={{ paddingRight: '36px' }} placeholder="Cari kode mesin atau catatan..."
                      value={machineSearch}
                      onChange={(e) => { setMachineSearch(e.target.value); setShowMachineSuggestions(true); if (!e.target.value) setSelectedMachineId(''); }}
                      onFocus={() => setShowMachineSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowMachineSuggestions(false);
                          if (selectedMachineId) {
                            const machine = machines.find((m) => m.id === selectedMachineId);
                            if (machine) setMachineSearch(`${machine.machineCode} (Lantai ${machine.floor})`);
                            else setMachineSearch('');
                          } else setMachineSearch('');
                        }, 200);
                      }}
                    />
                    {machineSearch && (
                      <button type="button" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px' }}
                        onClick={() => { setMachineSearch(''); setSelectedMachineId(''); setShowMachineSuggestions(false); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>
                  {showMachineSuggestions && step4Unlocked && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 9999, maxHeight: '180px', overflowY: 'auto', marginTop: '4px' }}>
                      {filteredMachines.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Mesin tidak ditemukan</div>
                      ) : filteredMachines.map((m) => (
                        <div key={m.id} style={{ padding: '10px 12px', fontSize: '12px', cursor: 'pointer', background: selectedMachineId === m.id ? '#eff6ff' : '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseDown={() => { setSelectedMachineId(m.id); setMachineSearch(`${m.machineCode} (Lantai ${m.floor})`); setShowMachineSuggestions(false); }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{m.machineCode}</span>
                            <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '11px' }}>Lantai {m.floor}</span>
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.notes ? getNotesWithoutPrefix(m.notes) : 'Ready'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectableMachines.length === 0 && step4Unlocked && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#ef4444' }}>
                      ⚠️ Tidak ada mesin berstatus READY yang tersedia di Lantai {bed.floor}.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 20px', background: '#f8fafc' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Batal</button>
          {activeView === 'edit' && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Menyimpan...</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Simpan
                </>
              )}
            </button>
          )}
          {activeView === 'info' && (
            <button className="btn btn-primary" onClick={() => setActiveView('edit')}>
              ✏️ Edit Data Bed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
