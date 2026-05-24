'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Bed {
  id: string;
  bedCode: string;
  floor: number;
  section: string;
  position: number;
  status: string;
  machine?: any;
}

interface Machine {
  id: string;
  machineCode: string;
  floor: number;
  status: string;
  notes?: string | null;
  bedId?: string | null;
  bed?: Bed | null;
  createdAt: string;
}

interface MachineFormData {
  machineCode: string;
  floor: string;
  statusOption: 'READY' | 'REPAIRED' | 'IN_USE' | 'RUSAK';
  bedId: string;
  notes: string;
}

function parseMachineStatus(status: string, notes: string | null | undefined): 'READY' | 'REPAIRED' | 'IN_USE' | 'RUSAK' {
  if (status === 'MAINTENANCE') return 'RUSAK';
  if (status === 'IN_USE') return 'IN_USE';
  if (status === 'AVAILABLE') {
    if (notes && notes.startsWith('[REPAIRED]')) {
      return 'REPAIRED';
    }
    return 'READY';
  }
  return 'READY';
}

function getNotesWithoutPrefix(notes: string | null | undefined): string {
  if (!notes) return '';
  if (notes.startsWith('[REPAIRED]')) {
    return notes.replace('[REPAIRED]', '').trim();
  }
  return notes;
}

