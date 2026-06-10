'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

/* ─── Types ──────────────────────────────────────────────────── */
interface NurseInfo  { id: string; name: string; role: string; username?: string }
interface PatientInfo { id: string; name: string; mrNumber: string; title?: string | null }

interface NurseScheduleItem {
  id: string; shift: string; startTime: string; endTime: string;
  notes?: string | null; nurse: NurseInfo;
}
interface PatientScheduleItem {
  id: string; bedId: string; patientId: string; patientName: string;
  sessionType: string; startTime: string; endTime: string; notes?: string | null;
}
interface BedData {
  id: string; bedCode: string; floor: number; section: string; position: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  patientName?: string | null; patientId?: string | null; notes?: string | null;
  machine?: { id: string; machineCode: string; status: string } | null;
  nurseSchedules:   NurseScheduleItem[];
  patientSchedules: PatientScheduleItem[];
}

/* ─── Constants ──────────────────────────────────────────────── */
const SHIFTS = [
  { key: 'MORNING', label: 'Pagi',  emoji: '🌅', timeRange: '06:30–11:30', defaultStart: '06:30', defaultEnd: '11:30', bg: '#fffbeb', border: '#fcd34d', color: '#b45309', headerBg: 'linear-gradient(135deg,#f59e0b,#fbbf24)', badgeBg: '#fef3c7' },
  { key: 'DAY',     label: 'Siang', emoji: '☀️', timeRange: '12:30–17:30', defaultStart: '12:30', defaultEnd: '17:30', bg: '#f0fdf4', border: '#86efac', color: '#15803d', headerBg: 'linear-gradient(135deg,#16a34a,#22c55e)', badgeBg: '#dcfce7' },
  { key: 'NIGHT',   label: 'Malam', emoji: '🌙', timeRange: '17:30–00:00', defaultStart: '17:30', defaultEnd: '00:00', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', headerBg: 'linear-gradient(135deg,#1e40af,#3b82f6)', badgeBg: '#dbeafe' },
];
const SESSION_PRESETS = [
  ...SHIFTS,
  { key: 'CUSTOM', label: 'Custom', emoji: '🕐', timeRange: '', defaultStart: '08:00', defaultEnd: '16:00', bg: '#f8fafc', border: '#cbd5e1', color: '#475569', headerBg: '#f1f5f9', badgeBg: '#f1f5f9' },
];
const STATUS_META = {
  AVAILABLE:   { dot: '#22c55e', bg: '#ecfdf5', text: '#059669', border: '#bbf7d0', label: 'Tersedia' },
  OCCUPIED:    { dot: '#ef4444', bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Terisi'   },
  MAINTENANCE: { dot: '#f59e0b', bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Perbaikan'},
};

/* ─── Helpers ────────────────────────────────────────────────── */
function todayStr() { return new Date().toISOString().split('T')[0]; }
function addDays(ds: string, n: number) {
  const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function fmtDate(ds: string) {
  return new Date(ds + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
function detectSessionKey(startTime: string): string {
  const [h, m] = startTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 'MORNING';
  const total = h * 60 + m;
  // < 12:30 is Pagi
  if (total < 12 * 60 + 30) return 'MORNING';
  // 12:30 to 17:30 is Siang
  if (total >= 12 * 60 + 30 && total < 17 * 60 + 30) return 'DAY';
  // >= 17:30 is Malam
  return 'NIGHT';
}
function ini(name: string) { return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2); }

/* ─── Nurse Chip ─────────────────────────────────────────────── */
function NurseChip({ schedule, onClick }: { schedule: NurseScheduleItem; onClick: () => void }) {
  const now = new Date();
  const isActive = now >= new Date(schedule.startTime) && now <= new Date(schedule.endTime);
  const grad = schedule.nurse.role === 'TECHNICIAN' ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : 'linear-gradient(135deg,#1e6fa6,#2d8fd6)';
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 16,
      background: isActive ? '#dcfce7' : '#fff', border: `1.5px solid ${isActive ? '#86efac' : '#e2e8f0'}`,
      cursor: 'pointer', marginBottom: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{ini(schedule.nurse.name)}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 85 }}>{schedule.nurse.name}</div>
        <div style={{ fontSize: 9, color: '#64748b' }}>{fmtTime(schedule.startTime)}–{fmtTime(schedule.endTime)}</div>
      </div>
      {isActive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />}
    </div>
  );
}

/* ─── Patient Chip ───────────────────────────────────────────── */
function PatientChip({ ps, onClick }: { ps: PatientScheduleItem; onClick: () => void }) {
  // Dynamically recalculate session type based on actual time to fix bad legacy data
  const timeBasedSessionKey = detectSessionKey(fmtTime(ps.startTime));
  const s = SESSION_PRESETS.find((x) => x.key === timeBasedSessionKey) || SESSION_PRESETS[0];
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 14,
      background: s.badgeBg, border: `1.5px solid ${s.border}`, cursor: 'pointer', marginBottom: 3 }}>
      <span style={{ fontSize: 11 }}>👤</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 85 }}>{ps.patientName}</div>
        <div style={{ fontSize: 9, color: s.color }}>{s.emoji} {s.label} · {fmtTime(ps.startTime)}–{fmtTime(ps.endTime)}</div>
      </div>
    </div>
  );
}

