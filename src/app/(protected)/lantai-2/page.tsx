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
    available: beds.filter((b) => b.status === 'AVAILABLE' && !isMachineDamagedOrRepaired(b.machine)).length,
    occupied: beds.filter((b) => b.status === 'OCCUPIED' && !isMachineDamagedOrRepaired(b.machine)).length,
    maintenance: beds.filter((b) => b.status === 'MAINTENANCE' || isMachineDamagedOrRepaired(b.machine)).length,
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

  // Helper to render a bed cell or empty placeholder
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

        {/* Summary Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ padding: '14px 20px', minWidth: 160 }}>
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #1e6fa6, #2d8fd6)', width: 38, height: 38 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M2 10h20v10H2zM2 10V6a2 2 0 012-2h16a2 2 0 012 2v4" />
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
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
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
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
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
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
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

          <div style={{ minWidth: 850 }}>

            {/* ===== ROW 1: TOP ===== */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'stretch' }}>

              {/* KALIKS ROOM (4 Bed): T29, A30 / T28, T31 */}
              <div className="bed-section" style={{ width: 190, padding: 12 }}>
                <div className="bed-section-label">KALIKS ROOM (4 Bed)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                  {B('T29')}{B('A30')}
                  {B('T28')}{B('T31')}
                </div>
              </div>

              {/* Center — Nurse Station */}
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

              {/* KORTEKS ROOM (7 Bed): A27 solo, lalu A26/T21, A25/T22, A24/T23 */}
              <div className="bed-section" style={{ width: 190, padding: 12 }}>
                <div className="bed-section-label">KORTEKS ROOM (7 Bed)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                  {B('A27')}<div style={{ width: 72, height: 22 }} />
                  {B('A26')}{B('T21')}
                  {B('A25')}{B('T22')}
                  {B('A24')}{B('T23')}
                </div>
              </div>

              {/* MEDULA ROOM (13 Bed) */}
              <div
                className="bed-section"
                style={{
                  flex: 1,
                  padding: 12,
                  position: 'relative',
                  minHeight: 430,
                  background: '#f8fafc',
                  border: '2px solid #3b82f6',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="bed-section-label"
                  style={{
                    marginBottom: 10,
                  }}
                >
                  MEDULA ROOM (13 BED)
                </div>

                {/* LEFT SIDE */}
                <div
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: 38,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  {B('T20')}
                  {B('T19')}
                  {B('T18')}

                  {/* divider space */}
                  <div
                    style={{
                      width: 90,
                      height: 8,
                      background: '#ffffff',
                      borderRadius: 999,
                      opacity: 0.9,
                    }}
                  />

                  {B('T17')}
                  {B('T16')}
                  {B('T15')}
                </div>

                {/* RIGHT SIDE */}
                <div
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  {B('T8')}
                  {B('T9')}
                  {B('T10')}
                  {B('T11')}
                  {B('T12')}
                  {B('T13')}
                  {B('T14')}
                </div>

                {/* CENTER OBJECTS / WALKWAY */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '48%',
                    height: '78%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    opacity: 0.22,
                  }}
                >

                  {/* TOP BLOCKS */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 110,
                        height: 80,
                        background: '#ffffff',
                        borderRadius: 4,
                      }}
                    />

                    <div
                      style={{
                        width: 55,
                        height: 86,
                        background: '#ffffff',
                        borderRadius: 4,
                      }}
                    />
                  </div>

                  {/* BOTTOM BLOCKS */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        width: 85,
                        height: 78,
                        background: '#ffffff',
                        borderRadius: 4,
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 90,
                          height: 34,
                          background: '#ffffff',
                          borderRadius: 4,
                        }}
                      />

                      <div
                        style={{
                          width: 90,
                          height: 34,
                          background: '#ffffff',
                          borderRadius: 4,
                        }}
                      />
                    </div>

                    <div
                      style={{
                        width: 22,
                        height: 30,
                        background: '#ffffff',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* PAPILA ROOM (7 Bed): [empty,T1], [T7,T2], [T6,T3], [T5,T4] */}
              <div className="bed-section" style={{ width: 190, padding: 12 }}>
                <div className="bed-section-label">PAPILA ROOM (7 Bed)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                  <div style={{ width: 72, height: 22 }} />{B('T1')}
                  {B('T7')}{B('T2')}
                  {B('T6')}{B('T3')}
                  {B('T5')}{B('T4')}
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
