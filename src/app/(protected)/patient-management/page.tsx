'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Patient {
  id: string;
  title?: string | null;
  name: string;
  initialAssessment?: string | null;
  dateOfBirth: string;
  nik?: string | null;
  jknNumber?: string | null;
  mrNumber: string;
  dead: boolean;
  travelling: boolean;
  moved: boolean;
  createdAt: string;
}

interface PatientFormData {
  title: string;
  name: string;
  initialAssessment: string;
  dateOfBirth: string;
  nik: string;
  jknNumber: string;
  mrNumber: string;
  statusFlag: 'dead' | 'travelling' | 'moved' | null;
}

function PatientModal({
  patient,
  onClose,
  onSave,
}: {
  patient?: Patient;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!patient;
  const [form, setForm] = useState<PatientFormData>({
    title: patient?.title || '',
    name: patient?.name || '',
    initialAssessment: patient?.initialAssessment || '',
    dateOfBirth: patient?.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
    nik: patient?.nik || '',
    jknNumber: patient?.jknNumber || '',
    mrNumber: patient?.mrNumber || '',
    statusFlag: patient?.dead ? 'dead' : patient?.travelling ? 'travelling' : patient?.moved ? 'moved' : null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = isEdit ? `/api/patients/${patient!.id}` : '/api/patients';
      const method = isEdit ? 'PATCH' : 'POST';

      const body = {
        title: form.title || null,
        name: form.name,
        initialAssessment: form.initialAssessment || null,
        dateOfBirth: form.dateOfBirth,
        nik: form.nik || null,
        jknNumber: form.jknNumber || null,
        mrNumber: form.mrNumber,
        dead: form.statusFlag === 'dead',
        travelling: form.statusFlag === 'travelling',
        moved: form.statusFlag === 'moved',
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const handleCheckboxChange = (flag: 'dead' | 'travelling' | 'moved') => {
    setForm((prev) => ({
      ...prev,
      statusFlag: prev.statusFlag === flag ? null : flag,
    }));
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{isEdit ? 'Edit Data Pasien' : 'Tambah Pasien Baru'}</div>
            <div className="modal-subtitle">{isEdit ? `Mengubah: Pasien ${patient!.name}` : 'Isi formulir lengkap sesuai data pasien'}</div>
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

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <select
                  className="form-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                >
                  <option value="">-- Pilih --</option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Tn">Tn</option>
                  <option value="Ny">Ny</option>
                  <option value="Nn">Nn</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nama Pasien *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nama lengkap pasien"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">No. Rekam Medis (MR) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: MR-0123"
                  value={form.mrNumber}
                  onChange={(e) => setForm({ ...form, mrNumber: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Lahir *</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">NIK (No. KTP)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="16 digit angka"
                  value={form.nik}
                  onChange={(e) => setForm({ ...form, nik: e.target.value })}
                  maxLength={16}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nomor Kartu JKN</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="No. BPJS Kesehatan"
                  value={form.jknNumber}
                  onChange={(e) => setForm({ ...form, jknNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Patient Assessment (Pengkajian Awal)</label>
              <textarea
                className="form-textarea"
                placeholder="Tulis ringkasan penilaian/pengkajian awal medis..."
                value={form.initialAssessment}
                onChange={(e) => setForm({ ...form, initialAssessment: e.target.value })}
                rows={3}
              />
            </div>

            {/* Mutually Exclusive Status Checkboxes */}
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Status Pasien (Pilih Salah Satu)</label>
              <div style={{ display: 'flex', gap: 20, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={form.statusFlag === 'dead'}
                    onChange={() => handleCheckboxChange('dead')}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span>Dead 💀</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={form.statusFlag === 'travelling'}
                    onChange={() => handleCheckboxChange('travelling')}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span>Travelling ✈️</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={form.statusFlag === 'moved'}
                    onChange={() => handleCheckboxChange('moved')}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span>Moved 📦</span>
                </label>
              </div>
              <span style={{ fontSize: 10, color: '#64748b', marginTop: 4, display: 'block' }}>
                * Pasien hanya bisa ditandai aktif di salah satu status atau tanpa status.
              </span>
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
                <>{isEdit ? '💾 Simpan Perubahan' : '➕ Tambah Pasien'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PatientManagementPage() {
  const { data: session } = useSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    dead: 0,
    travelling: 0,
    moved: 0,
  });

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);

      const res = await fetch(`/api/patients?${params.toString()}`);
      const data = await res.json();
      
      setPatients(data.patients || []);
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
      const res = await fetch('/api/patients?limit=99999');
      const data = await res.json();
      const list: Patient[] = data.patients || [];
      setStats({
        total: list.length,
        dead: list.filter((p) => p.dead).length,
        travelling: list.filter((p) => p.travelling).length,
        moved: list.filter((p) => p.moved).length,
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    fetchStats();
  }, [fetchPatients, fetchStats]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  const handleToggleStatus = async (patient: Patient, flag: 'dead' | 'travelling' | 'moved') => {
    const isCurrentlyActive = patient[flag];
    const body = {
      dead: flag === 'dead' ? !isCurrentlyActive : false,
      travelling: flag === 'travelling' ? !isCurrentlyActive : false,
      moved: flag === 'moved' ? !isCurrentlyActive : false,
    };

    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updatedPatient = await res.json();
        setPatients((prev) => prev.map((p) => p.id === patient.id ? updatedPatient : p));
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pasien ini?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPatients((prev) => prev.filter((p) => p.id !== id));
        fetchStats();
        // If current page is empty after delete and page > 1, go back
        if (patients.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }
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
          <div className="topbar-title">Patient Management</div>
          <div className="topbar-date">Kelola data klinis pasien</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Tambah Pasien
        </button>
      </div>

      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Patient Management</h1>
          <p className="page-subtitle">Kelola rekam medis dan status pasien dialysis Klinik Utama Jakarta Kidney Center</p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #1e6fa6, #2d8fd6)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20 }}>{stats.total}</div>
              <div className="stat-card-label">Total Pasien</div>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <path d="M12 2v9M8 5h8"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#ef4444' }}>{stats.dead}</div>
              <div className="stat-card-label">Dead 💀</div>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#f59e0b' }}>{stats.travelling}</div>
              <div className="stat-card-label">Travelling ✈️</div>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M10 17l5-5-5-5M4 12h11M20 4v16"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#6366f1' }}>{stats.moved}</div>
              <div className="stat-card-label">Moved 📦</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-wrapper">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Cari pasien berdasarkan nama, NIK, atau No. MR..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Patient Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner spinner-dark" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: '#64748b', fontSize: 13 }}>Memuat data pasien...</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Initial patient assessment</th>
                    <th>Date of birth</th>
                    <th>NIK</th>
                    <th>Nomor Kartu JKN</th>
                    <th>NO. MR</th>
                    <th style={{ textAlign: 'center' }}>Dead</th>
                    <th style={{ textAlign: 'center' }}>Travelling</th>
                    <th style={{ textAlign: 'center' }}>Moved</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                        {search ? 'Pasien tidak ditemukan.' : 'Belum ada data pasien.'}
                      </td>
                    </tr>
                  ) : (
                    patients.map((patient) => (
                      <tr key={patient.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: 'white',
                            }}>
                              {patient.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {patient.title ? `${patient.title}. ` : ''}{patient.name}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={patient.initialAssessment || ''}>
                          {patient.initialAssessment || '-'}
                        </td>
                        <td style={{ fontSize: 12, color: '#475569' }}>
                          {new Date(patient.dateOfBirth).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td>
                          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#475569' }}>
                            {patient.nik || '-'}
                          </code>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: '#475569' }}>
                            {patient.jknNumber || '-'}
                          </span>
                        </td>
                        <td>
                          <code style={{ background: '#eff6ff', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#1e40af', fontWeight: 600 }}>
                            {patient.mrNumber}
                          </code>
                        </td>
                        {/* Status Checkboxes */}
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={patient.dead}
                            onChange={() => handleToggleStatus(patient, 'dead')}
                            style={{ cursor: 'pointer', width: 15, height: 15 }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={patient.travelling}
                            onChange={() => handleToggleStatus(patient, 'travelling')}
                            style={{ cursor: 'pointer', width: 15, height: 15 }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={patient.moved}
                            onChange={() => handleToggleStatus(patient, 'moved')}
                            style={{ cursor: 'pointer', width: 15, height: 15 }}
                          />
                        </td>
                        {/* Actions */}
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm btn-icon"
                              onClick={() => setEditingPatient(patient)}
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
                                onClick={() => handleDelete(patient.id)}
                                disabled={deletingId === patient.id}
                                title="Hapus"
                              >
                                {deletingId === patient.id ? (
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
                    ))
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
              Menampilkan {patients.length} dari {totalCount} pasien
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
        <PatientModal onClose={() => setShowAddModal(false)} onSave={fetchPatients} />
      )}

      {/* Edit Modal */}
      {editingPatient && (
        <PatientModal patient={editingPatient} onClose={() => setEditingPatient(undefined)} onSave={fetchPatients} />
      )}
    </>
  );
}