/* ═══ PATIENT SCHEDULE MODAL ════════════════════════════════════ */
function PatientScheduleModal({ bed, date, patients, onClose, onSaved }: {
  bed: BedData; date: string; patients: PatientInfo[];
  onClose: () => void; onSaved: () => void;
}) {
  const [session,     setSession]     = useState('MORNING');
  const [startDate,   setStartDate]   = useState(date);
  const [endDate,     setEndDate]     = useState(date);
  const [startTime,   setStartTime]   = useState('06:30');
  const [endTime,     setEndTime]     = useState('11:30');
  const [patSearch,   setPatSearch]   = useState('');
  const [showSug,     setShowSug]     = useState(false);
  const [selPatient,  setSelPatient]  = useState<PatientInfo | null>(null);
  const [notes,       setNotes]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // Dynamically detect shift based on user input startTime
  const detectedKey = detectSessionKey(startTime);
  const detectedSession = SESSION_PRESETS.find((s) => s.key === detectedKey) || SESSION_PRESETS[0];

  const filteredPats  = patients.filter((p) => {
    const q = patSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.mrNumber.toLowerCase().includes(q);
  });

  const applySession = (key: string) => {
    setSession(key);
    const sp = SESSION_PRESETS.find((s) => s.key === key)!;
    if (key !== 'CUSTOM') {
      setStartTime(sp.defaultStart);
      setEndTime(sp.defaultEnd);
      if (key === 'NIGHT') setEndDate(addDays(startDate, 1));
      else setEndDate(startDate);
    } else {
      setStartTime('08:00');
      setEndTime('16:00');
      setEndDate(startDate);
    }
  };

  // Dynamically update preset tab highlight based on time values
  useEffect(() => {
    if (startTime === '06:30' && endTime === '11:30') {
      setSession('MORNING');
    } else if (startTime === '12:30' && endTime === '17:30') {
      setSession('DAY');
    } else if (startTime === '17:30' && endTime === '00:00') {
      setSession('NIGHT');
    } else {
      setSession('CUSTOM');
    }
  }, [startTime, endTime]);

  useEffect(() => {
    if (session === 'NIGHT') setEndDate(addDays(startDate, 1));
    else if (session !== 'CUSTOM') setEndDate(startDate);
  }, [startDate]); // eslint-disable-line

  const handleSave = async () => {
    if (!selPatient) { setError('Pilih pasien terlebih dahulu.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/patient-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bedId: bed.id, 
          patientId: selPatient.mrNumber, 
          patientName: selPatient.name, 
          sessionType: detectedKey, // Follow user's input time!
          startDate, 
          endDate, 
          startTime, 
          endTime, 
          notes: notes || null 
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Gagal'); }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Jadwalkan Pasien</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{bed.bedCode} · Lantai {bed.floor} · {bed.section}</div>
            </div>
            <button className="modal-close" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Session tabs */}
          <div style={{ background: '#f1f5f9', borderRadius: 10, padding: 3, display: 'flex', marginBottom: 16 }}>
            {SESSION_PRESETS.map((s) => (
              <button key={s.key} type="button" onClick={() => applySession(s.key)}
                style={{ flex: 1, padding: '7px 4px', border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: session === s.key ? '#fff' : 'transparent',
                  color: session === s.key ? s.color : '#64748b',
                  fontWeight: session === s.key ? 700 : 500, fontSize: 10,
                  boxShadow: session === s.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {s.emoji} {s.label}
                {s.key !== 'CUSTOM' && <div style={{ fontSize: 8, color: session === s.key ? s.color : '#94a3b8', marginTop: 1 }}>{s.timeRange}</div>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 20px', overflowY: 'auto', maxHeight: '60vh' }}>
          {error && <div className="error-alert" style={{ marginBottom: 12 }}>{error}</div>}

          {/* Patient search */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Pilih Pasien *</label>
            <div style={{ position: 'relative' }}>
              <input type="text" className="form-input" placeholder="Cari nama atau No. MR..."
                value={patSearch}
                onChange={(e) => { setPatSearch(e.target.value); setShowSug(true); if (!e.target.value) setSelPatient(null); }}
                onFocus={() => setShowSug(true)}
                onBlur={() => setTimeout(() => { setShowSug(false); if (selPatient) setPatSearch(selPatient.name); }, 200)}
              />
              {showSug && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 9999, maxHeight: 180, overflowY: 'auto', marginTop: 4 }}>
                  {filteredPats.length === 0
                    ? <div style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Tidak ditemukan</div>
                    : filteredPats.map((p) => (
                      <div key={p.id} onMouseDown={() => { setSelPatient(p); setPatSearch(p.name); setShowSug(false); }}
                        style={{ padding: '9px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: selPatient?.id === p.id ? '#eff6ff' : '#fff' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{p.title ? `${p.title} ` : ''}{p.name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>MR: {p.mrNumber}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            {selPatient && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{ini(selPatient.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>{selPatient.name}</div>
                  <div style={{ fontSize: 10, color: '#16a34a' }}>MR: {selPatient.mrNumber}</div>
                </div>
                <button type="button" onClick={() => { setSelPatient(null); setPatSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Tanggal Mulai</label>
              <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Tanggal Selesai</label>
              <input type="date" className="form-input" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Time range — always visible, editable */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Jam Mulai</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <select className="form-input" value={(startTime || '00:00').split(':')[0]} onChange={(e) => setStartTime(`${e.target.value}:${(startTime || '00:00').split(':')[1]}`)} style={{ flex: 1, padding: '7px 8px', fontSize: 12 }}>
                  {Array.from({ length: 24 }).map((_, i) => {
                    const h = String(i).padStart(2, '0');
                    return <option key={h} value={h}>{h}</option>;
                  })}
                </select>
                <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>:</span>
                <select className="form-input" value={(startTime || '00:00').split(':')[1]} onChange={(e) => setStartTime(`${(startTime || '00:00').split(':')[0]}:${e.target.value}`)} style={{ flex: 1, padding: '7px 8px', fontSize: 12 }}>
                  {Array.from({ length: 60 }).map((_, i) => {
                    const m = String(i).padStart(2, '0');
                    return <option key={m} value={m}>{m}</option>;
                  })}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Jam Selesai</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <select className="form-input" value={(endTime || '00:00').split(':')[0]} onChange={(e) => setEndTime(`${e.target.value}:${(endTime || '00:00').split(':')[1]}`)} style={{ flex: 1, padding: '7px 8px', fontSize: 12 }}>
                  {Array.from({ length: 24 }).map((_, i) => {
                    const h = String(i).padStart(2, '0');
                    return <option key={h} value={h}>{h}</option>;
                  })}
                </select>
                <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>:</span>
                <select className="form-input" value={(endTime || '00:00').split(':')[1]} onChange={(e) => setEndTime(`${(endTime || '00:00').split(':')[0]}:${e.target.value}`)} style={{ flex: 1, padding: '7px 8px', fontSize: 12 }}>
                  {Array.from({ length: 60 }).map((_, i) => {
                    const m = String(i).padStart(2, '0');
                    return <option key={m} value={m}>{m}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Session summary */}
          <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: detectedSession.badgeBg, border: `1px solid ${detectedSession.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: detectedSession.color }}>
              {detectedSession.emoji} Shift {detectedSession.label}: {startTime} – {endTime}
              {session === 'CUSTOM' && <span style={{ fontStyle: 'italic', opacity: 0.8, fontWeight: 500 }}> (Kustom)</span>}
              {startDate !== endDate && <span style={{ fontWeight: 400 }}> · {startDate} → {endDate}</span>}
            </span>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Catatan (opsional)</label>
            <input type="text" className="form-input" placeholder="Misal: Sesi hemodialisis rutin" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !selPatient}>
            {saving ? 'Menyimpan...' : '📅 Jadwalkan Pasien'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ PATIENT SCHEDULE DETAIL MODAL ════════════════════════════ */
function PatientScheduleDetailModal({ ps, bed, onClose, onDeleted }: {
  ps: PatientScheduleItem; bed: BedData; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const actualSessionKey = detectSessionKey(fmtTime(ps.startTime));
  const s = SESSION_PRESETS.find((x) => x.key === actualSessionKey) || SESSION_PRESETS[0];

  const handleDelete = async () => {
    if (!confirm('Hapus jadwal pasien ini?')) return;
    setDeleting(true);
    await fetch(`/api/patient-schedules/${ps.id}`, { method: 'DELETE' });
    onDeleted(); onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380, padding: 0 }}>
        <div style={{ background: 'linear-gradient(135deg,#059669,#10b981)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{ps.patientName}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>MR: {ps.patientId} · {s.emoji} Sesi {s.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M2 20v-8a2 2 0 012-2h16a2 2 0 012 2v8M4 10V6a2 2 0 012-2h12a2 2 0 012 2v4"/></svg>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{bed.bedCode}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>Lantai {bed.floor} · {bed.section}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[{ label: 'Mulai', time: ps.startTime }, { label: 'Selesai', time: ps.endTime }].map(({ label, time }) => (
              <div key={label} style={{ background: s.badgeBg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 9, color: s.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{fmtTime(time)}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{new Date(time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
              </div>
            ))}
          </div>
          {ps.notes && <div style={{ padding: '9px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#475569', fontStyle: 'italic', marginBottom: 14 }}>"{ps.notes}"</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Tutup</button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={deleting}>{deleting ? 'Menghapus...' : '🗑️ Hapus'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ NURSE QUICK ASSIGN MODAL ══════════════════════════════════ */
function NurseAssignModal({ bed, shift, date, nurses, onClose, onSaved }: {
  bed: BedData; shift: typeof SHIFTS[number]; date: string;
  nurses: NurseInfo[]; onClose: () => void; onSaved: () => void;
}) {
  const [activeShift,  setActiveShift]  = useState(shift.key);
  const [startDate,    setStartDate]    = useState(date);
  const [endDate,      setEndDate]      = useState(date);
  const [startTime,    setStartTime]    = useState(shift.defaultStart);
  const [endTime,      setEndTime]      = useState(shift.defaultEnd);
  const [nurseSearch,  setNurseSearch]  = useState('');
  const [showSug,      setShowSug]      = useState(false);
  const [selNurse,     setSelNurse]     = useState<NurseInfo | null>(null);
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const scheduledPatientName = useMemo(() => {
    const ps = bed.patientSchedules.find((p) => p.sessionType === activeShift);
    if (ps) return ps.patientName;
    if (bed.patientSchedules.length > 0) return bed.patientSchedules[0].patientName;
    return bed.patientName || null;
  }, [bed, activeShift]);

  const applyShift = (s: typeof SHIFTS[number]) => {
    setActiveShift(s.key);
    setStartTime(s.defaultStart);
    setEndTime(s.defaultEnd);
    if (s.key === 'NIGHT') setEndDate(addDays(startDate, 1));
    else setEndDate(startDate);
  };
  useEffect(() => {
    if (activeShift === 'NIGHT') setEndDate(addDays(startDate, 1));
    else setEndDate(startDate);
  }, [startDate]); // eslint-disable-line

  useEffect(() => {
    const key = detectSessionKey(startTime);
    setActiveShift(key);
  }, [startTime]);

  const alreadyAssigned = bed.nurseSchedules.filter((s) => s.shift === activeShift).map((s) => s.nurse.id);
  const filteredNurses  = nurses.filter((n) => {
    const q = nurseSearch.toLowerCase();
    return n.name.toLowerCase().includes(q) || (n.username || '').toLowerCase().includes(q);
  });
  const activeSh = SHIFTS.find((s) => s.key === activeShift) || SHIFTS[0];

  const handleSave = async () => {
    if (!selNurse) { setError('Pilih perawat / teknisi.'); return; }
    if (alreadyAssigned.length >= 5) { setError('Maksimal 5 perawat per shift per bed.'); return; }
    if (alreadyAssigned.includes(selNurse.id)) { setError('Perawat sudah ditugaskan di shift ini.'); return; }
    setSaving(true); setError('');
    try {
      const sD = new Date(startDate), eD = new Date(endDate);
      const schedules: any[] = [];
      const cur = new Date(sD);
      while (cur <= eD) {
        const ds = cur.toISOString().split('T')[0];
        const isOver = startTime > endTime;
        const eds = isOver ? addDays(ds, 1) : ds;
        schedules.push({ nurseId: selNurse.id, startTime: new Date(`${ds}T${startTime}:00`).toISOString(), endTime: new Date(`${eds}T${endTime}:00`).toISOString(), shift: activeShift, notes: notes || null });
        cur.setDate(cur.getDate() + 1);
      }
      const res = await fetch(`/api/beds/${bed.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nurseSchedules: schedules }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Gagal'); }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460, padding: 0 }}>
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Tugaskan Perawat</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{bed.bedCode}{scheduledPatientName ? ` · ${scheduledPatientName}` : ''}</div>
            </div>
            <button className="modal-close" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Shift tabs */}
          <div style={{ background: '#f1f5f9', borderRadius: 10, padding: 3, display: 'flex', marginBottom: 16 }}>
            {SHIFTS.map((s) => (
              <button key={s.key} type="button" onClick={() => applyShift(s)}
                style={{ flex: 1, padding: '7px 4px', border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: activeShift === s.key ? '#fff' : 'transparent',
                  color: activeShift === s.key ? s.color : '#64748b',
                  fontWeight: activeShift === s.key ? 700 : 500, fontSize: 10,
                  boxShadow: activeShift === s.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {s.emoji} {s.label}
                <div style={{ fontSize: 9, color: activeShift === s.key ? s.color : '#94a3b8', marginTop: 1 }}>{s.timeRange}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 20px', overflowY: 'auto', maxHeight: '55vh' }}>
          {error && <div className="error-alert" style={{ marginBottom: 12 }}>{error}</div>}

          {/* Nurse search */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Pilih Perawat / Teknisi *</label>
            <div style={{ position: 'relative' }}>
              <input type="text" className="form-input" placeholder="Cari nama..."
                value={nurseSearch}
                onChange={(e) => { setNurseSearch(e.target.value); setShowSug(true); if (!e.target.value) setSelNurse(null); }}
                onFocus={() => setShowSug(true)}
                onBlur={() => setTimeout(() => { setShowSug(false); if (selNurse) setNurseSearch(selNurse.name); }, 200)}
              />
              {showSug && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 9999, maxHeight: 160, overflowY: 'auto', marginTop: 4 }}>
                  {filteredNurses.length === 0
                    ? <div style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Tidak ditemukan</div>
                    : filteredNurses.map((n) => {
                        const isAssigned = alreadyAssigned.includes(n.id);
                        return (
                          <div key={n.id} onMouseDown={() => { if (!isAssigned) { setSelNurse(n); setNurseSearch(n.name); setShowSug(false); } }}
                            style={{ padding: '9px 12px', fontSize: 12, cursor: isAssigned ? 'not-allowed' : 'pointer', opacity: isAssigned ? 0.45 : 1, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: selNurse?.id === n.id ? '#eff6ff' : '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 26, height: 26, borderRadius: 7, background: n.role === 'TECHNICIAN' ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : 'linear-gradient(135deg,#1e6fa6,#2d8fd6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{ini(n.name)}</div>
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{n.name}</span>
                              {isAssigned && <span style={{ fontSize: 9, color: '#dc2626', fontWeight: 700 }}>✓ sdh</span>}
                            </div>
                            <span style={{ fontSize: 10, background: n.role === 'TECHNICIAN' ? '#fef3c7' : '#eff6ff', color: n.role === 'TECHNICIAN' ? '#d97706' : '#1d4ed8', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>{n.role === 'TECHNICIAN' ? 'Teknisi' : 'Perawat'}</span>
                          </div>
                        );
                      })}
                </div>
              )}
            </div>
          </div>

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Tgl Mulai</label>
              <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Tgl Selesai</label>
              <input type="date" className="form-input" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Time range — always editable */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Jam Mulai</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <select className="form-input" value={(startTime || '00:00').split(':')[0]} onChange={(e) => setStartTime(`${e.target.value}:${(startTime || '00:00').split(':')[1]}`)} style={{ flex: 1, padding: '7px 8px', fontSize: 12 }}>
                  {Array.from({ length: 24 }).map((_, i) => {
                    const h = String(i).padStart(2, '0');
                    return <option key={h} value={h}>{h}</option>;
                  })}
                </select>
                <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>:</span>
                <select className="form-input" value={(startTime || '00:00').split(':')[1]} onChange={(e) => setStartTime(`${(startTime || '00:00').split(':')[0]}:${e.target.value}`)} style={{ flex: 1, padding: '7px 8px', fontSize: 12 }}>
                  {Array.from({ length: 60 }).map((_, i) => {
                    const m = String(i).padStart(2, '0');
                    return <option key={m} value={m}>{m}</option>;
                  })}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Jam Selesai</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <select className="form-input" value={(endTime || '00:00').split(':')[0]} onChange={(e) => setEndTime(`${e.target.value}:${(endTime || '00:00').split(':')[1]}`)} style={{ flex: 1, padding: '7px 8px', fontSize: 12 }}>
                  {Array.from({ length: 24 }).map((_, i) => {
                    const h = String(i).padStart(2, '0');
                    return <option key={h} value={h}>{h}</option>;
                  })}
                </select>
                <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>:</span>
                <select className="form-input" value={(endTime || '00:00').split(':')[1]} onChange={(e) => setEndTime(`${(endTime || '00:00').split(':')[0]}:${e.target.value}`)} style={{ flex: 1, padding: '7px 8px', fontSize: 12 }}>
                  {Array.from({ length: 60 }).map((_, i) => {
                    const m = String(i).padStart(2, '0');
                    return <option key={m} value={m}>{m}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, background: activeSh.badgeBg, border: `1px solid ${activeSh.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: activeSh.color }}>
              {activeSh.emoji} Shift {activeSh.label}: {startTime} – {endTime}
              {startDate !== endDate && <span style={{ fontWeight: 400 }}> · {startDate} → {endDate}</span>}
            </span>
          </div>

          {/* Slot count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {[1,2,3,4,5].map((n) => (
              <div key={n} style={{ flex: 1, height: 6, borderRadius: 3, background: n <= alreadyAssigned.length ? activeSh.color : '#e2e8f0' }} />
            ))}
            <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>{alreadyAssigned.length}/5 perawat</span>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Catatan (opsional)</label>
            <input type="text" className="form-input" placeholder="Misal: Pendampingan cuci darah sesi pagi" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {alreadyAssigned.length >= 5 && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>⚠️ Bed ini sudah memiliki 5 perawat di shift ini.</div>}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !selNurse || alreadyAssigned.length >= 5}>
            {saving ? 'Menyimpan...' : '✅ Tugaskan'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ NURSE SCHEDULE DETAIL MODAL ═══════════════════════════════ */
function NurseDetailModal({ schedule, bed, onClose, onDeleted }: { schedule: NurseScheduleItem; bed: BedData; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const shift = SHIFTS.find((s) => s.key === schedule.shift) || SHIFTS[0];
  const grad = schedule.nurse.role === 'TECHNICIAN' ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : 'linear-gradient(135deg,#1e6fa6,#2d8fd6)';
  
  const scheduledPatientName = useMemo(() => {
    const ps = bed.patientSchedules.find((p) => p.sessionType === schedule.shift);
    if (ps) return ps.patientName;
    if (bed.patientSchedules.length > 0) return bed.patientSchedules[0].patientName;
    return bed.patientName || null;
  }, [bed, schedule.shift]);

  const handleDelete = async () => {
    if (!confirm('Hapus jadwal ini?')) return;
    setDeleting(true);
    await fetch(`/api/nurse-schedules/${schedule.id}`, { method: 'DELETE' });
    onDeleted(); onClose();
  };
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380, padding: 0 }}>
        <div style={{ background: shift.headerBg, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{ini(schedule.nurse.name)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{schedule.nurse.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{schedule.nurse.role === 'TECHNICIAN' ? '🔧 Teknisi' : '👤 Perawat'} · {shift.emoji} Shift {shift.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M2 20v-8a2 2 0 012-2h16a2 2 0 012 2v8M4 10V6a2 2 0 012-2h12a2 2 0 012 2v4"/></svg>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{bed.bedCode}</div><div style={{ fontSize: 10, color: '#64748b' }}>Lantai {bed.floor} · {bed.section}{scheduledPatientName ? ` · ${scheduledPatientName}` : ''}</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[{ label: 'Mulai', time: schedule.startTime }, { label: 'Selesai', time: schedule.endTime }].map(({ label, time }) => (
              <div key={label} style={{ background: shift.bg, border: `1px solid ${shift.border}`, borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 9, color: shift.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{fmtTime(time)}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{new Date(time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
              </div>
            ))}
          </div>
          {schedule.notes && <div style={{ padding: '9px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#475569', fontStyle: 'italic', marginBottom: 12 }}>"{schedule.notes}"</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Tutup</button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={deleting}>{deleting ? 'Menghapus...' : '🗑️ Hapus Jadwal'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ══════════════════════════════════════════════════ */
export default function SchedulerPage() {
  const [date,            setDate]            = useState(todayStr);
  const [floorFilter,     setFloorFilter]     = useState('all');
  const [activeTab,       setActiveTab]       = useState<'beds' | 'nurses' | 'patients'>('beds');
  const [beds,            setBeds]            = useState<BedData[]>([]);
  const [nurses,          setNurses]          = useState<NurseInfo[]>([]);
  const [patients,        setPatients]        = useState<PatientInfo[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [nurseModal,      setNurseModal]      = useState<{ bed: BedData; shift: typeof SHIFTS[number] } | null>(null);
  const [nurseDetail,     setNurseDetail]     = useState<{ schedule: NurseScheduleItem; bed: BedData } | null>(null);
  const [patientModal,    setPatientModal]    = useState<{ bed: BedData } | null>(null);
  const [patientDetail,   setPatientDetail]   = useState<{ ps: PatientScheduleItem; bed: BedData } | null>(null);

  const fetchBeds = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/scheduler?date=${date}${floorFilter !== 'all' ? `&floor=${floorFilter}` : ''}`;
      const data = await fetch(url).then((r) => r.json());
      setBeds(Array.isArray(data) ? data : []);
    } catch { setBeds([]); }
    setLoading(false);
  }, [date, floorFilter]);

  useEffect(() => { fetchBeds(); }, [fetchBeds]);
  useEffect(() => {
    fetch('/api/users?activeOnly=true').then((r) => r.json()).then(setNurses).catch(() => {});
    fetch('/api/patients?limit=500').then((r) => r.json()).then((d) => setPatients(Array.isArray(d) ? d : (d.patients || []))).catch(() => {});
  }, []);

  // Stats
  const stats = useMemo(() => ({
    totalBeds:    beds.length,
    patientsToday: beds.reduce((s, b) => s + b.patientSchedules.length, 0),
    bedsWithNurse: beds.filter((b) => b.nurseSchedules.length > 0).length,
    uniqueNurses:  new Set(beds.flatMap((b) => b.nurseSchedules.map((s) => s.nurse.id))).size,
    totalNurseSch: beds.reduce((s, b) => s + b.nurseSchedules.length, 0),
    totalPatSch:   beds.reduce((s, b) => s + b.patientSchedules.length, 0),
  }), [beds]);

  // Nurse workload
  const nurseWorkload = useMemo(() => {
    const map = new Map<string, { nurse: NurseInfo; assignments: { bed: BedData; schedule: NurseScheduleItem }[] }>();
    for (const bed of beds) {
      for (const s of bed.nurseSchedules) {
        if (!map.has(s.nurse.id)) map.set(s.nurse.id, { nurse: s.nurse, assignments: [] });
        map.get(s.nurse.id)!.assignments.push({ bed, schedule: s });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.assignments.length - a.assignments.length);
  }, [beds]);

  // All patient schedules for the day (flat list, sorted by bed)
  const allPatientSchedules = useMemo(() =>
    beds.flatMap((b) => b.patientSchedules.map((ps) => ({ ps, bed: b })))
      .sort((a, b) => {
        if (a.bed.floor !== b.bed.floor) return a.bed.floor - b.bed.floor;
        const numA = parseInt(a.bed.bedCode.replace(/[^\d]/g, ''), 10) || 0;
        const numB = parseInt(b.bed.bedCode.replace(/[^\d]/g, ''), 10) || 0;
        return numA - numB;
      }),
    [beds]);

  const bedsByFloor = useMemo(() => {
    const map = new Map<number, BedData[]>();
    for (const b of beds) {
      if (!map.has(b.floor)) map.set(b.floor, []);
      map.get(b.floor)!.push(b);
    }
    map.forEach((floorBeds) => {
      floorBeds.sort((a: BedData, b: BedData) => {
        const numA = parseInt(a.bedCode.replace(/[^\d]/g, ''), 10) || 0;
        const numB = parseInt(b.bedCode.replace(/[^\d]/g, ''), 10) || 0;
        return numA - numB;
      });
    });
    return map;
  }, [beds]);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Scheduler</h1>
          <p className="page-subtitle">Manajemen jadwal pasien & perawat per bed</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        {/* Date navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '6px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <button onClick={() => setDate(addDays(date, -1))} style={{ width: 30, height: 30, border: 'none', borderRadius: 8, background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ textAlign: 'center', minWidth: 160 }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#1e293b', textAlign: 'center', outline: 'none', width: '100%' }} />
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{fmtDate(date)}</div>
          </div>
          <button onClick={() => setDate(addDays(date, 1))} style={{ width: 30, height: 30, border: 'none', borderRadius: 8, background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          {date !== todayStr() && (
            <button onClick={() => setDate(todayStr())} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: '#1e6fa6', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', marginLeft: 4 }}>Hari Ini</button>
          )}
        </div>

        {/* Floor filter */}
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
          {(['all', '2', '3'] as const).map((f) => (
            <button key={f} onClick={() => setFloorFilter(f)}
              style={{ padding: '6px 14px', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: floorFilter === f ? 700 : 500, fontSize: 12, background: floorFilter === f ? '#fff' : 'transparent', color: floorFilter === f ? '#1e6fa6' : '#64748b', boxShadow: floorFilter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
              {f === 'all' ? 'Semua Lantai' : `Lantai ${f}`}
            </button>
          ))}
        </div>

        {/* Shift legend */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {SHIFTS.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: s.badgeBg, border: `1px solid ${s.border}` }}>
              <span style={{ fontSize: 11 }}>{s.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.label} · {s.timeRange}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total Bed', value: stats.totalBeds, icon: '🛏️', color: '#1e6fa6', bg: '#eff6ff' },
          { label: 'Jadwal Pasien', value: stats.totalPatSch, icon: '👥', color: '#059669', bg: '#f0fdf4' },
          { label: 'Bed Ada Perawat', value: stats.bedsWithNurse, icon: '👨‍⚕️', color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Perawat Bertugas', value: stats.uniqueNurses, icon: '⭐', color: '#d97706', bg: '#fffbeb' },
          { label: 'Total Jadwal Ns', value: stats.totalNurseSch, icon: '📋', color: '#dc2626', bg: '#fef2f2' },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 16, width: 'fit-content' }}>
        {([
          { key: 'beds',     label: '🛏️ Timeline Bed' },
          { key: 'patients', label: '👥 Jadwal Pasien' },
          { key: 'nurses',   label: '👨‍⚕️ Jadwal Perawat' },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '8px 18px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: activeTab === t.key ? 700 : 500, fontSize: 13, background: activeTab === t.key ? '#fff' : 'transparent', color: activeTab === t.key ? '#1e6fa6' : '#64748b', boxShadow: activeTab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, gap: 12 }}>
          <span className="spinner" /><span style={{ color: '#64748b', fontSize: 13 }}>Memuat data...</span>
        </div>
      )}

      {/* ══ BED TIMELINE ══ */}
      {!loading && activeTab === 'beds' && (
        <div style={{ overflowX: 'auto' }}>
          {beds.length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}><div style={{ fontSize: 40 }}>📭</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Tidak ada bed</div></div>
            : Array.from(bedsByFloor.entries()).map(([floor, floorBeds]) => (
              <div key={floor} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ padding: '4px 14px', background: 'linear-gradient(135deg,#1e6fa6,#2563eb)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>🏥 Lantai {floor}</div>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{floorBeds.length} bed</span>
                </div>

                <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 1fr', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    <div style={{ padding: '10px 14px', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderRight: '1px solid #e2e8f0' }}>Bed / Pasien Terjadwal</div>
                    {SHIFTS.map((shift) => (
                      <div key={shift.key} style={{ padding: '10px 14px', borderRight: '1px solid #e2e8f0', background: shift.badgeBg }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: shift.color }}>{shift.emoji} {shift.label}</div>
                        <div style={{ fontSize: 10, color: shift.color, opacity: 0.75 }}>{shift.timeRange}</div>
                      </div>
                    ))}
                  </div>

                  {/* Bed rows */}
                  {floorBeds.map((bed, idx) => {
                    const sm = STATUS_META[bed.status];
                    const todayPatients = bed.patientSchedules;
                    return (
                      <div key={bed.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 1fr', borderBottom: idx < floorBeds.length - 1 ? '1px solid #f1f5f9' : 'none', minHeight: 80 }}>
                        {/* Bed info */}
                        <div style={{ padding: '10px 12px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fafafa' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: sm.dot, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{bed.bedCode}</span>
                            </div>
                            {/* Scheduled patients for today */}
                            {todayPatients.length > 0
                              ? todayPatients.map((ps) => (
                                <PatientChip key={ps.id} ps={ps} onClick={() => setPatientDetail({ ps, bed })} />
                              ))
                              : <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginBottom: 4 }}>Belum ada pasien terjadwal</div>
                            }
                            {bed.machine && <div style={{ fontSize: 9, color: '#059669', fontWeight: 600 }}>🔌 {bed.machine.machineCode}</div>}
                          </div>
                          {/* Schedule patient button */}
                          <button onClick={() => setPatientModal({ bed })}
                            style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '1.5px dashed #86efac', borderRadius: 12, background: 'transparent', color: '#059669', fontSize: 9, fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                            Jadwalkan Pasien
                          </button>
                        </div>

                        {/* Shift columns */}
                        {SHIFTS.map((shift) => {
                          const shiftNurses = bed.nurseSchedules.filter((s) => s.shift === shift.key);
                          const canAdd = shiftNurses.length < 5;
                          return (
                            <div key={shift.key} style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0', background: shiftNurses.length > 0 ? `${shift.bg}99` : '#fff' }}>
                              {shiftNurses.map((s) => <NurseChip key={s.id} schedule={s} onClick={() => setNurseDetail({ schedule: s, bed })} />)}
                              {canAdd && (
                                <button onClick={() => setNurseModal({ bed, shift })}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: `1.5px dashed ${shift.border}`, borderRadius: 14, background: 'transparent', color: shift.color, fontSize: 9, fontWeight: 700, cursor: 'pointer', opacity: shiftNurses.length === 0 ? 0.5 : 1, marginTop: shiftNurses.length > 0 ? 2 : 0 }}>
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                                  Tugaskan
                                </button>
                              )}
                              {!canAdd && <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>Max 5</div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ══ PATIENT SCHEDULES TAB ══ */}
      {!loading && activeTab === 'patients' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
              {allPatientSchedules.length > 0 ? `${allPatientSchedules.length} jadwal pasien untuk ${fmtDate(date)}` : `Belum ada jadwal pasien untuk ${fmtDate(date)}`}
            </div>
          </div>

          {allPatientSchedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Belum ada pasien yang dijadwalkan</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Buka tab Timeline Bed dan klik "Jadwalkan Pasien" di bed yang diinginkan</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {allPatientSchedules.map(({ ps, bed }) => {
                const s = SESSION_PRESETS.find((x) => x.key === ps.sessionType) || SESSION_PRESETS[0];
                const sm = STATUS_META[bed.status];
                return (
                  <div key={ps.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {/* Header */}
                    <div style={{ background: `linear-gradient(135deg,#059669,#10b981)`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{ps.patientName}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>MR: {ps.patientId}</div>
                      </div>
                      <div style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', fontSize: 10, color: '#fff', fontWeight: 700 }}>{s.emoji} {s.label}</div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: sm.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{bed.bedCode}</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Lantai {bed.floor} · {bed.section}</span>
                        {bed.machine && <span style={{ fontSize: 10, color: '#059669', fontWeight: 600, marginLeft: 'auto' }}>🔌 {bed.machine.machineCode}</span>}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                        {[{ label: 'Mulai', time: ps.startTime }, { label: 'Selesai', time: ps.endTime }].map(({ label, time }) => (
                          <div key={label} style={{ background: s.badgeBg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '7px 10px' }}>
                            <div style={{ fontSize: 9, color: s.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{fmtTime(time)}</div>
                            <div style={{ fontSize: 9, color: '#64748b' }}>{new Date(time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                          </div>
                        ))}
                      </div>

                      {ps.notes && <div style={{ padding: '7px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, color: '#475569', fontStyle: 'italic', marginBottom: 10 }}>"{ps.notes}"</div>}

                      <button className="btn btn-danger" style={{ width: '100%', fontSize: 12 }} onClick={() => setPatientDetail({ ps, bed })}>
                        Lihat Detail / Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ NURSE WORKLOAD TAB ══ */}
      {!loading && activeTab === 'nurses' && (
        <div>
          {nurseWorkload.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍⚕️</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Belum ada perawat yang dijadwalkan</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
              {nurseWorkload.map(({ nurse, assignments }) => {
                const byShift = SHIFTS.map((s) => ({ shift: s, items: assignments.filter((a) => a.schedule.shift === s.key) }));
                const totalBeds = new Set(assignments.map((a) => a.bed.id)).size;
                const wColor = totalBeds <= 2 ? '#22c55e' : totalBeds <= 4 ? '#f59e0b' : '#ef4444';
                const grad = nurse.role === 'TECHNICIAN' ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : 'linear-gradient(135deg,#1e6fa6,#2d8fd6)';
                return (
                  <div key={nurse.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{ini(nurse.name)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{nurse.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{nurse.role === 'TECHNICIAN' ? '🔧 Teknisi' : '👤 Perawat / Staff'}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: wColor }}>{totalBeds}</div>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>/ 5 bed</div>
                      </div>
                    </div>
                    <div style={{ height: 3, background: '#f1f5f9' }}>
                      <div style={{ height: '100%', width: `${Math.min((totalBeds / 5) * 100, 100)}%`, background: wColor }} />
                    </div>
                    <div style={{ padding: '10px 16px 14px' }}>
                      {byShift.map(({ shift, items }) => items.length > 0 && (
                        <div key={shift.key} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: shift.color, marginBottom: 4 }}>{shift.emoji} {shift.label} ({items.length} bed)</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {items.map(({ bed, schedule }) => {
                              const scheduledPatName = (() => {
                                const ps = bed.patientSchedules.find((p) => p.sessionType === schedule.shift);
                                if (ps) return ps.patientName;
                                if (bed.patientSchedules.length > 0) return bed.patientSchedules[0].patientName;
                                return bed.patientName || null;
                              })();
                              return (
                                <div key={schedule.id} onClick={() => setNurseDetail({ schedule, bed })}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: shift.badgeBg, border: `1px solid ${shift.border}`, borderRadius: 16, cursor: 'pointer' }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={shift.color} strokeWidth="2.5"><path d="M2 20v-8a2 2 0 012-2h16a2 2 0 012 2v8"/><path d="M4 10V6a2 2 0 012-2h12a2 2 0 012 2v4"/></svg>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: shift.color }}>{bed.bedCode}</span>
                                  {scheduledPatName && <span style={{ fontSize: 9, color: shift.color, opacity: 0.7 }}>· {scheduledPatName.split(' ')[0]}</span>}
                                  <span style={{ fontSize: 9, color: shift.color, opacity: 0.6 }}>· {fmtTime(schedule.startTime)}-{fmtTime(schedule.endTime)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {nurseModal && <NurseAssignModal bed={nurseModal.bed} shift={nurseModal.shift} date={date} nurses={nurses} onClose={() => setNurseModal(null)} onSaved={fetchBeds} />}
      {nurseDetail && <NurseDetailModal schedule={nurseDetail.schedule} bed={nurseDetail.bed} onClose={() => setNurseDetail(null)} onDeleted={fetchBeds} />}
      {patientModal && <PatientScheduleModal bed={patientModal.bed} date={date} patients={patients} onClose={() => setPatientModal(null)} onSaved={fetchBeds} />}
      {patientDetail && <PatientScheduleDetailModal ps={patientDetail.ps} bed={patientDetail.bed} onClose={() => setPatientDetail(null)} onDeleted={fetchBeds} />}
    </div>
  );
}
