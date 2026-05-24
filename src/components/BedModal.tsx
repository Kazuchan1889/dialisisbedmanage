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

export default function BedModal({ bed, onClose, onSave }: BedModalProps) {
  const [patientName, setPatientName] = useState(bed.patientName || '');
  const [patientId, setPatientId] = useState(bed.patientId || '');
  const [notes, setNotes] = useState(bed.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Detailed bed details (includes recent schedules), nurse list, patient list, and machine list
  const [detailedBed, setDetailedBed] = useState<Bed>(bed);
  const [nurses, setNurses] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  
  // Selection States
  const [selectedPatientMr, setSelectedPatientMr] = useState(bed.patientId || '');
  const [selectedMachineId, setSelectedMachineId] = useState(bed.machine?.id || '');
  const [selectedNurseId, setSelectedNurseId] = useState('');

  // Schedule States
  const [scheduleStartDate, setScheduleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleEndDate, setScheduleEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleStartTime, setScheduleStartTime] = useState('08:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('14:00');
  const [scheduleNotes, setScheduleNotes] = useState('');

  useEffect(() => {
    // Fetch detailed bed with recent schedules
    fetch(`/api/beds/${bed.id}`)
      .then((res) => res.json())
      .then((data) => {
        setDetailedBed(data);
        if (data.machine) {
          setSelectedMachineId(data.machine.id);
        }
      })
      .catch(console.error);

    // Fetch active users (staff, technician, admin)
    fetch('/api/users?activeOnly=true')
      .then((res) => res.json())
      .then((data) => setNurses(data))
      .catch(console.error);

    // Fetch patients list
    fetch('/api/patients?limit=9999')
      .then((res) => res.json())
      .then((data) => setPatients(data.patients || []))
      .catch(console.error);

    // Fetch machines list
    fetch('/api/machines?limit=9999')
      .then((res) => res.json())
      .then((data) => setMachines(data.machines || []))
      .catch(console.error);
  }, [bed.id]);

  // Find active schedule (if any)
  const now = new Date();
  const activeSchedule = detailedBed.nurseSchedules?.find((ns) => {
    return now >= new Date(ns.startTime) && now <= new Date(ns.endTime);
  });

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
    // Validation based on sequential flow
    if (!selectedPatientMr) {
      setError('Langkah 1: Silakan pilih pasien terlebih dahulu.');
      return;
    }
    if (notes.trim().length === 0) {
      setError('Langkah 2: Silakan isi catatan terlebih dahulu.');
      return;
    }
    if (!selectedNurseId && !activeSchedule) {
      setError('Langkah 3: Silakan tentukan penugasan dan jadwal terlebih dahulu.');
      return;
    }
    if (!selectedMachineId) {
      setError('Langkah 4: Silakan hubungkan mesin dialysis terlebih dahulu.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Map status automatically based on patient selection
      let computedStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' = 'AVAILABLE';
      if (selectedPatientMr === 'MAINTENANCE') {
        computedStatus = 'MAINTENANCE';
      } else if (selectedPatientMr) {
        computedStatus = 'OCCUPIED';
      }

      const payload: any = {
        status: computedStatus,
        patientName: selectedPatientMr === 'MAINTENANCE' ? null : patientName,
        patientId: selectedPatientMr === 'MAINTENANCE' ? null : patientId,
        notes,
        machineId: selectedMachineId,
      };

      // Add nurse schedule if selected
      if (selectedNurseId) {
        const startD = new Date(scheduleStartDate);
        const endD = new Date(scheduleEndDate);

        if (startD > endD) {
          throw new Error('Tanggal mulai penugasan tidak boleh setelah tanggal selesai.');
        }

        const dailySchedules = [];
        const currentD = new Date(startD);

        const startHour = parseInt(scheduleStartTime.split(':')[0], 10);
        const shiftVal = (startHour >= 6 && startHour < 18) ? 'DAY' : 'NIGHT';

        while (currentD <= endD) {
          const dateStr = currentD.toISOString().split('T')[0];
          const startIso = new Date(`${dateStr}T${scheduleStartTime}:00`).toISOString();
          
          let endIso = '';
          if (scheduleStartTime > scheduleEndTime) {
            // Shift crosses midnight
            const nextDay = new Date(currentD);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDayStr = nextDay.toISOString().split('T')[0];
            endIso = new Date(`${nextDayStr}T${scheduleEndTime}:00`).toISOString();
          } else {
            endIso = new Date(`${dateStr}T${scheduleEndTime}:00`).toISOString();
          }

          dailySchedules.push({
            nurseId: selectedNurseId,
            startTime: startIso,
            endTime: endIso,
            shift: shiftVal,
            notes: scheduleNotes,
          });

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
      setError(e.message || 'Gagal menyimpan perubahan. Coba lagi.');
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
          status: 'AVAILABLE',
          unassignActiveSchedule: true,
          machineId: null,
          patientName: null,
          patientId: null,
          notes: '',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal melepas penugasan');
      }

      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Gagal melepas penugasan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal perawat ini?')) return;
    try {
      const res = await fetch(`/api/nurse-schedules/${scheduleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      
      // Refresh detailed bed and notify parent
      const updatedRes = await fetch(`/api/beds/${bed.id}`);
      const updatedData = await updatedRes.json();
      setDetailedBed(updatedData);
      onSave(updatedData);
    } catch (e) {
      alert('Gagal menghapus jadwal perawat.');
    }
  };

  // Determine Machine ready state
  const isMachineReady = (m: any) => {
    const hasRepairedPrefix = m.notes && m.notes.startsWith('[REPAIRED]');
    const isAvailable = m.status === 'AVAILABLE';
    return isAvailable && !hasRepairedPrefix;
  };

  // Filter machines: same floor, and (is currently linked to this bed OR (is ready AND unassigned))
  const selectableMachines = machines.filter((m) => {
    const isSameFloor = m.floor === bed.floor;
    const isCurrentlyLinkedToThisBed = m.bedId === bed.id;
    const isUnassignedAndReady = !m.bedId && isMachineReady(m);
    return isSameFloor && (isCurrentlyLinkedToThisBed || isUnassignedAndReady);
  });

  // Filter patient list to show tags
  const getPatientLabel = (p: any) => {
    let tag = '';
    if (p.dead) tag = ' [💀 Dead]';
    else if (p.travelling) tag = ' [✈️ Travelling]';
    else if (p.moved) tag = ' [📦 Moved]';
    return `${p.name} (${p.mrNumber})${tag}`;
  };

  // Filter nurses depending on clinical or maintenance mode
  const selectableNurses = selectedPatientMr === 'MAINTENANCE'
    ? nurses.filter((n) => n.role === 'TECHNICIAN')
    : nurses;

  // Step locks logic
  const step1Unlocked = true;
  const step2Unlocked = selectedPatientMr !== '';
  const step3Unlocked = step2Unlocked && notes.trim().length > 0;
  const step4Unlocked = step3Unlocked && (selectedNurseId !== '' || activeSchedule !== undefined);

  // Unified computed status visual
  let displayStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' = 'AVAILABLE';
  if (selectedPatientMr === 'MAINTENANCE') {
    displayStatus = 'MAINTENANCE';
  } else if (selectedPatientMr) {
    displayStatus = 'OCCUPIED';
  } else if (activeSchedule?.nurse.role === 'TECHNICIAN') {
    displayStatus = 'MAINTENANCE';
  }

  const statusColors = {
    AVAILABLE: { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
    OCCUPIED: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    MAINTENANCE: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  };

  const sc = statusColors[displayStatus];

  const stepStyle = (unlocked: boolean) => ({
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: unlocked ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
    opacity: unlocked ? 1 : 0.5,
    pointerEvents: (unlocked ? 'auto' : 'none') as any,
    transition: 'all 0.2s ease-in-out',
  });

  const stepHeaderStyle = (unlocked: boolean) => ({
    fontSize: '13px',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  });

  const stepBadgeStyle = (unlocked: boolean) => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: unlocked ? '#1e6fa6' : '#94a3b8',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Tempat Tidur {bed.bedCode}</div>
            <div className="modal-subtitle">
              Lantai {bed.floor} — Seksi {bed.section} — Pos {bed.position}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
          {error && <div className="error-alert" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Reset / Empty Bed Section */}
          {(bed.patientId || activeSchedule || bed.machine) && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px',
              padding: '12px 16px', marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>
                  Atur Ulang / Kosongkan Bed
                </div>
                <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '2px' }}>
                  Lepas pasien, jadwal penugasan, dan mesin terhubung dari bed ini.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                style={{
                  background: '#ef4444', color: 'white', padding: '6px 12px',
                  fontSize: '11px', fontWeight: 600, border: 'none', borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={handleUnassign}
                disabled={saving}
              >
                Kosongkan Bed
              </button>
            </div>
          )}

          {/* Computed status visual */}
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
              <div style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>
                {statusLabels[displayStatus]}
              </div>
            </div>
          </div>

          {/* STEP 1: PILIH PASIEN */}
          <div style={stepStyle(step1Unlocked)}>
            <div style={stepHeaderStyle(step1Unlocked)}>
              <div style={stepBadgeStyle(step1Unlocked)}>1</div>
              <span>👥 Pilih Pasien</span>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Pasien Dialysis *</label>
              <select
                className="form-select"
                value={selectedPatientMr}
                onChange={(e) => handlePatientSelect(e.target.value)}
              >
                <option value="">-- Pilih Pasien --</option>
                <option value="MAINTENANCE">-- 🔧 Perawatan / Perbaikan (Tanpa Pasien) --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.mrNumber}>
                    {getPatientLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* STEP 2: CATATAN PASIEN */}
          <div style={stepStyle(step2Unlocked)}>
            <div style={stepHeaderStyle(step2Unlocked)}>
              <div style={stepBadgeStyle(step2Unlocked)}>2</div>
              <span>📝 Catatan Pasien</span>
              {!step2Unlocked && (
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginLeft: 'auto' }}>🔒 Terkunci</span>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                {selectedPatientMr === 'MAINTENANCE' ? 'Catatan Kerusakan/Perbaikan *' : 'Catatan Pasien/Bed *'}
              </label>
              <textarea
                className="form-textarea"
                placeholder={selectedPatientMr === 'MAINTENANCE' ? 'Jelaskan detail perbaikan/kalibrasi...' : 'Tambahkan catatan pasien dialisis...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!step2Unlocked}
                required={step2Unlocked}
                rows={2}
              />
            </div>
          </div>

          {/* STEP 3: PENUGASAN & JADWAL */}
          <div style={stepStyle(step3Unlocked)}>
            <div style={stepHeaderStyle(step3Unlocked)}>
              <div style={stepBadgeStyle(step3Unlocked)}>3</div>
              <span>📅 Penugasan & Jadwal</span>
              {!step3Unlocked && (
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginLeft: 'auto' }}>🔒 Terkunci</span>
              )}
            </div>

            {/* Active scheduled details */}
            {activeSchedule && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
                padding: '10px 12px', marginBottom: 12
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {activeSchedule.nurse.name}
                    <span className={`badge badge-${activeSchedule.nurse.role === 'TECHNICIAN' ? 'maintenance' : 'staff'}`} style={{ fontSize: 8, padding: '1px 4px' }}>
                      {activeSchedule.nurse.role === 'TECHNICIAN' ? 'Teknisi' : 'Perawat'}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#1e40af', marginTop: 2 }}>
                    ⏰ {new Date(activeSchedule.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(activeSchedule.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({activeSchedule.shift === 'NIGHT' ? 'Malam 🌙' : 'Siang ☀️'})
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 10, padding: '4px 8px' }}
                  onClick={() => handleDeleteSchedule(activeSchedule.id)}
                >
                  Hapus
                </button>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: selectedNurseId ? 12 : 0 }}>
              <label className="form-label">Tugaskan Pengguna Baru *</label>
              <select
                className="form-select"
                value={selectedNurseId}
                onChange={(e) => setSelectedNurseId(e.target.value)}
                disabled={!step3Unlocked}
                required={step3Unlocked && !activeSchedule}
              >
                <option value="">-- Pilih Pengguna --</option>
                {selectableNurses.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.role === 'ADMIN' ? 'Admin' : n.role === 'TECHNICIAN' ? 'Teknisi' : 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            {selectedNurseId && (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Tgl Mulai</label>
                    <input
                      type="date"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                      value={scheduleStartDate}
                      onChange={(e) => setScheduleStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Tgl Selesai</label>
                    <input
                      type="date"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                      value={scheduleEndDate}
                      onChange={(e) => setScheduleEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Jam Mulai</label>
                    <input
                      type="time"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                      value={scheduleStartTime}
                      onChange={(e) => setScheduleStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Jam Selesai</label>
                    <input
                      type="time"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                      value={scheduleEndTime}
                      onChange={(e) => setScheduleEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Shift detected display */}
                <div style={{
                  marginBottom: 10, padding: '6px 10px', borderRadius: 6,
                  background: (parseInt(scheduleStartTime.split(':')[0], 10) >= 6 && parseInt(scheduleStartTime.split(':')[0], 10) < 18) ? '#ecfdf5' : '#eff6ff',
                  border: `1.5px solid ${(parseInt(scheduleStartTime.split(':')[0], 10) >= 6 && parseInt(scheduleStartTime.split(':')[0], 10) < 18) ? '#10b981' : '#3b82f6'}`,
                  fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6
                }}>
                  <span>Shift Terdeteksi:</span>
                  <span style={{
                    color: (parseInt(scheduleStartTime.split(':')[0], 10) >= 6 && parseInt(scheduleStartTime.split(':')[0], 10) < 18) ? '#047857' : '#1d4ed8',
                    fontWeight: 700
                  }}>
                    {(parseInt(scheduleStartTime.split(':')[0], 10) >= 6 && parseInt(scheduleStartTime.split(':')[0], 10) < 18) ? 'Siang (DAY) ☀️' : 'Malam (NIGHT) 🌙'}
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Catatan Jadwal</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Misal: Pendampingan, Shift Siang"
                    style={{ padding: '6px 8px', fontSize: 12 }}
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: HUBUNGKAN MESIN DIALYSIS */}
          <div style={stepStyle(step4Unlocked)}>
            <div style={stepHeaderStyle(step4Unlocked)}>
              <div style={stepBadgeStyle(step4Unlocked)}>4</div>
              <span>🔌 Hubungkan Mesin Dialysis</span>
              {!step4Unlocked && (
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginLeft: 'auto' }}>🔒 Terkunci</span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Pilih Mesin Dialysis *</label>
              <select
                className="form-select"
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                disabled={!step4Unlocked}
                required={step4Unlocked}
              >
                <option value="">-- Pilih Mesin --</option>
                {selectableMachines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.machineCode} (Lantai {m.floor} - {m.notes ? getNotesWithoutPrefix(m.notes) : 'Ready'})
                  </option>
                ))}
              </select>
              {selectableMachines.length === 0 && step4Unlocked && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#ef4444' }}>
                  ⚠️ Tidak ada mesin berstatus READY yang tersedia di Lantai {bed.floor}.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 20px', background: '#f8fafc' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !step4Unlocked || !selectedMachineId}
          >
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
        </div>
      </div>
    </div>
  );
}
