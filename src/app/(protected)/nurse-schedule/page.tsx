'use client';

import { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

interface Nurse {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface Bed {
  id: string;
  bedCode: string;
  floor: number;
  section: string;
}

interface Schedule {
  id: string;
  bedId: string;
  nurseId: string;
  startTime: string;
  endTime: string;
  shift: string;
  notes?: string | null;
  createdAt: string;
  nurse: Nurse;
  bed: Bed;
}

function ScheduleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [selectedBedId, setSelectedBedId] = useState('');
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [scheduleStartDate, setScheduleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleEndDate, setScheduleEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleStartTime, setScheduleStartTime] = useState('08:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('14:00');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch all beds (Lantai 2 & 3)
    Promise.all([
      fetch('/api/beds?floor=2').then((r) => r.json()),
      fetch('/api/beds?floor=3').then((r) => r.json()),
    ])
      .then(([beds2, beds3]) => {
        setBeds([...beds2, ...beds3]);
      })
      .catch(console.error);

    // Fetch active nurses (staff, technician, admin)
    fetch('/api/users?activeOnly=true')
      .then((res) => res.json())
      .then((data) => setNurses(data))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (!selectedBedId || !selectedNurseId) {
      setError('Harap pilih tempat tidur dan perawat/teknisi.');
      setSaving(false);
      return;
    }

    try {
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
          // Shift crosses midnight, so end time is on the next day
          const nextDay = new Date(currentD);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayStr = nextDay.toISOString().split('T')[0];
          endIso = new Date(`${nextDayStr}T${scheduleEndTime}:00`).toISOString();
        } else {
          endIso = new Date(`${dateStr}T${scheduleEndTime}:00`).toISOString();
        }

        dailySchedules.push({
          startTime: startIso,
          endTime: endIso,
          shift: shiftVal,
          notes,
        });

        currentD.setDate(currentD.getDate() + 1);
      }

      const res = await fetch('/api/nurse-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedId: selectedBedId,
          nurseId: selectedNurseId,
          notes,
          schedules: dailySchedules,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan');
      }

      onSave();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedNurse = nurses.find((n) => n.id === selectedNurseId);
  const selectedRole = selectedNurse?.role;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Tambah Jadwal Baru</div>
            <div className="modal-subtitle">Tugaskan staff/teknisi pada tempat tidur & waktu tertentu</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-alert">{error}</div>}

            <div className="form-group">
              <label className="form-label">Pilih Tempat Tidur *</label>
              <select
                className="form-select"
                value={selectedBedId}
                onChange={(e) => setSelectedBedId(e.target.value)}
                required
              >
                <option value="">-- Pilih Bed --</option>
                {beds.map((b) => (
                  <option key={b.id} value={b.id}>
                    Lantai {b.floor} · Bed {b.bedCode} ({b.section})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Pilih Pengguna *</label>
              <select
                className="form-select"
                value={selectedNurseId}
                onChange={(e) => setSelectedNurseId(e.target.value)}
                required
              >
                <option value="">-- Pilih Pengguna --</option>
                {nurses.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.role === 'ADMIN' ? 'Admin' : n.role === 'TECHNICIAN' ? 'Teknisi' : 'Staff'})
                  </option>
                ))}
              </select>

              {/* Dynamic role notices */}
              {selectedRole === 'TECHNICIAN' && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#d97706', fontWeight: 600 }}>
                  🔧 Teknisi dipilih. Jika jadwal aktif saat ini, status bed akan otomatis diubah menjadi "Perawatan/Perbaikan".
                </div>
              )}
              {selectedRole && (selectedRole === 'STAFF' || selectedRole === 'ADMIN') && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#059669', fontWeight: 600 }}>
                  👤 Perawat/Staff dipilih. Jika jadwal aktif saat ini, status bed akan otomatis diubah menjadi "Terisi / Pasien".
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tgl Mulai *</label>
                <input
                  type="date"
                  className="form-input"
                  value={scheduleStartDate}
                  onChange={(e) => setScheduleStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tgl Selesai *</label>
                <input
                  type="date"
                  className="form-input"
                  value={scheduleEndDate}
                  onChange={(e) => setScheduleEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Jam Mulai *</label>
                <input
                  type="time"
                  className="form-input"
                  value={scheduleStartTime}
                  onChange={(e) => setScheduleStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Jam Selesai *</label>
                <input
                  type="time"
                  className="form-input"
                  value={scheduleEndTime}
                  onChange={(e) => setScheduleEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Shift detected display */}
            <div style={{
              marginBottom: 16, padding: '8px 12px', borderRadius: 8,
              background: (parseInt(scheduleStartTime.split(':')[0], 10) >= 6 && parseInt(scheduleStartTime.split(':')[0], 10) < 18) ? '#ecfdf5' : '#eff6ff',
              border: `1.5px solid ${(parseInt(scheduleStartTime.split(':')[0], 10) >= 6 && parseInt(scheduleStartTime.split(':')[0], 10) < 18) ? '#10b981' : '#3b82f6'}`,
              fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6
            }}>
              <span>Shift Terdeteksi:</span>
              <span style={{
                color: (parseInt(scheduleStartTime.split(':')[0], 10) >= 6 && parseInt(scheduleStartTime.split(':')[0], 10) < 18) ? '#047857' : '#1d4ed8',
                fontWeight: 700
              }}>
                {(parseInt(scheduleStartTime.split(':')[0], 10) >= 6 && parseInt(scheduleStartTime.split(':')[0], 10) < 18) ? 'Siang (DAY) ☀️' : 'Malam (NIGHT) 🌙'}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Catatan Tugas (opsional)</label>
              <input
                type="text"
                className="form-input"
                placeholder={selectedRole === 'TECHNICIAN' ? 'Misal: Perbaikan pompa dialisat' : 'Misal: Shift Pagi, Pendampingan Khusus'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Menyimpan...</>
              ) : (
                <>➕ Tambah Jadwal</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NurseSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');
  
  // Filters
  const [search, setSearch] = useState('');
  const [floor, setFloor] = useState('all');
  const [date, setDate] = useState('');

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (floor !== 'all') params.append('floor', floor);
      if (date) params.append('date', date);
      if (search) params.append('search', search);

      const res = await fetch(`/api/nurse-schedules?${params.toString()}`);
      const data = await res.json();
      setSchedules(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [floor, date, search]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal perawat ini?')) return;
    try {
      const res = await fetch(`/api/nurse-schedules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert('Gagal menghapus jadwal.');
      }
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus jadwal.');
    }
  };

  const now = new Date();
  
  // Split schedules into On-Going (current and future) vs History (past)
  // History means endTime <= now
  // OnGoing means endTime > now
  const ongoingSchedules = schedules.filter((s) => new Date(s.endTime) > now);
  const historySchedules = schedules.filter((s) => new Date(s.endTime) <= now);

  const displayedSchedules = activeTab === 'ongoing' ? ongoingSchedules : historySchedules;

  const handleExportXLSX = () => {
    const listToExport = displayedSchedules;
    if (listToExport.length === 0) {
      alert(`Tidak ada data ${activeTab === 'ongoing' ? 'ongoing' : 'riwayat'} untuk diekspor.`);
      return;
    }

    // Map data to custom object keys for cleaner Excel column headers
    const data = listToExport.map((s) => {
      const startDate = new Date(s.startTime);
      const endDate = new Date(s.endTime);
      
      const dateStr = startDate.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const startTimeStr = startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const endTimeStr = endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const roleStr = s.nurse.role === 'ADMIN' ? 'Admin' : s.nurse.role === 'TECHNICIAN' ? 'Teknisi' : 'Staff';

      return {
        'Tanggal': dateStr,
        'Lantai': `Lantai ${s.bed.floor}`,
        'Seksi': s.bed.section,
        'Bed': s.bed.bedCode,
        'Nama Pengguna': s.nurse.name,
        'Role': roleStr,
        'Shift': s.shift === 'NIGHT' ? 'Malam (Night)' : 'Siang (Day)',
        'Jam Mulai': startTimeStr,
        'Jam Selesai': endTimeStr,
        'Catatan': s.notes || '-',
      };
    });

    // Create worksheet and workbook using XLSX
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    const tabName = activeTab === 'ongoing' ? 'On Going' : 'History';
    XLSX.utils.book_append_sheet(workbook, worksheet, tabName);

    // Save workbook with true .xlsx extension
    const fileNameSuffix = activeTab === 'ongoing' ? 'Ongoing' : 'Riwayat_Selesai';
    XLSX.writeFile(workbook, `Jadwal_Tugas_Perawat_${fileNameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Nurse & Tech Schedule</div>
          <div className="topbar-date">Klinik Utama Jakarta Kidney Center</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportXLSX}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Ekspor {activeTab === 'ongoing' ? 'On-Going' : 'Riwayat'} ke Excel (.xlsx)
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Tambah Jadwal
          </button>
        </div>
      </div>

      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Jadwal Tugas Staf & Teknisi</h1>
          <p className="page-subtitle">Daftar penugasan perawat dan teknisi pada bed & seksi dialisis</p>
        </div>

        {/* Filter Bar */}
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center'
        }}>
          {/* Search bar */}
          <div className="search-wrapper" style={{ flex: '1 1 250px', marginBottom: 0 }}>
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Cari nama pengguna atau bed (misal: L2-A1)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Floor filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Lantai</span>
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: 13, minWidth: 120, height: 36 }}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            >
              <option value="all">Semua Lantai</option>
              <option value="2">Lantai 2</option>
              <option value="3">Lantai 3</option>
            </select>
          </div>

          {/* Date filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Tanggal Tugas</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '6px 12px', fontSize: 13, height: 36, width: 140 }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Reset button */}
          {(search || date || floor !== 'all') && (
            <button
              className="btn btn-secondary"
              style={{ height: 36, marginTop: 18, fontSize: 12, padding: '0 12px' }}
              onClick={() => {
                setSearch('');
                setDate('');
                setFloor('all');
              }}
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* TABS CONTAINER */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 20, gap: 8 }}>
          <button
            onClick={() => setActiveTab('ongoing')}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ongoing' ? '3px solid #1e6fa6' : '3px solid transparent',
              color: activeTab === 'ongoing' ? '#1e6fa6' : '#64748b',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            🔄 Sedang Berjalan (On-Going)
            <span style={{
              background: activeTab === 'ongoing' ? '#eff6ff' : '#f1f5f9',
              color: activeTab === 'ongoing' ? '#1e6fa6' : '#64748b',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 20,
              fontWeight: 700
            }}>
              {ongoingSchedules.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'history' ? '3px solid #1e6fa6' : '3px solid transparent',
              color: activeTab === 'history' ? '#1e6fa6' : '#64748b',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            📋 Riwayat Selesai (History)
            <span style={{
              background: activeTab === 'history' ? '#f0fdf4' : '#f1f5f9',
              color: activeTab === 'history' ? '#15803d' : '#64748b',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 20,
              fontWeight: 700
            }}>
              {historySchedules.length}
            </span>
          </button>
        </div>

        {/* Data Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner spinner-dark" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: '#64748b', fontSize: 13 }}>Memuat data jadwal...</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Role</th>
                    <th>Bed / Lokasi</th>
                    <th>Tanggal Tugas</th>
                    <th>Shift</th>
                    <th>Jam Kerja</th>
                    <th>Status</th>
                    <th>Catatan</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                        Tidak ada data tugas {activeTab === 'ongoing' ? 'sedang berjalan' : 'riwayat selesai'} ditemukan.
                      </td>
                    </tr>
                  ) : (
                    displayedSchedules.map((item) => {
                      const dateObj = new Date(item.startTime);
                      const dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                      const startTimeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                      const endTimeStr = new Date(item.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                      
                      const isActive = now >= new Date(item.startTime) && now <= new Date(item.endTime);
                      const isUpcoming = now < new Date(item.startTime);

                      return (
                        <tr key={item.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                background: item.nurse.role === 'ADMIN'
                                  ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                                  : item.nurse.role === 'TECHNICIAN'
                                  ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                                  : 'linear-gradient(135deg, #1e6fa6, #2d8fd6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, color: 'white',
                              }}>
                                {item.nurse.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.nurse.name}</div>
                                <div style={{ fontSize: 10, color: '#64748b' }}>@{item.nurse.username}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${item.nurse.role === 'ADMIN' ? 'admin' : item.nurse.role === 'TECHNICIAN' ? 'maintenance' : 'staff'}`}>
                              {item.nurse.role === 'ADMIN' ? '🛡️ Admin' : item.nurse.role === 'TECHNICIAN' ? '🔧 Teknisi' : '👤 Perawat'}
                            </span>
                          </td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.bed.bedCode}</div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>Lantai {item.bed.floor} · {item.bed.section}</div>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: '#334155' }}>
                            {dateStr}
                          </td>
                          <td>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 4,
                              background: item.shift === 'NIGHT' ? '#e0f2fe' : '#dcfce7',
                              color: item.shift === 'NIGHT' ? '#0369a1' : '#15803d'
                            }}>
                              {item.shift === 'NIGHT' ? 'Malam 🌙' : 'Siang ☀️'}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                            ⏰ {startTimeStr} - {endTimeStr}
                          </td>
                          <td>
                            {isActive ? (
                              <span className="badge badge-active">● Aktif</span>
                            ) : isUpcoming ? (
                              <span className="badge badge-staff">⌛ Mendatang</span>
                            ) : (
                              <span className="badge badge-inactive">○ Selesai</span>
                            )}
                          </td>
                          <td style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.notes || '-'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-danger btn-sm btn-icon"
                                onClick={() => handleDelete(item.id)}
                                title="Hapus Jadwal"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <ScheduleModal onClose={() => setShowAddModal(false)} onSave={fetchSchedules} />
      )}
    </>
  );
}
