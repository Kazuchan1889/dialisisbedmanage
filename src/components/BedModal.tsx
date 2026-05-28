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
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [nurseSearch, setNurseSearch] = useState('');
  const [showNurseSuggestions, setShowNurseSuggestions] = useState(false);
  const [machineSearch, setMachineSearch] = useState('');
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);

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

  useEffect(() => {
    if (patients.length > 0 && selectedPatientMr) {
      if (selectedPatientMr === 'MAINTENANCE') {
        setPatientSearch('🔧 Perawatan / Perbaikan (Tanpa Pasien)');
      } else {
        const pat = patients.find((p) => p.mrNumber === selectedPatientMr);
        if (pat) {
          setPatientSearch(`${pat.name} (${pat.mrNumber})`);
        }
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
      if (machine) {
        setMachineSearch(`${machine.machineCode} (Lantai ${machine.floor})`);
      }
    } else {
      setMachineSearch('');
    }
  }, [machines, selectedMachineId]);

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

        const [shHourStr, shMinStr] = scheduleStartTime.split(':');
        const shHour = parseInt(shHourStr, 10);
        const shMin = parseInt(shMinStr, 10);
        const shTotalMins = shHour * 60 + shMin;

        let shiftVal = 'NIGHT';
        if (shTotalMins >= (6 * 60 + 30) && shTotalMins <= (12 * 60)) {
          shiftVal = 'MORNING';
        } else if (shTotalMins >= (12 * 60 + 30) && shTotalMins <= (17 * 60 + 30)) {
          shiftVal = 'DAY';
        }

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

  // Filter patient list based on search query
  const filteredPatients = patients.filter((p) => {
    const searchLower = patientSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.mrNumber.toLowerCase().includes(searchLower)
    );
  });

  // Filter nurses depending on clinical or maintenance mode
  const selectableNurses = selectedPatientMr === 'MAINTENANCE'
    ? nurses.filter((n) => n.role === 'TECHNICIAN')
    : nurses;

  const filteredNurses = selectableNurses.filter((n) => {
    const searchLower = nurseSearch.toLowerCase();
    const roleText = n.role === 'ADMIN' ? 'admin' : n.role === 'TECHNICIAN' ? 'teknisi' : 'staff';
    return (
      n.name.toLowerCase().includes(searchLower) ||
      roleText.includes(searchLower)
    );
  });

  const filteredMachines = selectableMachines.filter((m) => {
    const searchLower = machineSearch.toLowerCase();
    const noteText = m.notes ? m.notes.toLowerCase() : '';
    return (
      m.machineCode.toLowerCase().includes(searchLower) ||
      noteText.includes(searchLower)
    );
  });

  // Filter patient list to show tags
  const getPatientLabel = (p: any) => {
    let tag = '';
    if (p.dead) tag = ' [💀 Dead]';
    else if (p.travelling) tag = ' [✈️ Travelling]';
    else if (p.moved) tag = ' [📦 Moved]';
    return `${p.name} (${p.mrNumber})${tag}`;
  };

  // Step locks logic - all fields unlocked as requested by user
  const step1Unlocked = true;
  const step2Unlocked = true;
  const step3Unlocked = true;
  const step4Unlocked = true;

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
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label className="form-label">Pasien Dialysis *</label>
              <div className="relative" style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingRight: '36px' }}
                  placeholder="Cari nama atau nomor RM pasien..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientSuggestions(true);
                    if (!e.target.value) {
                      handlePatientSelect('');
                    }
                  }}
                  onFocus={() => setShowPatientSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowPatientSuggestions(false);
                      // Snap back to correct full text representation
                      if (selectedPatientMr) {
                        if (selectedPatientMr === 'MAINTENANCE') {
                          setPatientSearch('🔧 Perawatan / Perbaikan (Tanpa Pasien)');
                        } else {
                          const pat = patients.find((p) => p.mrNumber === selectedPatientMr);
                          if (pat) {
                            setPatientSearch(`${pat.name} (${pat.mrNumber})`);
                          } else {
                            setPatientSearch('');
                          }
                        }
                      } else {
                        setPatientSearch('');
                      }
                    }, 200);
                  }}
                />
                {patientSearch && (
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                    }}
                    onClick={() => {
                      setPatientSearch('');
                      handlePatientSelect('');
                      setShowPatientSuggestions(false);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Suggestions Autocomplete Dropdown */}
              {showPatientSuggestions && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 9999,
                    maxHeight: '180px',
                    overflowY: 'auto',
                    marginTop: '4px',
                  }}
                >
                  {/* Maintenance Option */}
                  <div
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#d97706',
                      background: '#fffbeb',
                      cursor: 'pointer',
                      borderBottom: '1px solid #fcd34d',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    className="hover:bg-amber-100 transition-colors"
                    onMouseDown={() => {
                      handlePatientSelect('MAINTENANCE');
                      setPatientSearch('🔧 Perawatan / Perbaikan (Tanpa Pasien)');
                      setShowPatientSuggestions(false);
                    }}
                  >
                    <span>🔧 Perawatan / Perbaikan (Tanpa Pasien)</span>
                  </div>

                  {filteredPatients.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      Pasien tidak ditemukan
                    </div>
                  ) : (
                    filteredPatients.map((p) => {
                      const isSelected = selectedPatientMr === p.mrNumber;
                      return (
                        <div
                          key={p.id}
                          style={{
                            padding: '10px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onMouseDown={() => {
                            handlePatientSelect(p.mrNumber);
                            setPatientSearch(`${p.name} (${p.mrNumber})`);
                            setShowPatientSuggestions(false);
                          }}
                          className="hover:bg-blue-50 transition-colors"
                        >
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
                      );
                    })
                  )}
                </div>
              )}
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
                    ⏰ {new Date(activeSchedule.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(activeSchedule.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({activeSchedule.shift === 'MORNING' ? 'Pagi 🌅' : activeSchedule.shift === 'DAY' ? 'Siang ☀️' : 'Malam 🌙'})
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

            <div className="form-group" style={{ marginBottom: selectedNurseId ? 12 : 0, position: 'relative' }}>
              <label className="form-label">Tugaskan Pengguna Baru *</label>
              <div className="relative" style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingRight: '36px' }}
                  placeholder="Cari perawat atau teknisi..."
                  value={nurseSearch}
                  onChange={(e) => {
                    setNurseSearch(e.target.value);
                    setShowNurseSuggestions(true);
                    if (!e.target.value) {
                      setSelectedNurseId('');
                    }
                  }}
                  onFocus={() => setShowNurseSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowNurseSuggestions(false);
                      // Snap back to correct representation
                      if (selectedNurseId) {
                        const nurse = nurses.find((n) => n.id === selectedNurseId);
                        if (nurse) {
                          setNurseSearch(`${nurse.name} (${nurse.role === 'ADMIN' ? 'Admin' : nurse.role === 'TECHNICIAN' ? 'Teknisi' : 'Staff'})`);
                        } else {
                          setNurseSearch('');
                        }
                      } else {
                        setNurseSearch('');
                      }
                    }, 200);
                  }}
                  disabled={!step3Unlocked}
                />
                {nurseSearch && (
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                    }}
                    onClick={() => {
                      setNurseSearch('');
                      setSelectedNurseId('');
                      setShowNurseSuggestions(false);
                    }}
                    disabled={!step3Unlocked}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Suggestions Autocomplete Dropdown */}
              {showNurseSuggestions && step3Unlocked && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 9999,
                    maxHeight: '180px',
                    overflowY: 'auto',
                    marginTop: '4px',
                  }}
                >
                  {filteredNurses.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      Pengguna tidak ditemukan
                    </div>
                  ) : (
                    filteredNurses.map((n) => {
                      const isSelected = selectedNurseId === n.id;
                      return (
                        <div
                          key={n.id}
                          style={{
                            padding: '10px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onMouseDown={() => {
                            setSelectedNurseId(n.id);
                            setNurseSearch(`${n.name} (${n.role === 'ADMIN' ? 'Admin' : n.role === 'TECHNICIAN' ? 'Teknisi' : 'Staff'})`);
                            setShowNurseSuggestions(false);
                          }}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{n.name}</span>
                          </div>
                          <span className={`badge badge-${n.role === 'ADMIN' ? 'admin' : n.role === 'TECHNICIAN' ? 'maintenance' : 'staff'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                            {n.role === 'ADMIN' ? '🛡️ Admin' : n.role === 'TECHNICIAN' ? '🔧 Teknisi' : '👤 Staff'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
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
                {(() => {
                  const [shHourStr, shMinStr] = scheduleStartTime.split(':');
                  const shHour = parseInt(shHourStr, 10);
                  const shMin = parseInt(shMinStr, 10);
                  const shTotalMins = shHour * 60 + shMin;
                  
                  let detectedShiftText = 'Malam (NIGHT) 🌙';
                  let shiftBg = '#eff6ff';
                  let shiftBorder = '#3b82f6';
                  let shiftColor = '#1d4ed8';
                  
                  if (shTotalMins >= (6 * 60 + 30) && shTotalMins <= (12 * 60)) {
                    detectedShiftText = 'Pagi (MORNING) 🌅';
                    shiftBg = '#fef3c7';
                    shiftBorder = '#fbbf24';
                    shiftColor = '#d97706';
                  } else if (shTotalMins >= (12 * 60 + 30) && shTotalMins <= (17 * 60 + 30)) {
                    detectedShiftText = 'Siang (DAY) ☀️';
                    shiftBg = '#ecfdf5';
                    shiftBorder = '#10b981';
                    shiftColor = '#047857';
                  }

                  return (
                    <div style={{
                      marginBottom: 10, padding: '6px 10px', borderRadius: 6,
                      background: shiftBg,
                      border: `1.5px solid ${shiftBorder}`,
                      fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6
                    }}>
                      <span>Shift Terdeteksi:</span>
                      <span style={{ color: shiftColor, fontWeight: 700 }}>
                        {detectedShiftText}
                      </span>
                    </div>
                  );
                })()}

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

            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label className="form-label">Pilih Mesin Dialysis *</label>
              <div className="relative" style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingRight: '36px' }}
                  placeholder="Cari kode mesin atau catatan..."
                  value={machineSearch}
                  onChange={(e) => {
                    setMachineSearch(e.target.value);
                    setShowMachineSuggestions(true);
                    if (!e.target.value) {
                      setSelectedMachineId('');
                    }
                  }}
                  onFocus={() => setShowMachineSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowMachineSuggestions(false);
                      // Snap back to correct representation
                      if (selectedMachineId) {
                        const machine = machines.find((m) => m.id === selectedMachineId);
                        if (machine) {
                          setMachineSearch(`${machine.machineCode} (Lantai ${machine.floor})`);
                        } else {
                          setMachineSearch('');
                        }
                      } else {
                        setMachineSearch('');
                      }
                    }, 200);
                  }}
                  disabled={!step4Unlocked}
                />
                {machineSearch && (
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                    }}
                    onClick={() => {
                      setMachineSearch('');
                      setSelectedMachineId('');
                      setShowMachineSuggestions(false);
                    }}
                    disabled={!step4Unlocked}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Suggestions Autocomplete Dropdown */}
              {showMachineSuggestions && step4Unlocked && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 9999,
                    maxHeight: '180px',
                    overflowY: 'auto',
                    marginTop: '4px',
                  }}
                >
                  {filteredMachines.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      Mesin tidak ditemukan
                    </div>
                  ) : (
                    filteredMachines.map((m) => {
                      const isSelected = selectedMachineId === m.id;
                      return (
                        <div
                          key={m.id}
                          style={{
                            padding: '10px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onMouseDown={() => {
                            setSelectedMachineId(m.id);
                            setMachineSearch(`${m.machineCode} (Lantai ${m.floor})`);
                            setShowMachineSuggestions(false);
                          }}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{m.machineCode}</span>
                            <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '11px' }}>Lantai {m.floor}</span>
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.notes ? getNotesWithoutPrefix(m.notes) : 'Ready'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

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
            disabled={saving}
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
