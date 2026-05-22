'use client';

import { useState } from 'react';

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

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/beds/${bed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, patientName, patientId, notes }),
      });

      if (!res.ok) throw new Error('Gagal menyimpan');
      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch (e) {
      setError('Gagal menyimpan perubahan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const statusColors = {
    AVAILABLE: { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
    OCCUPIED: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    MAINTENANCE: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  };

  const sc = statusColors[status];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
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

        <div className="modal-body">
          {error && <div className="error-alert">{error}</div>}

          {/* Current status visual */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
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

          {/* Status */}
          <div className="form-group">
            <label className="form-label">Status Tempat Tidur</label>
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="AVAILABLE">✅ Tersedia</option>
              <option value="OCCUPIED">🔴 Terisi / Pasien</option>
              <option value="MAINTENANCE">🟡 Perawatan / Perbaikan</option>
            </select>
          </div>

          {/* Patient fields - only shown when occupied */}
          {status === 'OCCUPIED' && (
            <>
              <div className="form-group">
                <label className="form-label">Nama Pasien</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan nama pasien"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">No. Rekam Medis (opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: RM-001234"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Catatan (opsional)</label>
            <textarea
              className="form-textarea"
              placeholder="Tambahkan catatan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Machine info */}
          {bed.machine && (
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Info Mesin
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
        </div>

        <div className="modal-footer">
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