function MachineModal({
  machine,
  onClose,
  onSave,
}: {
  machine?: Machine;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!machine;
  const [form, setForm] = useState<MachineFormData>({
    machineCode: machine?.machineCode || '',
    floor: machine?.floor ? machine.floor.toString() : '2',
    statusOption: machine ? parseMachineStatus(machine.status, machine.notes) : 'READY',
    bedId: machine?.bedId || '',
    notes: machine ? getNotesWithoutPrefix(machine.notes) : '',
  });
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch available beds
  useEffect(() => {
    async function fetchBeds() {
      setLoadingBeds(true);
      try {
        const res = await fetch('/api/beds');
        if (res.ok) {
          const data = await res.json();
          setBeds(data || []);
        }
      } catch (err) {
        console.error('Failed to load beds', err);
      } finally {
        setLoadingBeds(false);
      }
    }
    fetchBeds();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = isEdit ? `/api/machines/${machine!.id}` : '/api/machines';
      const method = isEdit ? 'PATCH' : 'POST';

      // Map UI statusOption to database MachineStatus enum
      let dbStatus = 'AVAILABLE';
      if (form.statusOption === 'RUSAK') {
        dbStatus = 'MAINTENANCE';
      } else if (form.statusOption === 'IN_USE') {
        dbStatus = 'IN_USE';
      }

      // Prepend [REPAIRED] to notes if status is REPAIRED
      const cleanNotes = form.notes.trim();
      const finalNotes = form.statusOption === 'REPAIRED'
        ? `[REPAIRED] ${cleanNotes}`.trim()
        : cleanNotes;

      const body = {
        machineCode: form.machineCode,
        floor: parseInt(form.floor, 10),
        status: dbStatus,
        notes: finalNotes || null,
        bedId: form.bedId || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan data mesin');
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter beds: only beds on selected floor, and either unassigned OR currently assigned to this machine
  const filteredBeds = beds.filter((b) => {
    const isSameFloor = b.floor === parseInt(form.floor, 10);
    const isUnassigned = !b.machine;
    const isAssignedToThisMachine = isEdit && machine?.bedId === b.id;
    return isSameFloor && (isUnassigned || isAssignedToThisMachine);
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{isEdit ? 'Edit Data Mesin' : 'Tambah Mesin Baru'}</div>
            <div className="modal-subtitle">
              {isEdit ? `Mengubah: Mesin ${machine!.machineCode}` : 'Isi formulir lengkap sesuai data mesin dialysis'}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <div className="error-alert">{error}</div>}

            <div className="form-group">
              <label className="form-label">Kode Mesin *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: MC-01 atau HD-005"
                value={form.machineCode}
                onChange={(e) => setForm({ ...form, machineCode: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Lantai *</label>
                <select
                  className="form-input"
                  value={form.floor}
                  onChange={(e) => {
                    // Reset bedId selection if floor changes
                    setForm({ ...form, floor: e.target.value, bedId: '' });
                  }}
                  required
                >
                  <option value="2">Lantai 2</option>
                  <option value="3">Lantai 3</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status Mesin *</label>
                <select
                  className="form-input"
                  value={form.statusOption}
                  onChange={(e) => setForm({ ...form, statusOption: e.target.value as any })}
                  required
                >
                  <option value="READY">Ready ✅</option>
                  <option value="REPAIRED">Repaired 🛠️</option>
                  <option value="IN_USE">Sedang Digunakan 🔄</option>
                  <option value="RUSAK">Rusak ❌</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tempat Tidur Terhubung (Opsional)</label>
              {loadingBeds ? (
                <div style={{ fontSize: 12, color: '#64748b', padding: '8px 0' }}>Memuat daftar tempat tidur...</div>
              ) : (
                <select
                  className="form-input"
                  value={form.bedId}
                  onChange={(e) => setForm({ ...form, bedId: e.target.value })}
                >
                  <option value="">Tidak Terhubung</option>
                  {filteredBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bed {b.bedCode} ({b.section} - Pos {b.position})
                    </option>
                  ))}
                </select>
              )}
              <span style={{ fontSize: 10, color: '#64748b', marginTop: 4, display: 'block' }}>
                * Hanya menampilkan tempat tidur di Lantai {form.floor} yang belum terhubung dengan mesin lain.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Catatan</label>
              <textarea
                className="form-textarea"
                placeholder="Tulis informasi tambahan atau riwayat perbaikan mesin..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
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
                <>{isEdit ? '💾 Simpan Perubahan' : '➕ Tambah Mesin'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MachineManagementPage() {
  const { data: session } = useSession();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    ready: 0,
    repaired: 0,
    inUse: 0,
    rusak: 0,
  });

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const fetchMachines = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);

      const res = await fetch(`/api/machines?${params.toString()}`);
      const data = await res.json();

      setMachines(data.machines || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch all machines to calculate stats accurately
      const res = await fetch('/api/machines?limit=99999');
      const data = await res.json();
      const list: Machine[] = data.machines || [];

      let ready = 0;
      let repaired = 0;
      let inUse = 0;
      let rusak = 0;

      list.forEach((m) => {
        const uisStatus = parseMachineStatus(m.status, m.notes);
        if (uisStatus === 'READY') ready++;
        else if (uisStatus === 'REPAIRED') repaired++;
        else if (uisStatus === 'IN_USE') inUse++;
        else if (uisStatus === 'RUSAK') rusak++;
      });

      setStats({
        total: list.length,
        ready,
        repaired,
        inUse,
        rusak,
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
    fetchStats();
  }, [fetchMachines, fetchStats]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data mesin ini?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/machines/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMachines((prev) => prev.filter((m) => m.id !== id));
        fetchStats();
        if (machines.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menghapus mesin');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Machine Management</div>
          <div className="topbar-date">Kelola mesin dialysis dan konektivitas bed</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Tambah Mesin
        </button>
      </div>

      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Machine Management</h1>
          <p className="page-subtitle">
            Pantau status operasional mesin dialysis, kelola pemeliharaan (maintenance), dan hubungkan ke bed pasien.
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140, flex: '1 1 140px' }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #1e6fa6, #2d8fd6)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
                <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20 }}>{stats.total}</div>
              <div className="stat-card-label">Total Mesin</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140, flex: '1 1 140px' }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#10b981' }}>{stats.ready}</div>
              <div className="stat-card-label">Ready ✅</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140, flex: '1 1 140px' }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#f59e0b' }}>{stats.repaired}</div>
              <div className="stat-card-label">Repaired 🛠️</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140, flex: '1 1 140px' }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67" />
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#6366f1' }}>{stats.inUse}</div>
              <div className="stat-card-label">Used 🔄</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140, flex: '1 1 140px' }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#ef4444' }}>{stats.rusak}</div>
              <div className="stat-card-label">Rusak ❌</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-wrapper" style={{ flex: 1 }}>
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Cari mesin berdasarkan kode, lantai, atau catatan..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Machines Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner spinner-dark" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: '#64748b', fontSize: 13 }}>Memuat data mesin...</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Kode Mesin</th>
                    <th>Lantai</th>
                    <th>Status</th>
                    <th>Connected Bed</th>
                    <th>Catatan</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                        {search ? 'Mesin tidak ditemukan.' : 'Belum ada data mesin.'}
                      </td>
                    </tr>
                  ) : (
                    machines.map((machine) => {
                      const uisStatus = parseMachineStatus(machine.status, machine.notes);
                      return (
                        <tr key={machine.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                background: 'linear-gradient(135deg, #1e6fa6, #2d8fd6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, color: 'white',
                              }}>
                                HD
                              </div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{machine.machineCode}</div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>
                              Lantai {machine.floor}
                            </span>
                          </td>
                          <td>
                            {uisStatus === 'READY' && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                                borderRadius: 9999, fontSize: 11, fontWeight: 600,
                                background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0'
                              }}>
                                Ready
                              </span>
                            )}
                            {uisStatus === 'REPAIRED' && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                                borderRadius: 9999, fontSize: 11, fontWeight: 600,
                                background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a'
                              }}>
                                Repaired
                              </span>
                            )}
                            {uisStatus === 'IN_USE' && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                                borderRadius: 9999, fontSize: 11, fontWeight: 600,
                                background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe'
                              }}>
                                Sedang Digunakan
                              </span>
                            )}
                            {uisStatus === 'RUSAK' && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                                borderRadius: 9999, fontSize: 11, fontWeight: 600,
                                background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca'
                              }}>
                                Rusak
                              </span>
                            )}
                          </td>
                          <td>
                            {machine.bed ? (
                              <code style={{
                                background: '#eff6ff', padding: '3px 8px', borderRadius: 4,
                                fontSize: 11, color: '#1e40af', fontWeight: 600
                              }}>
                                Bed {machine.bed.bedCode} ({machine.bed.section} - Pos {machine.bed.position})
                              </code>
                            ) : (
                              <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Tidak Terhubung</span>
                            )}
                          </td>
                          <td style={{
                            fontSize: 12, color: '#475569', maxWidth: 200,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }} title={machine.notes || ''}>
                            {getNotesWithoutPrefix(machine.notes) || '-'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm btn-icon"
                                onClick={() => setEditingMachine(machine)}
                                title="Edit"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              {isAdmin && (
                                <button
                                  className="btn btn-danger btn-sm btn-icon"
                                  onClick={() => handleDelete(machine.id)}
                                  disabled={deletingId === machine.id}
                                  title="Hapus"
                                >
                                  {deletingId === machine.id ? (
                                    <span className="spinner" style={{ width: 12, height: 12 }} />
                                  ) : (
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                                    </svg>
                                  )}
                                </button>
                              )}
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Menampilkan {machines.length} dari {totalCount} mesin
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
              >
                ◀ Sebelumnya
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, fontWeight: 600 }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
              >
                Selanjutnya ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <MachineModal onClose={() => setShowAddModal(false)} onSave={() => { fetchMachines(); fetchStats(); }} />
      )}

      {/* Edit Modal */}
      {editingMachine && (
        <MachineModal
          machine={editingMachine}
          onClose={() => setEditingMachine(undefined)}
          onSave={() => { fetchMachines(); fetchStats(); }}
        />
      )}
    </>
  );
}
