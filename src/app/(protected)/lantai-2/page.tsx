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

        {/* Summary */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
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
          <div style={{ minWidth: 850 }}>

            {/* ===== ROW 1: TOP ===== */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'stretch' }}>
              
              {/* Section A - Left of Nurse Room (4 Beds) */}
              <div className="bed-section" style={{ width: 190, padding: 12 }}>
                <div className="bed-section-label">Seksi A (4 Bed)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                  {B('L2-A1')}{B('L2-A2')}
                  {B('L2-A3')}{B('L2-A4')}
                </div>
              </div>

              {/* Center — Nurse Room */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 12, padding: 16 }}>
                <div className="nurse-station" style={{ width: '100%', maxWidth: 200, height: 70 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Nurse Room</span>
                </div>
              </div>

              {/* Right — Doctor Consultation Room */}
              <div className="bed-section" style={{ width: 190, padding: 12, display: 'flex' }}>
                <div className="doctor-room" style={{ flex: 1, height: '100%', minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', fontWeight: 600 }}>
                    <div>Doctor</div>
                    <div>Consultation</div>
                    <div>Room</div>
                  </div>
                </div>
              </div>

            </div>

            {/* ===== ROW 2: BOTTOM ===== */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>

              {/* Section B - Under Section A (7 Beds) */}
              <div className="bed-section" style={{ width: 190, padding: 12 }}>
                <div className="bed-section-label">Seksi B (7 Bed)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                  {B('L2-B1')}{B('L2-B2')}
                  {B('L2-B3')}{B('L2-B4')}
                  {B('L2-B5')}{B('L2-B6')}
                  {B('L2-B7')}<div style={{ width: 72, height: 22 }} />
                </div>
              </div>

              {/* Section C - Center, Right of Section B (13 Beds, divided with partition) */}
              <div className="bed-section" style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div className="bed-section-label">Seksi C (13 Bed)</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', justifyContent: 'space-between' }}>
                  
                  {/* Top part of Section C (6 beds) */}
                  <div style={{ flex: 1, paddingBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Bagian 1</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px 10px' }}>
                      {B('L2-C1')}{B('L2-C2')}{B('L2-C3')}{B('L2-C4')}{B('L2-C5')}{B('L2-C6')}
                    </div>
                  </div>

                  {/* Visual wall / partition line (horizontal) */}
                  <div style={{ borderTop: '2px dashed #cbd5e1', width: '100%', margin: '4px 0' }} />

                  {/* Bottom part of Section C (7 beds) */}
                  <div style={{ flex: 1, paddingTop: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Bagian 2 (Sekat)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px 10px' }}>
                      {B('L2-C7')}{B('L2-C8')}{B('L2-C9')}{B('L2-C10')}{B('L2-C11')}{B('L2-C12')}{B('L2-C13')}
                    </div>
                  </div>

                </div>
              </div>

              {/* Section D - Right of Section C (7 Beds) */}
              <div className="bed-section" style={{ width: 190, padding: 12 }}>
                <div className="bed-section-label">Seksi D (7 Bed)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                  {B('L2-D1')}{B('L2-D2')}
                  {B('L2-D3')}{B('L2-D4')}
                  {B('L2-D5')}{B('L2-D6')}
                  {B('L2-D7')}<div style={{ width: 72, height: 22 }} />
                </div>
              </div>

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
