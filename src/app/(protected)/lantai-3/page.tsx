'use client';

import { useEffect, useState, useCallback } from 'react';
import BedUnit, { isMachineDamagedOrRepaired } from '@/components/BedUnit';
import BedModal from '@/components/BedModal';

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

export default function Lantai3Page() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);

  const fetchBeds = useCallback(async () => {
    try {
      const res = await fetch('/api/beds?floor=3');
      const data = await res.json();
      setBeds(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBeds();
  }, [fetchBeds]);

  const getBed = (code: string) => beds.find((b) => b.bedCode === code);

  const handleSave = (updated: Bed) => {
    setBeds((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    fetchBeds(); // Reload beds to ensure machine statuses sync
  };

  const stats = {
    available: beds.filter((b) => b.status === 'AVAILABLE' && !isMachineDamagedOrRepaired(b.machine)).length,
    occupied: beds.filter((b) => b.status === 'OCCUPIED' && !isMachineDamagedOrRepaired(b.machine)).length,
    maintenance: beds.filter((b) => b.status === 'MAINTENANCE' || isMachineDamagedOrRepaired(b.machine)).length,
  };

  if (loading) {
    return (
      <>
        <div className="topbar">
          <div className="topbar-title">Lantai 3 — Peta Ruangan</div>
        </div>
        <div className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b', fontSize: 13 }}>Memuat data tempat tidur...</p>
        </div>
      </>
    );
  }

  const B = (code: string) => {
    const bed = getBed(code);
    if (!bed) return <div style={{ width: 72, height: 22 }} />;
    return <BedUnit bed={bed} onClick={setSelectedBed} />;
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Lantai 3 — Peta Ruangan</div>
          <div className="topbar-date">Klinik Utama Jakarta Kidney Center</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="floor-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0' }} />
              Tersedia ({stats.available})
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }} />
              Terisi ({stats.occupied})
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }} />
              Perawatan ({stats.maintenance})
            </div>
          </div>
        </div>
      </div>

      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Lantai 3</h1>
          <p className="page-subtitle">DIALYSIS BED AND MACHINE MANAGEMENT — Klinik Utama Jakarta Kidney Center Lantai 3</p>
        </div>

        {/* Mobile Legend */}
        <div className="mobile-legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0' }} />Tersedia ({stats.available})</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }} />Terisi ({stats.occupied})</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }} />Perawatan ({stats.maintenance})</div>
        </div>

        {/* Stats Cards - Relocated to the top for consistency and clinical visibility */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140, flex: '1 1 140px' }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #1e6fa6, #2d8fd6)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M2 10h20v10H2zM2 10V6a2 2 0 012-2h16a2 2 0 012 2v4"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20 }}>{beds.length}</div>
              <div className="stat-card-label">Total Bed</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140, flex: '1 1 140px' }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#10b981' }}>{stats.available}</div>
              <div className="stat-card-label">Tersedia</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140, flex: '1 1 140px' }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#ef4444' }}>{stats.occupied}</div>
              <div className="stat-card-label">Terisi</div>
            </div>
          </div>

          <div className="stat-card" style={{ padding: '12px 18px', minWidth: 140, flex: '1 1 140px' }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', width: 36, height: 36 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 20, color: '#f59e0b' }}>{stats.maintenance}</div>
              <div className="stat-card-label">Perawatan</div>
            </div>
          </div>
        </div>

        <div className="floor-map-container">
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>
            DIALYSIS BED AND MACHINE MANAGEMENT
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', marginBottom: 20 }}>
            KLINIK UTAMA JAKARTA KIDNEY CENTER Lantai 3
          </div>

          <div style={{ minWidth: 720 }}>
            {/* ===== MIDDLE BED ROWS (3 SECTIONS) ===== */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', marginBottom: 20 }}>

              {/* Papila Room — Left (6 beds in 2x3 grid layout) */}
              <div className="bed-section" style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="bed-section-label" style={{ textAlign: 'center', width: '100%' }}>Papila Room</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 80px', justifyItems: 'center', width: 'fit-content' }}>
                  {B('B34')}{B('B35')}
                  {B('B33')}{B('B36')}
                  {B('B32')}{B('B37')}
                </div>
              </div>

              {/* Medula Room — Center (5 beds in 2x3 grid layout) */}
              <div className="bed-section" style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="bed-section-label" style={{ textAlign: 'center', width: '100%' }}>Medula Room</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 80px', justifyItems: 'center', width: 'fit-content' }}>
                  {B('T40')}<div style={{ width: 72, height: 22 }} />
                  {B('T39')}{B('T41')}
                  {B('T38')}{B('T42')}
                </div>
              </div>

              {/* Korteks Room — Right (2 beds in 2x3 grid layout) */}
              <div className="bed-section" style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="bed-section-label" style={{ textAlign: 'center', width: '100%' }}>Korteks Room</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 80px', justifyItems: 'center', width: 'fit-content', height: '100%', minHeight: 120 }}>
                  <div style={{ width: 72, height: 22 }} />{B('T44')}
                  <div style={{ width: 72, height: 22 }} /><div style={{ width: 72, height: 22 }} />
                  {B('A43')}<div style={{ width: 72, height: 22 }} />
                </div>
              </div>
            </div>

            {/* ===== BOTTOM ROW: Doctor Room + Nurse Station ===== */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
              {/* Doctor Consultation & CAPD Room — bottom left */}
              <div className="bed-section" style={{ flex: 1, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <div className="doctor-room" style={{ width: '100%', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700 }}>
                    <div style={{ color: '#1e3a8a' }}>Doctor</div>
                    <div style={{ color: '#1e3a8a' }}><span style={{ color: '#1e3a8a' }}>Consultation & </span><span style={{ color: '#991b1b', fontWeight: 800 }}>CAPD</span></div>
                    <div style={{ color: '#1e3a8a' }}>Room</div>
                  </div>
                </div>
              </div>

              {/* Nurse Station — bottom center oval */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <div className="nurse-station" style={{ width: '100%', height: 80, borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Nurse Station</span>
                </div>
              </div>

              {/* Empty space right to align the grid */}
              <div style={{ flex: 1 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bed Modal */}
      {selectedBed && (
        <BedModal
          bed={selectedBed}
          onClose={() => setSelectedBed(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
