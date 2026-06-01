'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────── */
interface NurseSchedule {
  id: string;
  nurseId: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
  shift: string;
  nurse: { id: string; name: string; role: string; username?: string };
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
    id: string; machineCode: string;
    status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
    notes?: string | null;
  } | null;
  nurseSchedules?: NurseSchedule[];
}

interface NurseSlot {
  _key: string;           // local unique id for react key
  nurseId: string;
  nurseName: string;
  nurseRole: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  scheduleNotes: string;
}

interface BedModalProps {
  bed: Bed;
  onClose: () => void;
  onSave: (updated: Bed) => void;
}

/* ─── Helpers ────────────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Tersedia',
  OCCUPIED: 'Terisi / Pasien',
  MAINTENANCE: 'Perawatan / Perbaikan',
};

function stripRepairedPrefix(notes?: string | null) {
  if (!notes) return '';
  return notes.startsWith('[REPAIRED]') ? notes.replace('[REPAIRED]', '').trim() : notes;
}

function detectShift(startTime: string): { val: string; label: string; bg: string; color: string } {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m;
  if (total >= 6 * 60 + 30 && total <= 12 * 60)
    return { val: 'MORNING', label: 'Pagi 🌅', bg: '#fef3c7', color: '#d97706' };
  if (total >= 12 * 60 + 30 && total <= 17 * 60 + 30)
    return { val: 'DAY', label: 'Siang ☀️', bg: '#dcfce7', color: '#15803d' };
  return { val: 'NIGHT', label: 'Malam 🌙', bg: '#e0f2fe', color: '#0369a1' };
}

function ShiftBadge({ shift }: { shift: string }) {
  const map: Record<string, { text: string; bg: string; color: string }> = {
    MORNING: { text: 'Pagi 🌅',  bg: '#fef3c7', color: '#d97706' },
    DAY:     { text: 'Siang ☀️', bg: '#dcfce7', color: '#15803d' },
    NIGHT:   { text: 'Malam 🌙', bg: '#e0f2fe', color: '#0369a1' },
  };
  const s = map[shift] ?? map.NIGHT;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: s.bg, color: s.color }}>{s.text}</span>;
}

function Avatar({ name, gradient }: { name: string; gradient: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

function SectionHeader({ children, color = '#1e293b' }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  );
}

/* ─── Shift presets (aligned with Scheduler page) ───────────── */
const SHIFT_PRESETS = [
  { key: 'MORNING', label: 'Pagi',  emoji: '🌅', start: '07:00', end: '14:00', bg: '#fffbeb', border: '#fcd34d', color: '#b45309', badgeBg: '#fef3c7' },
  { key: 'DAY',     label: 'Siang', emoji: '☀️', start: '14:00', end: '21:00', bg: '#f0fdf4', border: '#86efac', color: '#15803d', badgeBg: '#dcfce7' },
  { key: 'NIGHT',   label: 'Malam', emoji: '🌙', start: '21:00', end: '07:00', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', badgeBg: '#dbeafe' },
  { key: 'CUSTOM',  label: 'Custom',emoji: '🕐', start: '08:00', end: '16:00', bg: '#f8fafc', border: '#cbd5e1', color: '#475569', badgeBg: '#f1f5f9' },
];

/* ─── Nurse Slot Card (inside Edit form) ─────────────────────── */
function NurseSlotCard({
  slot, nurses, index, onUpdate, onRemove,
}: {
  slot: NurseSlot; nurses: any[]; index: number;
  onUpdate: (key: string, patch: Partial<NurseSlot>) => void;
  onRemove: (key: string) => void;
}) {
  const [search,  setSearch]  = useState(slot.nurseName ? `${slot.nurseName} (${slot.nurseRole === 'TECHNICIAN' ? 'Teknisi' : slot.nurseRole === 'ADMIN' ? 'Admin' : 'Staff'})` : '');
  const [showSug, setShowSug] = useState(false);
  const [preset,  setPreset]  = useState<string>('MORNING');

  const filtered = nurses.filter((n) => {
    const q = search.toLowerCase();
    return n.name.toLowerCase().includes(q) || (n.role === 'TECHNICIAN' ? 'teknisi' : n.role === 'ADMIN' ? 'admin' : 'staff').includes(q);
  });

  const activePr = SHIFT_PRESETS.find((p) => p.key === preset) || SHIFT_PRESETS[0];

  const applyPreset = (p: typeof SHIFT_PRESETS[number]) => {
    setPreset(p.key);
    if (p.key !== 'CUSTOM') {
      const nextEndDate = p.key === 'NIGHT' ? (() => {
        const d = new Date(slot.startDate + 'T00:00:00'); d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })() : slot.startDate;
      onUpdate(slot._key, { startTime: p.start, endTime: p.end, endDate: nextEndDate });
    }
  };

  return (
    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 10 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1e6fa6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{index + 1}</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Perawat / Teknisi {index + 1}</span>
        </div>
        <button type="button" onClick={() => onRemove(slot._key)}
          style={{ width: 26, height: 26, borderRadius: 6, background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* ── Shift preset tabs ── */}
      <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 3, display: 'flex', gap: 0, marginBottom: 10 }}>
        {SHIFT_PRESETS.map((p) => (
          <button key={p.key} type="button" onClick={() => applyPreset(p)}
            style={{ flex: 1, padding: '5px 2px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10,
              background: preset === p.key ? '#fff' : 'transparent',
              color: preset === p.key ? p.color : '#64748b',
              fontWeight: preset === p.key ? 700 : 500,
              boxShadow: preset === p.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s' }}>
            {p.emoji} {p.label}
            {p.key !== 'CUSTOM' && <div style={{ fontSize: 8, color: preset === p.key ? p.color : '#94a3b8', marginTop: 1 }}>{p.start}–{p.end}</div>}
          </button>
        ))}
      </div>

      {/* Nurse search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Pilih Nama</label>
        <input type="text" className="form-input" style={{ fontSize: 12, padding: '7px 10px' }}
          placeholder="Cari perawat atau teknisi..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowSug(true); if (!e.target.value) onUpdate(slot._key, { nurseId: '', nurseName: '', nurseRole: '' }); }}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 200)}
        />
        {showSug && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', zIndex: 9999, maxHeight: 160, overflowY: 'auto', marginTop: 4 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Tidak ditemukan</div>
            ) : filtered.map((n) => {
              const roleLabel = n.role === 'TECHNICIAN' ? 'Teknisi' : n.role === 'ADMIN' ? 'Admin' : 'Staff';
              return (
                <div key={n.id}
                  style={{ padding: '9px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: slot.nurseId === n.id ? '#eff6ff' : '#fff' }}
                  onMouseDown={() => { onUpdate(slot._key, { nurseId: n.id, nurseName: n.name, nurseRole: n.role }); setSearch(`${n.name} (${roleLabel})`); setShowSug(false); }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{n.name}</span>
                  <span style={{ fontSize: 10, background: n.role === 'TECHNICIAN' ? '#fef3c7' : '#eff6ff', color: n.role === 'TECHNICIAN' ? '#d97706' : '#1d4ed8', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{roleLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Date range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Tgl Mulai</label>
          <input type="date" className="form-input" style={{ fontSize: 12, padding: '7px 8px' }} value={slot.startDate}
            onChange={(e) => {
              const nd = e.target.value;
              let ed = slot.endDate;
              if (preset === 'NIGHT') { const d = new Date(nd + 'T00:00:00'); d.setDate(d.getDate() + 1); ed = d.toISOString().split('T')[0]; }
              else if (preset !== 'CUSTOM') ed = nd;
              onUpdate(slot._key, { startDate: nd, endDate: ed });
            }} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Tgl Selesai</label>
          <input type="date" className="form-input" style={{ fontSize: 12, padding: '7px 8px' }} value={slot.endDate} min={slot.startDate}
            onChange={(e) => onUpdate(slot._key, { endDate: e.target.value })} />
        </div>
      </div>

      {/* Time — only shown in CUSTOM mode */}
      {preset === 'CUSTOM' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Jam Mulai</label>
            <input type="time" className="form-input" style={{ fontSize: 12, padding: '7px 8px' }} value={slot.startTime} onChange={(e) => onUpdate(slot._key, { startTime: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Jam Selesai</label>
            <input type="time" className="form-input" style={{ fontSize: 12, padding: '7px 8px' }} value={slot.endTime} onChange={(e) => onUpdate(slot._key, { endTime: e.target.value })} />
          </div>
        </div>
      )}

      {/* Shift summary pill */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: activePr.badgeBg, border: `1px solid ${activePr.border}`, fontSize: 11, fontWeight: 600, color: activePr.color, marginBottom: 8 }}>
        {activePr.emoji} Shift {activePr.label}: {slot.startTime || activePr.start} – {slot.endTime || activePr.end}
        {slot.startDate !== slot.endDate && <span style={{ fontWeight: 400 }}> ({slot.endDate})</span>}
      </div>

      {/* Notes */}
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Catatan Jadwal</label>
        <input type="text" className="form-input" style={{ fontSize: 12, padding: '7px 10px' }} placeholder="Misal: Pendampingan cuci darah sesi pagi"
          value={slot.scheduleNotes} onChange={(e) => onUpdate(slot._key, { scheduleNotes: e.target.value })} />
      </div>
    </div>
  );
}

/* ─── Info Panel (read-only view for occupied bed) ───────────── */

function BedInfoPanel({
  detailedBed, patients, onDeleteSchedule, onUnassign, saving,
}: {
  detailedBed: Bed; patients: any[];
  onDeleteSchedule: (id: string) => void;
  onUnassign: () => void; saving: boolean;
}) {
  const now = new Date();
  const activeSchedules = (detailedBed.nurseSchedules ?? []).filter((ns) => now >= new Date(ns.startTime) && now <= new Date(ns.endTime));
  const upcomingSchedules = (detailedBed.nurseSchedules ?? []).filter((ns) => now < new Date(ns.startTime));

  const patientDetail = patients.find((p) => p.mrNumber === detailedBed.patientId);

  const statusPalette = {
    AVAILABLE:   { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7', dot: '#22c55e' },
    OCCUPIED:    { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', dot: '#ef4444' },
    MAINTENANCE: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d', dot: '#f59e0b' },
  }[detailedBed.status];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Status banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: statusPalette.bg, border: `1.5px solid ${statusPalette.border}` }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusPalette.dot, boxShadow: `0 0 0 3px ${statusPalette.border}`, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: statusPalette.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status Bed</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: statusPalette.color }}>{STATUS_LABEL[detailedBed.status]}</div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={onUnassign} disabled={saving} style={{ fontSize: 11 }}>
          🗑️ Kosongkan
        </button>
      </div>

      {/* Patient card */}
      {detailedBed.patientId && detailedBed.patientId !== 'MAINTENANCE' && (
        <div style={{ background: '#fff', border: '1.5px solid #dbeafe', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#1e6fa6,#2563eb)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={detailedBed.patientName || '?'} gradient="rgba(255,255,255,0.25)" />
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>👥 Pasien Dialysis</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                {patientDetail?.title ? `${patientDetail.title}. ` : ''}{detailedBed.patientName}
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            <InfoRow label="No. Rekam Medis" value={detailedBed.patientId} mono />
            {patientDetail?.dateOfBirth && (
              <InfoRow label="Tgl Lahir" value={new Date(patientDetail.dateOfBirth).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
            )}
            <InfoRow label="NIK" value={patientDetail?.nik} mono />
            <InfoRow label="No. JKN / BPJS" value={patientDetail?.jknNumber} mono />
            {patientDetail?.initialAssessment && (
              <div style={{ gridColumn: '1/-1' }}><InfoRow label="Initial Assessment" value={patientDetail.initialAssessment} /></div>
            )}
            {(patientDetail?.dead || patientDetail?.travelling || patientDetail?.moved) && (
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 6 }}>
                {patientDetail?.dead && <span style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>💀 Dead</span>}
                {patientDetail?.travelling && <span style={{ fontSize: 10, background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>✈️ Travelling</span>}
                {patientDetail?.moved && <span style={{ fontSize: 10, background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>📦 Moved</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Maintenance banner */}
      {detailedBed.status === 'MAINTENANCE' && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28 }}>🔧</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>Mode Perawatan / Perbaikan</div>
            <div style={{ fontSize: 11, color: '#78350f', marginTop: 2 }}>Bed sedang dalam proses maintenance atau kalibrasi mesin.</div>
          </div>
        </div>
      )}

      {/* Notes */}
      {detailedBed.notes && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px' }}>
          <SectionHeader>📝 Catatan Bed</SectionHeader>
          <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>{detailedBed.notes}</div>
        </div>
      )}

      {/* Machine card */}
      {detailedBed.machine && (
        <div style={{ background: '#fff', border: '1.5px solid #d1fae5', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#059669,#10b981)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🔌 Mesin Terhubung</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{detailedBed.machine.machineCode}</div>
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            <InfoRow label="Lantai" value={`Lantai ${detailedBed.floor}`} />
            <InfoRow label="Status" value={detailedBed.machine.status === 'IN_USE' ? '🔄 Sedang Digunakan' : detailedBed.machine.status === 'MAINTENANCE' ? '⚠️ Perbaikan' : '✅ Siap'} />
            {detailedBed.machine.notes && (
              <div style={{ gridColumn: '1/-1' }}><InfoRow label="Catatan Mesin" value={stripRepairedPrefix(detailedBed.machine.notes)} /></div>
            )}
          </div>
        </div>
      )}

      {/* Active nurses */}
      {activeSchedules.length > 0 && (
        <ScheduleGroup title="👨‍⚕️ Sedang Bertugas Sekarang" headerBg="linear-gradient(135deg,#1d4ed8,#3b82f6)" schedules={activeSchedules} now={now} onDelete={onDeleteSchedule} showDelete />
      )}

      {/* Upcoming nurses */}
      {upcomingSchedules.length > 0 && (
        <ScheduleGroup title="⏳ Jadwal Mendatang" headerBg="linear-gradient(135deg,#0369a1,#0ea5e9)" schedules={upcomingSchedules} now={now} onDelete={onDeleteSchedule} showDelete />
      )}

      {/* Empty state */}
      {activeSchedules.length === 0 && upcomingSchedules.length === 0 && (
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>📭</div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Belum ada jadwal penugasan aktif</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Atur jadwal perawat melalui menu Scheduler</div>
        </div>
      )}
    </div>
  );
}

function ScheduleGroup({ title, headerBg, schedules, now, onDelete, showDelete }: {
  title: string; headerBg: string; schedules: NurseSchedule[];
  now: Date; onDelete: (id: string) => void; showDelete: boolean;
}) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: headerBg, padding: '8px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{title}</div>
      </div>
      {schedules.map((ns) => {
        const start = new Date(ns.startTime);
        const end   = new Date(ns.endTime);
        const isActive = now >= start && now <= end;
        const roleGrad = ns.nurse.role === 'TECHNICIAN' ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : 'linear-gradient(135deg,#1e6fa6,#2d8fd6)';
        return (
          <div key={ns.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: isActive ? 'rgba(29,78,216,0.03)' : '#fff' }}>
            <Avatar name={ns.nurse.name} gradient={roleGrad} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{ns.nurse.name}</span>
                <ShiftBadge shift={ns.shift} />
                {isActive && <span style={{ fontSize: 9, background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>● AKTIF</span>}
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                {ns.nurse.role === 'TECHNICIAN' ? '🔧 Teknisi' : '👤 Perawat'} ·{' '}
                {start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ·{' '}
                ⏰ {start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {ns.notes && <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>"{ns.notes}"</div>}
            </div>
            {showDelete && (
              <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={() => onDelete(ns.id)} title="Hapus jadwal" style={{ flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main BedModal ──────────────────────────────────────────── */
export default function BedModal({ bed, onClose, onSave }: BedModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const isBedAssigned = !!(bed.patientId || bed.machine || bed.status !== 'AVAILABLE');
  const [activeView, setActiveView] = useState<'info' | 'edit'>(isBedAssigned ? 'info' : 'edit');

  /* Data */
  const [detailedBed, setDetailedBed] = useState<Bed>(bed);
  const [nurses,   setNurses]   = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  /* Form state */
  const [selectedPatientMr,  setSelectedPatientMr]  = useState(bed.patientId || '');
  const [patientSearch,      setPatientSearch]       = useState('');
  const [showPatientSug,     setShowPatientSug]      = useState(false);
  const [selectedMachineId,  setSelectedMachineId]   = useState(bed.machine?.id || '');
  const [machineSearch,      setMachineSearch]       = useState('');
  const [showMachineSug,     setShowMachineSug]      = useState(false);
  const [notes,              setNotes]               = useState(bed.notes || '');

  /* Multi-nurse slots (max 5) */
  const makeSlot = (): NurseSlot => ({
    _key: Math.random().toString(36).slice(2),
    nurseId: '', nurseName: '', nurseRole: '',
    startDate: today, endDate: today,
    startTime: '08:00', endTime: '14:00',
    scheduleNotes: '',
  });
  const [nurseSlots, setNurseSlots] = useState<NurseSlot[]>([makeSlot()]);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  /* Load data */
  const refreshBed = useCallback(() => {
    fetch(`/api/beds/${bed.id}`).then((r) => r.json()).then((data) => {
      setDetailedBed(data);
      if (data.machine) setSelectedMachineId(data.machine.id);
    }).catch(console.error);
  }, [bed.id]);

  useEffect(() => {
    refreshBed();
    fetch('/api/users?activeOnly=true').then((r) => r.json()).then(setNurses).catch(console.error);
    fetch('/api/patients?limit=9999').then((r) => r.json()).then((d) => setPatients(d.patients || [])).catch(console.error);
    fetch('/api/machines?limit=9999').then((r) => r.json()).then((d) => setMachines(d.machines || [])).catch(console.error);
  }, [bed.id, refreshBed]);

  /* Sync patient search label when patients loaded */
  useEffect(() => {
    if (!patients.length || !selectedPatientMr) return;
    if (selectedPatientMr === 'MAINTENANCE') { setPatientSearch('🔧 Perawatan / Perbaikan (Tanpa Pasien)'); return; }
    const pat = patients.find((p) => p.mrNumber === selectedPatientMr);
    if (pat) setPatientSearch(`${pat.name} (${pat.mrNumber})`);
  }, [patients, selectedPatientMr]);

  /* Sync machine search label */
  useEffect(() => {
    if (!machines.length || !selectedMachineId) return;
    const m = machines.find((m) => m.id === selectedMachineId);
    if (m) setMachineSearch(`${m.machineCode} (Lantai ${m.floor})`);
  }, [machines, selectedMachineId]);

  /* Derived */
  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.mrNumber.toLowerCase().includes(q);
  });

  const isMachineReady = (m: any) => m.status === 'AVAILABLE' && !m.notes?.startsWith('[REPAIRED]');
  const selectableMachines = machines.filter((m) => m.floor === bed.floor && (m.bedId === bed.id || (!m.bedId && isMachineReady(m))));
  const filteredMachines = selectableMachines.filter((m) => {
    const q = machineSearch.toLowerCase();
    return m.machineCode.toLowerCase().includes(q) || (m.notes || '').toLowerCase().includes(q);
  });

  /* Select patient */
  const selectPatient = (mrNumber: string) => {
    setSelectedPatientMr(mrNumber);
    if (mrNumber === 'MAINTENANCE') {
      setNotes('Perawatan rutin mesin/bed');
    } else {
      const pat = patients.find((p) => p.mrNumber === mrNumber);
      if (!pat) setNotes('');
    }
  };

  /* Nurse slot helpers */
  const addNurseSlot = () => setNurseSlots((prev) => prev.length < 5 ? [...prev, makeSlot()] : prev);
  const removeNurseSlot = (key: string) => setNurseSlots((prev) => prev.length > 1 ? prev.filter((s) => s._key !== key) : prev);
  const updateNurseSlot = (key: string, patch: Partial<NurseSlot>) => setNurseSlots((prev) => prev.map((s) => s._key === key ? { ...s, ...patch } : s));

  /* Save */
  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      let computedStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' = 'AVAILABLE';
      if (selectedPatientMr === 'MAINTENANCE') computedStatus = 'MAINTENANCE';
      else if (selectedPatientMr) computedStatus = 'OCCUPIED';

      const pat = patients.find((p) => p.mrNumber === selectedPatientMr);

      const allNurseSchedules: any[] = [];
      for (const slot of nurseSlots) {
        if (!slot.nurseId) continue;
        const startD = new Date(slot.startDate);
        const endD   = new Date(slot.endDate);
        if (startD > endD) throw new Error(`Perawat ${slot.nurseName}: Tanggal mulai tidak boleh setelah tanggal selesai.`);
        const cur = new Date(startD);
        const shift = detectShift(slot.startTime);
        while (cur <= endD) {
          const dateStr = cur.toISOString().split('T')[0];
          const startIso = new Date(`${dateStr}T${slot.startTime}:00`).toISOString();
          let endIso: string;
          if (slot.startTime > slot.endTime) {
            const nd = new Date(cur); nd.setDate(nd.getDate() + 1);
            endIso = new Date(`${nd.toISOString().split('T')[0]}T${slot.endTime}:00`).toISOString();
          } else {
            endIso = new Date(`${dateStr}T${slot.endTime}:00`).toISOString();
          }
          allNurseSchedules.push({ nurseId: slot.nurseId, startTime: startIso, endTime: endIso, shift: shift.val, notes: slot.scheduleNotes || null });
          cur.setDate(cur.getDate() + 1);
        }
      }

      const payload: any = {
        status: computedStatus,
        patientName: selectedPatientMr === 'MAINTENANCE' ? null : (pat?.name || null),
        patientId: selectedPatientMr === 'MAINTENANCE' ? null : (selectedPatientMr || null),
        notes,
        machineId: selectedMachineId || null,
        ...(allNurseSchedules.length > 0 && { nurseSchedules: allNurseSchedules }),
      };

      const res = await fetch(`/api/beds/${bed.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Gagal menyimpan'); }
      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  /* Unassign */
  const handleUnassign = async () => {
    if (!confirm('Kosongkan bed ini? Pasien, jadwal aktif, dan mesin akan dilepas.')) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/beds/${bed.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'AVAILABLE', unassignActiveSchedule: true, machineId: null, patientName: null, patientId: null, notes: '' }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Gagal'); }
      onSave(await res.json()); onClose();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  /* Delete schedule */
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Hapus jadwal perawat ini?')) return;
    try {
      await fetch(`/api/nurse-schedules/${scheduleId}`, { method: 'DELETE' });
      refreshBed();
      const upd = await fetch(`/api/beds/${bed.id}`).then((r) => r.json());
      setDetailedBed(upd); onSave(upd);
    } catch { alert('Gagal menghapus jadwal.'); }
  };

  /* Computed status display */
  const displayStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' =
    selectedPatientMr === 'MAINTENANCE' ? 'MAINTENANCE' : selectedPatientMr ? 'OCCUPIED' : 'AVAILABLE';
  const sc = { AVAILABLE: { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' }, OCCUPIED: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' }, MAINTENANCE: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' } }[displayStatus];

  /* ── Render ── */
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540, maxHeight: '93vh', display: 'flex', flexDirection: 'column', padding: 0 }}>

        {/* ── HEADER ── */}
        <div style={{ padding: '18px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* Bed icon */}
            <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: detailedBed.status === 'OCCUPIED' ? 'linear-gradient(135deg,#dc2626,#ef4444)' : detailedBed.status === 'MAINTENANCE' ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 20v-8a2 2 0 012-2h16a2 2 0 012 2v8M4 10V6a2 2 0 012-2h12a2 2 0 012 2v4M12 14v4"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Bed {bed.bedCode}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Lantai {bed.floor} · {bed.section} · Posisi {bed.position}</div>
            </div>
            <button className="modal-close" onClick={onClose} style={{ flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{ height: 14 }} />
        </div>

        {/* ── BODY ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>
          {error && <div className="error-alert" style={{ marginBottom: 14 }}>{error}</div>}

          {/* ══ INFO VIEW ══ */}
          {activeView === 'info' && (
            <BedInfoPanel detailedBed={detailedBed} patients={patients} onDeleteSchedule={handleDeleteSchedule} onUnassign={handleUnassign} saving={saving} />
          )}

          {/* ══ EDIT VIEW ══ */}
          {activeView === 'edit' && (
            <div style={{ paddingBottom: 8 }}>

              {/* ── CURRENT DATA SUMMARY (shown when bed has existing data) ── */}
              {isBedAssigned && (
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>📋 Data Saat Ini (Sedang Aktif)</div>

                  {/* Patient chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', width: 70, flexShrink: 0 }}>Pasien</span>
                    {detailedBed.patientId && detailedBed.patientId !== 'MAINTENANCE' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: '4px 10px' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,#1e6fa6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>
                          {(detailedBed.patientName || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#1e40af' }}>{detailedBed.patientName}</span>
                        <span style={{ fontSize: 10, color: '#3b82f6' }}>({detailedBed.patientId})</span>
                      </div>
                    ) : detailedBed.patientId === 'MAINTENANCE' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 20, padding: '4px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>🔧 Mode Perbaikan</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Belum ada pasien</span>
                    )}
                  </div>

                  {/* Machine chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', width: 70, flexShrink: 0 }}>Mesin</span>
                    {detailedBed.machine ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '4px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>🔌 {detailedBed.machine.machineCode}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Belum ada mesin</span>
                    )}
                  </div>

                  {/* Notes */}
                  {detailedBed.notes && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8', width: 70, flexShrink: 0, paddingTop: 2 }}>Catatan</span>
                      <span style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', lineHeight: 1.4 }}>"{detailedBed.notes}"</span>
                    </div>
                  )}

                  {/* Active / upcoming nurse chips */}
                  {(() => {
                    const now = new Date();
                    const activeNurses = (detailedBed.nurseSchedules || []).filter(ns => now >= new Date(ns.startTime) && now <= new Date(ns.endTime));
                    const upcomingNurses = (detailedBed.nurseSchedules || []).filter(ns => now < new Date(ns.startTime));
                    const total = activeNurses.length + upcomingNurses.length;
                    return (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', width: 70, flexShrink: 0, paddingTop: total > 0 ? 4 : 0 }}>Perawat</span>
                        {total > 0 ? (
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {activeNurses.map(ns => (
                              <div key={ns.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 20, padding: '3px 9px' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d' }}>{ns.nurse.name}</span>
                              </div>
                            ))}
                            {upcomingNurses.map(ns => (
                              <div key={ns.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 20, padding: '3px 9px' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#0369a1' }}>⏳ {ns.nurse.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Belum ada penugasan aktif</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Unassign shortcut */}
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-danger btn-sm" style={{ fontSize: 10 }} onClick={handleUnassign} disabled={saving}>🗑️ Kosongkan Semua Data</button>
                  </div>
                </div>
              )}

              {/* ── Status preview ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '9px 14px', borderRadius: 10, background: sc.bg, border: `1.5px solid ${sc.border}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.border }} />
                <div>
                  <div style={{ fontSize: 9, color: sc.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status Setelah Disimpan</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>{STATUS_LABEL[displayStatus]}</div>
                </div>
              </div>


              {/* ─── SECTION 1: PASIEN ─── */}
              <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <SectionHeader color="#1e6fa6">👥 1. Pilih Pasien</SectionHeader>
                <div style={{ position: 'relative' }}>
                  <input type="text" className="form-input" placeholder="Cari nama atau No. MR pasien..."
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setShowPatientSug(true); if (!e.target.value) selectPatient(''); }}
                    onFocus={() => setShowPatientSug(true)}
                    onBlur={() => setTimeout(() => {
                      setShowPatientSug(false);
                      if (!selectedPatientMr) { setPatientSearch(''); return; }
                      if (selectedPatientMr === 'MAINTENANCE') { setPatientSearch('🔧 Perawatan / Perbaikan (Tanpa Pasien)'); return; }
                      const pat = patients.find((p) => p.mrNumber === selectedPatientMr);
                      setPatientSearch(pat ? `${pat.name} (${pat.mrNumber})` : '');
                    }, 200)}
                    style={{ paddingRight: patientSearch ? 36 : 12 }}
                  />
                  {patientSearch && (
                    <button type="button" onClick={() => { setPatientSearch(''); selectPatient(''); }}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                  {showPatientSug && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', zIndex: 9999, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                      <div onMouseDown={() => { selectPatient('MAINTENANCE'); setPatientSearch('🔧 Perawatan / Perbaikan (Tanpa Pasien)'); setShowPatientSug(false); }}
                        style={{ padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#d97706', background: '#fffbeb', cursor: 'pointer', borderBottom: '1px solid #fcd34d' }}>
                        🔧 Perawatan / Perbaikan (Tanpa Pasien)
                      </div>
                      {filteredPatients.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Pasien tidak ditemukan</div>
                      ) : filteredPatients.map((p) => (
                        <div key={p.id} onMouseDown={() => { selectPatient(p.mrNumber); setPatientSearch(`${p.name} (${p.mrNumber})`); setShowPatientSug(false); }}
                          style={{ padding: '9px 12px', fontSize: 12, cursor: 'pointer', background: selectedPatientMr === p.mrNumber ? '#eff6ff' : '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{p.name}</span>
                            <span style={{ color: '#64748b', marginLeft: 6, fontSize: 11 }}>({p.mrNumber})</span>
                          </div>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {p.dead && <span style={{ fontSize: 9, background: '#fee2e2', color: '#991b1b', padding: '2px 5px', borderRadius: 3, fontWeight: 700 }}>💀</span>}
                            {p.travelling && <span style={{ fontSize: 9, background: '#e0e7ff', color: '#3730a3', padding: '2px 5px', borderRadius: 3, fontWeight: 700 }}>✈️</span>}
                            {p.moved && <span style={{ fontSize: 9, background: '#f1f5f9', color: '#334155', padding: '2px 5px', borderRadius: 3, fontWeight: 700 }}>📦</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Notes */}
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    {selectedPatientMr === 'MAINTENANCE' ? 'Catatan Perbaikan' : 'Catatan Pasien / Bed'}
                  </label>
                  <textarea className="form-textarea" rows={2} placeholder={selectedPatientMr === 'MAINTENANCE' ? 'Jelaskan detail perbaikan / kalibrasi...' : 'Tambahkan catatan pasien dialisis...'} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              {/* ─── SECTION 2: MESIN ─── */}
              <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <SectionHeader color="#059669">🔌 2. Hubungkan Mesin Dialysis</SectionHeader>
                <div style={{ position: 'relative' }}>
                  <input type="text" className="form-input" placeholder="Cari kode mesin..."
                    value={machineSearch}
                    onChange={(e) => { setMachineSearch(e.target.value); setShowMachineSug(true); if (!e.target.value) setSelectedMachineId(''); }}
                    onFocus={() => setShowMachineSug(true)}
                    onBlur={() => setTimeout(() => {
                      setShowMachineSug(false);
                      if (selectedMachineId) {
                        const m = machines.find((m) => m.id === selectedMachineId);
                        setMachineSearch(m ? `${m.machineCode} (Lantai ${m.floor})` : '');
                      } else setMachineSearch('');
                    }, 200)}
                    style={{ paddingRight: machineSearch ? 36 : 12 }}
                  />
                  {machineSearch && (
                    <button type="button" onClick={() => { setMachineSearch(''); setSelectedMachineId(''); }}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                  {showMachineSug && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', zIndex: 9999, maxHeight: 160, overflowY: 'auto', marginTop: 4 }}>
                      {filteredMachines.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                          {selectableMachines.length === 0 ? `⚠️ Tidak ada mesin READY di Lantai ${bed.floor}` : 'Tidak ditemukan'}
                        </div>
                      ) : filteredMachines.map((m) => (
                        <div key={m.id} onMouseDown={() => { setSelectedMachineId(m.id); setMachineSearch(`${m.machineCode} (Lantai ${m.floor})`); setShowMachineSug(false); }}
                          style={{ padding: '9px 12px', fontSize: 12, cursor: 'pointer', background: selectedMachineId === m.id ? '#eff6ff' : '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div><span style={{ fontWeight: 600, color: '#1e293b' }}>{m.machineCode}</span><span style={{ color: '#64748b', marginLeft: 6, fontSize: 11 }}>Lantai {m.floor}</span></div>
                          <span style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>{m.notes ? stripRepairedPrefix(m.notes) : 'Ready'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedMachineId && (() => {
                  const m = machines.find((m) => m.id === selectedMachineId);
                  return m ? (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                      ✅ Terhubung: <strong>{m.machineCode}</strong> — Lantai {m.floor}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* ─── SECTION 3: NURSES ─── */}
              <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 4 }}>
                <SectionHeader color="#1d4ed8">👨‍⚕️ 3. Penugasan Perawat / Teknisi</SectionHeader>

                {/* ── Existing schedules (active + upcoming) ── */}
                {(() => {
                  const now = new Date();
                  const relevant = (detailedBed.nurseSchedules || []).filter(ns => now <= new Date(ns.endTime));
                  if (relevant.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Jadwal Terdaftar</span>
                        <span style={{ background: '#e2e8f0', color: '#475569', borderRadius: 10, padding: '1px 7px', fontSize: 9, fontWeight: 700 }}>{relevant.length} aktif/mendatang</span>
                      </div>
                      {relevant.map(ns => {
                        const start = new Date(ns.startTime);
                        const end = new Date(ns.endTime);
                        const isActive = now >= start && now <= end;
                        const roleGrad = ns.nurse.role === 'TECHNICIAN'
                          ? 'linear-gradient(135deg,#f59e0b,#fbbf24)'
                          : 'linear-gradient(135deg,#1e6fa6,#2d8fd6)';
                        return (
                          <div key={ns.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: isActive ? '#f0fdf4' : '#f8fafc', border: `1px solid ${isActive ? '#86efac' : '#e2e8f0'}`, borderRadius: 10, marginBottom: 6 }}>
                            <Avatar name={ns.nurse.name} gradient={roleGrad} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{ns.nurse.name}</span>
                                <ShiftBadge shift={ns.shift} />
                                {isActive
                                  ? <span style={{ fontSize: 9, background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>● AKTIF</span>
                                  : <span style={{ fontSize: 9, background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>⏳ Mendatang</span>
                                }
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                {ns.nurse.role === 'TECHNICIAN' ? '🔧 Teknisi' : '👤 Perawat'} ·{' '}
                                {start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                                ⏰ {start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {ns.notes && <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 1 }}>"{ns.notes}"</div>}
                            </div>
                            <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={() => handleDeleteSchedule(ns.id)} title="Hapus jadwal" style={{ flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                            </button>
                          </div>
                        );
                      })}
                      {/* Divider */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px' }}>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>Tambah Penugasan Baru</span>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                      </div>
                    </div>
                  );
                })()}

                {/* ── Add new slots header ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {(detailedBed.nurseSchedules || []).filter(ns => new Date() <= new Date(ns.endTime)).length === 0 ? '+ Tambah Penugasan' : '+ Penugasan Tambahan'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{nurseSlots.length}/5</span>
                    {nurseSlots.length < 5 && (
                      <button type="button" onClick={addNurseSlot}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, color: '#1d4ed8', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                        Tambah
                      </button>
                    )}
                  </div>
                </div>

                {nurseSlots.map((slot, i) => (
                  <NurseSlotCard key={slot._key} slot={slot} nurses={nurses} index={i} onUpdate={updateNurseSlot} onRemove={removeNurseSlot} />
                ))}

                {nurseSlots.length === 5 && (
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', padding: '6px 0' }}>
                    ℹ️ Maksimal 5 perawat/teknisi per sesi
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, borderRadius: '0 0 16px 16px' }}>
          <button className="btn btn-secondary" onClick={() => {
            if (activeView === 'edit' && isBedAssigned) {
              setActiveView('info');
            } else {
              onClose();
            }
          }} disabled={saving}>Batal</button>
          {activeView === 'info' && (
            <button className="btn btn-primary" onClick={() => setActiveView('edit')}>✏️ Edit Data Bed</button>
          )}
          {activeView === 'edit' && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Menyimpan...</> : <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Simpan
              </>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
