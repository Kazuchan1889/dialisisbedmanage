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
          <h1 className="page-title">Lantai 3</h1>
          <p className="page-subtitle">DYALISIS BED AND MACHINE MANAGEMENT — Klinik Utama Jakarta Kidney Center Lantai 3</p>
        </div>

        <div className="floor-map-container">
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>
            DYALISIS BED AND MACHINE MANAGEMENT
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', marginBottom: 20 }}>
            KLINIK UTAMA JAKARTA KIDNEY CENTER Lantai 3
          </div>

          {/*
            =============================================
            FLOOR 3 MAP — MATCHING THE IMAGE EXACTLY
            =============================================
            Layout (from image):
            [Top row: 3 room boxes - left, center, right with blue border]
            [Middle: Left Section A] [Center-Left Section B] [Center-Right Section C] [Right Section D]
            [Bottom: Doctor Consultation Room (left) | Nurse Station (center oval)]
          */}
          <div style={{ minWidth: 720 }}>

            {/* ===== TOP ROW: 3 empty rooms ===== */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              {/* Left room (white) */}
              <div style={{
                flex: 2, minHeight: 80, border: '1.5px solid #e2e8f0',
                borderRadius: 6, background: 'white',
              }} />
              {/* Center room (white) */}
              <div style={{
                flex: 2, minHeight: 80, border: '1.5px solid #e2e8f0',
                borderRadius: 6, background: 'white',
              }} />
              {/* Right room (blue) */}
              <div className="bed-section" style={{ flex: 2, minHeight: 80 }}>
                <div style={{ height: '100%' }} />
              </div>
            </div>

            {/* ===== MIDDLE BED ROWS ===== */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>

              {/* Section A — Left (2 columns, 5 rows = 10 beds) */}
              <div className="bed-section" style={{ flex: 1 }}>
                <div className="bed-section-label">Seksi A</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {B('L3-A1')}{B('L3-A2')}
                  {B('L3-A3')}{B('L3-A4')}
                  {B('L3-A5')}{B('L3-A6')}
                  {B('L3-A7')}{B('L3-A8')}
                  {B('L3-A9')}{B('L3-A10')}
                </div>
              </div>

              {/* Section B — Center Left (2 columns, 3 rows = 6 beds) */}
              <div className="bed-section" style={{ flex: 1 }}>
                <div className="bed-section-label">Seksi B</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {B('L3-B1')}{B('L3-B2')}
                  {B('L3-B3')}{B('L3-B4')}
                  {B('L3-B5')}{B('L3-B6')}
                </div>
              </div>

              {/* Section C — Center Right (2 columns, 3 rows = 6 beds) */}
              <div className="bed-section" style={{ flex: 1 }}>
                <div className="bed-section-label">Seksi C</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {B('L3-C1')}{B('L3-C2')}
                  {B('L3-C3')}{B('L3-C4')}
                  {B('L3-C5')}{B('L3-C6')}
                </div>
              </div>

              {/* Section D — Right (2 columns, 5 rows = 10 beds) */}
              <div className="bed-section" style={{ flex: 1 }}>
                <div className="bed-section-label">Seksi D</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px' }}>
                  {B('L3-D1')}{B('L3-D2')}
                  {B('L3-D3')}{B('L3-D4')}
                  {B('L3-D5')}{B('L3-D6')}
                  {B('L3-D7')}{B('L3-D8')}
                  {B('L3-D9')}{B('L3-D10')}
                </div>
              </div>
            </div>

            {/* ===== BOTTOM ROW: Doctor Room + Nurse Station ===== */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* Doctor Consultation Room — bottom left */}
              <div className="bed-section" style={{ flex: 1, minHeight: 80 }}>
                <div className="doctor-room" style={{ height: 80 }}>
                  <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700 }}>
                    <div>Doctor</div>
                    <div>Consultation</div>
                    <div>Room</div>
                  </div>
                </div>
              </div>

              {/* Nurse Station — bottom center oval */}
              <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <div className="nurse-station" style={{ width: 160, height: 70 }}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>Nurse Station</span>
                </div>
              </div>

              {/* Empty space right */}
              <div style={{ flex: 1 }} />
            </div>
          </div>
        </div>

        {/* Summary stats */}
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
