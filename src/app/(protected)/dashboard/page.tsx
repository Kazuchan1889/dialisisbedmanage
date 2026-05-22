'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  totalMachines: number;
  machineMaintenance: number;
  occupancyRate: number;
  floor2: { total: number; occupied: number; available: number };
  floor3: { total: number; occupied: number; available: number };
}

function OccupancyRing({ percent, size = 120 }: { percent: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (percent / 100) * circ;

  return (
    <div className="occupancy-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#grad)"
          strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e6fa6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="occupancy-text">
        <div className="occupancy-pct">{percent}%</div>
        <div className="occupancy-label">Terisi</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    // Live clock
    const updateClock = () => {
      setNow(new Date().toLocaleString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
      }));
    };
    updateClock();
    const t = setInterval(updateClock, 1000);
    return () => clearInterval(t);
  }, []);

  const statCards = stats
    ? [
        {
          label: 'Total Tempat Tidur',
          value: stats.totalBeds,
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M2 10h20M2 10v10M22 10v10M2 6h20M7 10V6M17 10V6"/>
            </svg>
          ),
          iconBg: 'linear-gradient(135deg, #1e6fa6, #2d8fd6)',
          sub: `${stats.floor2.total} Lantai 2 + ${stats.floor3.total} Lantai 3`,
        },
        {
          label: 'Tempat Tidur Terisi',
          value: stats.occupiedBeds,
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
            </svg>
          ),
          iconBg: 'linear-gradient(135deg, #ef4444, #f87171)',
          sub: `${stats.occupancyRate}% tingkat hunian`,
        },
        {
          label: 'Tempat Tidur Tersedia',
          value: stats.availableBeds,
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
            </svg>
          ),
          iconBg: 'linear-gradient(135deg, #10b981, #34d399)',
          sub: `${stats.maintenanceBeds} dalam perawatan`,
        },
        {
          label: 'Mesin Dalam Perawatan',
          value: stats.machineMaintenance,
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          ),
          iconBg: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
          sub: `dari ${stats.totalMachines} total mesin`,
        },
      ]
    : [];

  return (
    <>
      {/* Top bar */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-date">{now}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/lantai-2" className="btn btn-secondary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12l9-9 9 9M5 10v9h4v-5h4v5h4V10"/>
            </svg>
            Lantai 2
          </Link>
          <Link href="/lantai-3" className="btn btn-secondary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12l9-9 9 9M5 10v9h4v-5h4v5h4V10"/>
            </svg>
            Lantai 3
          </Link>
        </div>
      </div>

      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Ikhtisar Sistem</h1>
          <p className="page-subtitle">Klinik Utama Jakarta Kidney Center — Manajemen Bed & Mesin Dialisis</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: 13 }}>Memuat data...</p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              {statCards.map((card) => (
                <div key={card.label} className="stat-card">
                  <div className="stat-card-icon" style={{ background: card.iconBg }}>
                    {card.icon}
                  </div>
                  <div>
                    <div className="stat-card-value">{card.value}</div>
                    <div className="stat-card-label">{card.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{card.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Floor Details + Occupancy */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 16, marginBottom: 24 }}>
              {/* Floor 2 */}
              <div className="floor-stat">
                <div className="floor-stat-header">
                  <span className="floor-stat-title">🏥 Lantai 2</span>
                  <Link href="/lantai-2" className="floor-stat-badge">Lihat Peta →</Link>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <OccupancyRing
                    percent={stats!.floor2.total > 0 ? Math.round((stats!.floor2.occupied / stats!.floor2.total) * 100) : 0}
                    size={100}
                  />
                </div>
                <div className="floor-stat-row">
                  <span>Total Tempat Tidur</span>
                  <span className="floor-stat-value">{stats!.floor2.total}</span>
                </div>
                <div className="floor-stat-row">
                  <span>Terisi</span>
                  <span className="floor-stat-value" style={{ color: '#ef4444' }}>{stats!.floor2.occupied}</span>
                </div>
                <div className="floor-stat-row">
                  <span>Tersedia</span>
                  <span className="floor-stat-value" style={{ color: '#10b981' }}>{stats!.floor2.available}</span>
                </div>
                <div className="progress-bar" style={{ marginTop: 12 }}>
                  <div className="progress-fill" style={{
                    width: `${stats!.floor2.total > 0 ? (stats!.floor2.occupied / stats!.floor2.total) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #ef4444, #f87171)',
                  }} />
                </div>
              </div>

              {/* Floor 3 */}
              <div className="floor-stat">
                <div className="floor-stat-header">
                  <span className="floor-stat-title">🏥 Lantai 3</span>
                  <Link href="/lantai-3" className="floor-stat-badge">Lihat Peta →</Link>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <OccupancyRing
                    percent={stats!.floor3.total > 0 ? Math.round((stats!.floor3.occupied / stats!.floor3.total) * 100) : 0}
                    size={100}
                  />
                </div>
                <div className="floor-stat-row">
                  <span>Total Tempat Tidur</span>
                  <span className="floor-stat-value">{stats!.floor3.total}</span>
                </div>
                <div className="floor-stat-row">
                  <span>Terisi</span>
                  <span className="floor-stat-value" style={{ color: '#ef4444' }}>{stats!.floor3.occupied}</span>
                </div>
                <div className="floor-stat-row">
                  <span>Tersedia</span>
                  <span className="floor-stat-value" style={{ color: '#10b981' }}>{stats!.floor3.available}</span>
                </div>
                <div className="progress-bar" style={{ marginTop: 12 }}>
                  <div className="progress-fill" style={{
                    width: `${stats!.floor3.total > 0 ? (stats!.floor3.occupied / stats!.floor3.total) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #ef4444, #f87171)',
                  }} />
                </div>
              </div>

              {/* Status Legend */}
              <div className="floor-stat">
                <div className="floor-stat-header">
                  <span className="floor-stat-title">Legenda Status</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { color: '#10b981', bg: '#ecfdf5', label: 'Tersedia', count: stats!.availableBeds },
                    { color: '#ef4444', bg: '#fef2f2', label: 'Terisi', count: stats!.occupiedBeds },
                    { color: '#f59e0b', bg: '#fffbeb', label: 'Perawatan', count: stats!.maintenanceBeds },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 22, borderRadius: 5,
                        background: item.bg, border: `1.5px solid ${item.color}`,
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2332' }}>{item.label}</div>
                      </div>
                      <div style={{
                        fontSize: 16, fontWeight: 800, color: item.color,
                      }}>{item.count}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', fontWeight: 500 }}>
                    Klik tempat tidur di peta untuk mengubah status
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2332', marginBottom: 14 }}>
                Akses Cepat
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/lantai-2" className="btn btn-primary btn-sm">
                  🏥 Peta Lantai 2
                </Link>
                <Link href="/lantai-3" className="btn btn-primary btn-sm">
                  🏥 Peta Lantai 3
                </Link>
                <Link href="/user-management" className="btn btn-secondary btn-sm">
                  👥 Kelola Pengguna
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
