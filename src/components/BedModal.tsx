'use client';

import { useState, useEffect } from 'react';

interface NurseSchedule {
  id: string;
  nurseId: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
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

export default function BedModal({ bed, onClose, onSave }: BedModalProps) {
  const [status, setStatus] = useState(bed.status);
  const [patientName, setPatientName] = useState(bed.patientName || '');
  const [patientId, setPatientId] = useState(bed.patientId || '');
  const [notes, setNotes] = useState(bed.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Detailed bed details (includes recent schedules) and nurse list
  const [detailedBed, setDetailedBed] = useState<Bed>(bed);
  const [nurses, setNurses] = useState<any[]>([]);
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleStartTime, setScheduleStartTime] = useState('08:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('14:00');
  const [scheduleNotes, setScheduleNotes] = useState('');

  useEffect(() => {
    // Fetch detailed bed with recent schedules
    fetch(`/api/beds/${bed.id}`)
      .then((res) => res.json())
      .then((data) => setDetailedBed(data))
      .catch(console.error);

    // Fetch active nurses (staff, technician, admin)
    fetch('/api/users?activeOnly=true')
      .then((res) => res.json())
      .then((data) => setNurses(data))
      .catch(console.error);
  }, [bed.id]);

  // Find active schedule (if any)
  const now = new Date();
  const activeSchedule = detailedBed.nurseSchedules?.find((ns) => {
    return now >= new Date(ns.startTime) && now <= new Date(ns.endTime);
  });

  const handleNurseSelect = (id: string) => {
    setSelectedNurseId(id);
    const user = nurses.find((n) => n.id === id);
    if (user) {
      if (user.role === 'TECHNICIAN') {
        setStatus('MAINTENANCE');
      } else if (user.role === 'STAFF' || user.role === 'ADMIN') {
        setStatus('OCCUPIED');
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: any = { status, patientName, patientId, notes };

      // Add nurse schedule if selected
      if (selectedNurseId) {
        const startIso = new Date(`${scheduleDate}T${scheduleStartTime}:00`).toISOString();
        const endIso = new Date(`${scheduleDate}T${scheduleEndTime}:00`).toISOString();

        if (new Date(startIso) >= new Date(endIso)) {
          throw new Error('Jam mulai harus lebih awal dari jam selesai.');
        }

        payload.nurseSchedule = {
          nurseId: selectedNurseId,
          startTime: startIso,
          endTime: endIso,
          notes: scheduleNotes,
        };
      }

      const res = await fetch(`/api/beds/${bed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan');
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
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/beds/${bed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'AVAILABLE',
          unassignActiveSchedule: true,
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

  const statusColors = {
    AVAILABLE: { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
    OCCUPIED: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    MAINTENANCE: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  };

  const sc = statusColors[status];
  const selectedUser = nurses.find((n) => n.id === selectedNurseId);
  const selectedUserRole = selectedUser?.role;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Tempat Tidur {bed.bedCode}</div>
            <div className="modal-subtitle">
              Lantai {bed.floor} — Seksi {bed.section}
              {bed.machine && ` · Mesin ${bed.machine.machineCode}`}
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

          {/* Current status visual */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            padding: '10px 14px', borderRadius: 10,
            background: sc.bg, border: `1.5px solid ${sc.border}`,
          }}>
            <div style={{ width: 48, height: 24, borderRadius: 5, background: sc.bg, border: `2px solid ${sc.border}` }} />
            <div>
              <div style={{ fontSize: 11, color: sc.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status Saat Ini
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>
                {statusLabels[status]}
              </div>
            </div>
          </div>


          {/* Patient fields - only shown when occupied (and not selected a technician) */}
          {status === 'OCCUPIED' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Pasien</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nama pasien"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required={status === 'OCCUPIED'}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">No. Rekam Medis</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: RM-0012"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">
              {status === 'MAINTENANCE' ? 'Catatan Kerusakan/Perbaikan (opsional)' : 'Catatan Bed (opsional)'}
            </label>
            <textarea
              className="form-textarea"
              placeholder={status === 'MAINTENANCE' ? 'Jelaskan detail kerusakan atau perbaikan...' : 'Tambahkan catatan...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Machine info */}
          {bed.machine && (
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 10, padding: '10px 14px', marginBottom: 20
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Info Mesin Terkoneksi
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2332' }}>
                  {bed.machine.machineCode}
                </span>
                <span className={`badge badge-${bed.machine.status === 'AVAILABLE' ? 'available' : bed.machine.status === 'IN_USE' ? 'occupied' : 'maintenance'}`}>
                  {bed.machine.status === 'AVAILABLE' ? 'Tersedia' : bed.machine.status === 'IN_USE' ? 'Digunakan' : 'Perawatan'}
                </span>
              </div>
            </div>
          )}

          {/* NURSE & TECHNICIAN ASSIGNMENT SECTION */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
              🏥 Penugasan Tugas & Jadwal
            </h3>

            {/* UN-ASSIGN BUTTON (Shown if there's an active schedule) */}
            {activeSchedule && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
                padding: '12px 14px', marginBottom: 16
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {activeSchedule.nurse.name}
                    <span className={`badge badge-${activeSchedule.nurse.role === 'TECHNICIAN' ? 'maintenance' : activeSchedule.nurse.role === 'ADMIN' ? 'admin' : 'staff'}`} style={{ fontSize: 8, padding: '1px 4px' }}>
                      {activeSchedule.nurse.role === 'TECHNICIAN' ? 'Teknisi' : 'Perawat'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#1e40af', marginTop: 2 }}>
                    ⏰ {new Date(activeSchedule.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(activeSchedule.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  style={{ background: '#ef4444', color: 'white', padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  onClick={handleUnassign}
                  disabled={saving}
                >
                  Lepas Penugasan (Un-assign)
                </button>
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Tugaskan Pengguna Baru</label>
              <select
                className="form-select"
                value={selectedNurseId}
                onChange={(e) => handleNurseSelect(e.target.value)}
              >
                <option value="">-- Pilih Pengguna untuk Ditugaskan --</option>
                {nurses.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.role === 'ADMIN' ? 'Admin' : n.role === 'TECHNICIAN' ? 'Teknisi' : 'Staff'})
                  </option>
                ))}
              </select>

              {/* Dynamic feedback messages */}
              {selectedUserRole === 'TECHNICIAN' && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#d97706', fontWeight: 600 }}>
                  🔧 Teknisi dipilih. Status tempat tidur akan otomatis diubah menjadi "Perawatan/Perbaikan". (Form nama pasien disembunyikan)
                </div>
              )}
              {selectedUserRole && (selectedUserRole === 'STAFF' || selectedUserRole === 'ADMIN') && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#059669', fontWeight: 600 }}>
                  👤 Perawat/Staff dipilih. Status tempat tidur akan otomatis diubah menjadi "Terisi / Pasien". (Form nama pasien wajib diisi)
                </div>
              )}
            </div>

            {selectedNurseId && (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Tanggal</label>
                    <input
                      type="date"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
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
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Catatan Jadwal</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={selectedUserRole === 'TECHNICIAN' ? 'Misal: Kalibrasi sensor, Ganti filter dialisat' : 'Misal: Shift Pagi, Pendampingan Khusus'}
                    style={{ padding: '6px 8px', fontSize: 12 }}
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* List of recent schedules */}
            {detailedBed.nurseSchedules && detailedBed.nurseSchedules.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Riwayat & Penugasan Terbaru
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detailedBed.nurseSchedules.map((ns) => {
                    const dateObj = new Date(ns.startTime);
                    const dateFormatted = dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                    const startFormatted = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    const endFormatted = new Date(ns.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    
                    const isActive = now >= new Date(ns.startTime) && now <= new Date(ns.endTime);

                    return (
                      <div
                        key={ns.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: isActive ? '#f0fdf4' : '#ffffff',
                          border: `1px solid ${isActive ? '#bbf7d0' : '#e2e8f0'}`,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {ns.nurse.name}
                            <span className={`badge badge-${ns.nurse.role === 'TECHNICIAN' ? 'maintenance' : ns.nurse.role === 'ADMIN' ? 'admin' : 'staff'}`} style={{ fontSize: 8, padding: '1px 4px' }}>
                              {ns.nurse.role === 'TECHNICIAN' ? 'Teknisi' : 'Perawat'}
                            </span>
                            {isActive && (
                              <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                Aktif
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            📅 {dateFormatted} · ⏰ {startFormatted} - {endFormatted}
                          </div>
                          {ns.notes && (
                            <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 1 }}>
                              Note: {ns.notes}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSchedule(ns.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: 4,
                            borderRadius: 4,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                          title="Hapus Penugasan"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 20px', background: '#f8fafc' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Batal
          </button>
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
        </div>
      </div>
    </div>
  );
}
