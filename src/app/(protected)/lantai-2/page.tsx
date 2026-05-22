'use client';

import { useEffect, useState, useCallback } from 'react';
import BedUnit from '@/components/BedUnit';
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

export default function Lantai2Page() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);

  const fetchBeds = useCallback(async () => {
    try {
      const res = await fetch('/api/beds?floor=2');
      const data = await res.json();
      setBeds(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBeds(); }, [fetchBeds]);

  const getBed = (code: string) => beds.find((b) => b.bedCode === code);

  const handleSave = (updated: Bed) => {
    setBeds((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const stats = {
    available: beds.filter((b) => b.status === 'AVAILABLE').length,
    occupied: beds.filter((b) => b.status === 'OCCUPIED').length,
    maintenance: beds.filter((b) => b.status === 'MAINTENANCE').length,
  };

  if (loading) {
    return (
      <>
        <div className="topbar">
          <div className="topbar-title">Lantai 2 — Peta Ruangan</div>
        </div>
        <div className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b', fontSize: 13 }}>Memuat data tempat tidur...</p>
        </div>
      </>
    );
  }

  // Helper to render a bed cell or empty
  const B = (code: string) => {
    const bed = getBed(code);
    if (!bed) return <div style={{ width: 72, height: 22 }} />;
    return <BedUnit bed={bed} onClick={setSelectedBed} />;
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Lantai 2 — Peta Ruangan</div>
          <div className="topbar-date">Klinik Utama Jakarta Kidney Center</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="floor-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#d1fae5', border: '1.5px solid #6ee7b7' }} />
              Tersedia ({stats.available})
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#fee2e2', border: '1.5px solid #fca5a5' }} />
              Terisi ({stats.occupied})
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: '#fef3c7', border: '1.5px solid #fcd34d' }} />
              Perawatan ({stats.maintenance})
            </div>
          </div>
        </div>
      </div>

      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Lantai 2</h1>
          <p className="page-subtitle">DYALISIS BED AND MACHINE MANAGEMENT — Klinik Utama Jakarta Kidney Center Lantai 2</p>
        </div>

        <div className="floor-map-container">
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>
            DYALISIS BED AND MACHINE MANAGEMENT
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', marginBottom: 20 }}>
            KLINIK UTAMA JAKARTA KIDNEY CENTER Lantai 2
          </div>

          {/* 
            =============================================
            FLOOR MAP — MATCHING THE IMAGE EXACTLY
            =============================================
            Layout:
            [Top-left blue section] [Nurse Station oval] [Doctor Room top-right]
            [Left large section] [Center-left] [Center-right] [Right large section]
            [Bottom center section]
          */}
          <div style={{ minWidth: 720 }}>

            {/* ===== TOP ROW ===== */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>

              {/* Top-Left Section A - Blue bordered */}
              <div className="bed-section" style={{ minWidth: 190 }}>
                <div className="bed-section-label">Seksi A</div>
                {/* 2 columns x 4 rows */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {B('L2-A1')}{B('L2-A2')}
                  {B('L2-A3')}{B('L2-A4')}
                  {B('L2-A5')}{B('L2-A6')}
                  {B('L2-A7')}{B('L2-A8')}
                </div>
              </div>

              {/* Center — Nurse Station */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 130 }}>
                <div className="nurse-station" style={{ width: 130, height: 65 }}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>Nurse Station</span>
                </div>
              </div>

              {/* Top-right — Doctor Consultation Room */}
              <div className="bed-section" style={{ width: 170, minHeight: 130 }}>
                <div className="doctor-room" style={{ height: '100%', minHeight: 110 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div>Doctor</div>
                    <div>Consultation</div>
                    <div>Room</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== MIDDLE ROW ===== */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>

              {/* Left large section B */}
              <div className="bed-section" style={{ minWidth: 190 }}>
                <div className="bed-section-label">Seksi B</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {B('L2-B1')}{B('L2-B2')}
                  {B('L2-B3')}{B('L2-B4')}
                  {B('L2-B5')}{B('L2-B6')}
                  {B('L2-B7')}{B('L2-B8')}
                  {B('L2-B9')}{B('L2-B10')}
                </div>
              </div>

              {/* Center-left section C */}
              <div className="bed-section" style={{ flex: '0 0 auto' }}>
                <div className="bed-section-label">Seksi C</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {B('L2-C1')}{B('L2-C2')}
                  {B('L2-C3')}{B('L2-C4')}
                  {B('L2-C5')}{B('L2-C6')}
                </div>
              </div>

              {/* Center-right section D */}
              <div className="bed-section" style={{ flex: '0 0 auto' }}>
                <div className="bed-section-label">Seksi D</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {B('L2-D1')}{B('L2-D2')}
                  {B('L2-D3')}{B('L2-D4')}
                  {B('L2-D5')}{B('L2-D6')}
                </div>
              </div>

              {/* Right large section E */}
              <div className="bed-section" style={{ minWidth: 190 }}>
                <div className="bed-section-label">Seksi E</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {B('L2-E1')}{B('L2-E2')}
                  {B('L2-E3')}{B('L2-E4')}
                  {B('L2-E5')}{B('L2-E6')}
                  {B('L2-E7')}{B('L2-E8')}
                  {B('L2-E9')}{B('L2-E10')}
                </div>
              </div>
            </div>

            {/* ===== BOTTOM CENTER SECTION F ===== */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="bed-section" style={{ display: 'inline-block' }}>
                <div className="bed-section-label">Seksi F</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {B('L2-F1')}{B('L2-F2')}
                  {B('L2-F3')}{B('L2-F4')}
                  {B('L2-F5')}{B('L2-F6')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ padding: '14px 20px', minWidth: 160 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #1e6fa6, #2d8fd6)', width: 38, height: 38 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M2 10h20v10H2zM2 10V6a2 2 0 012-2h16a2 2 0 012 2v4"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 22 }}>{beds.length}</div>
              <div className="stat-card-label">Total Bed</div>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '14px 20px', minWidth: 160 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', width: 38, height: 38 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 22, color: '#10b981' }}>{stats.available}</div>
              <div className="stat-card-label">Tersedia</div>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '14px 20px', minWidth: 160 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)', width: 38, height: 38 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 22, color: '#ef4444' }}>{stats.occupied}</div>
              <div className="stat-card-label">Terisi</div>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '14px 20px', minWidth: 160 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', width: 38, height: 38 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
              </svg>
            </div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 22, color: '#f59e0b' }}>{stats.maintenance}</div>
              <div className="stat-card-label">Perawatan</div>
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
