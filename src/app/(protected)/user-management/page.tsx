'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | 'TECHNICIAN' | 'SUPERVISOR' | 'MANAGEMENT';
  active: boolean;
  createdAt: string;
}

interface UserFormData {
  username: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | 'TECHNICIAN' | 'SUPERVISOR' | 'MANAGEMENT';
  password: string;
}

function UserModal({
  user,
  onClose,
  onSave,
}: {
  user?: User;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState<UserFormData>({
    username: user?.username || '',
    name: user?.name || '',
    role: user?.role || 'STAFF',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = isEdit ? `/api/users/${user!.id}` : '/api/users';
      const method = isEdit ? 'PATCH' : 'POST';

      const body: any = { name: form.name, role: form.role };
      if (!isEdit) { body.username = form.username; body.password = form.password; }
      if (isEdit && form.password) body.password = form.password;

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

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">{isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</div>
            <div className="modal-subtitle">{isEdit ? `Mengubah: ${user!.username}` : 'Isi data pengguna baru'}</div>
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

            {!isEdit && (
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: nurse01"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Nama Lengkap *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nama lengkap pengguna"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              >
                <option value="STAFF">Staff / Perawat</option>
                <option value="TECHNICIAN">Technician / Teknisi</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="MANAGEMENT">Management</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}
              </label>
              <input
                type="password"
                className="form-input"
                placeholder={isEdit ? 'Biarkan kosong untuk mempertahankan' : 'Minimal 6 karakter'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!isEdit}
                minLength={isEdit ? 0 : 6}
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
                <>{isEdit ? '💾 Simpan Perubahan' : '➕ Tambah Pengguna'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentUserId = (session?.user as any)?.id;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) { console.error(e); } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">User Management</div>
          <div className="topbar-date">Kelola pengguna sistem</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Tambah Pengguna
          </button>
        )}
      </div>

      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Kelola daftar pengguna yang memiliki akses ke sistem</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #1e6fa6, #2d8fd6)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20 }}>{users.length}</div>
              <div className="stat-card-label">Total Pengguna</div>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#10b981' }}>{users.filter((u) => u.active).length}</div>
              <div className="stat-card-label">Aktif</div>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20 }}>{users.filter((u) => u.role === 'ADMIN').length}</div>
              <div className="stat-card-label">Administrator</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-wrapper">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Cari pengguna..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner spinner-dark" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: '#64748b', fontSize: 13 }}>Memuat data...</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Tanggal Dibuat</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                        {search ? 'Pengguna tidak ditemukan.' : 'Belum ada pengguna.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: user.role === 'ADMIN'
                                ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                                : user.role === 'TECHNICIAN'
                                ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                                : user.role === 'SUPERVISOR'
                                ? 'linear-gradient(135deg, #10b981, #34d399)'
                                : user.role === 'MANAGEMENT'
                                ? 'linear-gradient(135deg, #06b6d4, #22d3ee)'
                                : 'linear-gradient(135deg, #1e6fa6, #2d8fd6)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: 'white',
                            }}>
                              {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
                              {user.id === currentUserId && (
                                <div style={{ fontSize: 10, color: '#1e6fa6', fontWeight: 600 }}>• Anda</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <code style={{
                            background: '#f1f5f9', padding: '2px 8px', borderRadius: 5,
                            fontSize: 12, color: '#475569', fontFamily: 'monospace',
                          }}>
                            {user.username}
                          </code>
                        </td>
                        <td>
                          <span className={`badge badge-${user.role === 'ADMIN' ? 'admin' : user.role === 'TECHNICIAN' ? 'maintenance' : user.role === 'SUPERVISOR' ? 'active' : user.role === 'MANAGEMENT' ? 'staff' : 'staff'}`}>
                            {user.role === 'ADMIN' ? '🛡️ Admin' : user.role === 'TECHNICIAN' ? '🔧 Teknisi' : user.role === 'SUPERVISOR' ? '📋 Supervisor' : user.role === 'MANAGEMENT' ? '📈 Management' : '👤 Staff'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${user.active ? 'active' : 'inactive'}`}>
                            {user.active ? '● Aktif' : '○ Nonaktif'}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: 12 }}>
                          {new Date(user.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </td>
                        {isAdmin && (
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm btn-icon"
                                onClick={() => setEditingUser(user)}
                                title="Edit"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button
                                className={`btn btn-sm btn-icon ${user.active ? 'btn-secondary' : 'btn-secondary'}`}
                                onClick={() => handleToggleActive(user)}
                                title={user.active ? 'Nonaktifkan' : 'Aktifkan'}
                                style={{ fontSize: 13 }}
                                disabled={user.id === currentUserId}
                              >
                                {user.active ? (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                  </svg>
                                ) : (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                                  </svg>
                                )}
                              </button>
                              {user.id !== currentUserId && (
                                <button
                                  className="btn btn-danger btn-sm btn-icon"
                                  onClick={() => handleDelete(user.id)}
                                  disabled={deletingId === user.id}
                                  title="Hapus"
                                >
                                  {deletingId === user.id ? (
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
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info note */}
        {!isAdmin && (
          <div style={{
            marginTop: 16, padding: '12px 16px', background: '#eff6ff',
            border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 12, color: '#1d4ed8',
          }}>
            ℹ️ Hanya Administrator yang dapat menambah, mengubah, atau menghapus pengguna.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <UserModal onClose={() => setShowAddModal(false)} onSave={fetchUsers} />
      )}

      {/* Edit Modal */}
      {editingUser && (
        <UserModal user={editingUser} onClose={() => setEditingUser(undefined)} onSave={fetchUsers} />
      )}
    </>
  );
}
