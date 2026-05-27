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
    <p className="page-subtitle">
      DYALISIS BED AND MACHINE MANAGEMENT — Klinik Utama Jakarta Kidney Center Lantai 2
    </p>
  </div>

  {/* SUMMARY */}
  <div
    style={{
      display: "flex",
      gap: 12,
      marginBottom: 20,
      flexWrap: "wrap",
    }}
  >
    <div
      className="stat-card"
      style={{ padding: "14px 20px", minWidth: 160 }}
    >
      <div
        className="stat-card-icon"
        style={{
          background: "linear-gradient(135deg, #1e6fa6, #2d8fd6)",
          width: 38,
          height: 38,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
        >
          <path d="M2 10h20v10H2zM2 10V6a2 2 0 012-2h16a2 2 0 012 2v4" />
        </svg>
      </div>

      <div>
        <div className="stat-card-value" style={{ fontSize: 22 }}>
          {beds.length}
        </div>
        <div className="stat-card-label">Total Bed</div>
      </div>
    </div>

    <div
      className="stat-card"
      style={{ padding: "14px 20px", minWidth: 160 }}
    >
      <div
        className="stat-card-icon"
        style={{
          background: "linear-gradient(135deg, #10b981, #34d399)",
          width: 38,
          height: 38,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
        >
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
        </svg>
      </div>

      <div>
        <div
          className="stat-card-value"
          style={{ fontSize: 22, color: "#10b981" }}
        >
          {stats.available}
        </div>
        <div className="stat-card-label">Tersedia</div>
      </div>
    </div>

    <div
      className="stat-card"
      style={{ padding: "14px 20px", minWidth: 160 }}
    >
      <div
        className="stat-card-icon"
        style={{
          background: "linear-gradient(135deg, #ef4444, #f87171)",
          width: 38,
          height: 38,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      </div>

      <div>
        <div
          className="stat-card-value"
          style={{ fontSize: 22, color: "#ef4444" }}
        >
          {stats.occupied}
        </div>
        <div className="stat-card-label">Terisi</div>
      </div>
    </div>

    <div
      className="stat-card"
      style={{ padding: "14px 20px", minWidth: 160 }}
    >
      <div
        className="stat-card-icon"
        style={{
          background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
          width: 38,
          height: 38,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
        </svg>
      </div>

      <div>
        <div
          className="stat-card-value"
          style={{ fontSize: 22, color: "#f59e0b" }}
        >
          {stats.maintenance}
        </div>
        <div className="stat-card-label">Perawatan</div>
      </div>
    </div>
  </div>

  {/* FLOOR MAP */}
  <div className="floor-map-container">
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 2,
      }}
    >
      DYALISIS BED AND MACHINE MANAGEMENT
    </div>

    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: "#475569",
        marginBottom: 20,
      }}
    >
      KLINIK UTAMA JAKARTA KIDNEY CENTER Lantai 2
    </div>

    <div style={{ minWidth: 950 }}>

      {/* ================= TOP ================= */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          alignItems: "stretch",
        }}
      >

        {/* KALIKS */}
        <div
          className="bed-section"
          style={{
            width: 200,
            padding: 12,
            background: "#f8fafc",
            border: "2px solid #3b82f6",
            borderRadius: 8,
          }}
        >
          <div className="bed-section-label">KALIKS ROOM (4 BED)</div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginTop: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {B("L2-A1")}
              {B("L2-A2")}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {B("L2-A3")}
              {B("L2-A4")}
            </div>
          </div>
        </div>

        {/* NURSE STATION */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            className="nurse-station"
            style={{
              width: "100%",
              maxWidth: 230,
              height: 70,
              border: "2px solid #64748b",
              borderRadius: 999,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              Nurse <span style={{ color: "#dc2626" }}>Station</span>
            </span>
          </div>
        </div>

        {/* DOCTOR ROOM */}
        <div
          className="bed-section"
          style={{
            width: 200,
            padding: 12,
            background: "#f8fafc",
            border: "2px solid #3b82f6",
            borderRadius: 8,
            display: "flex",
          }}
        >
          <div
            className="doctor-room"
            style={{
              flex: 1,
              minHeight: 90,
              border: "2px solid #3b82f6",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center", fontWeight: 600 }}>
              <div>Doctor</div>
              <div>Consultation</div>
              <div>Room</div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM ================= */}
      <div style={{ display: "flex", gap: 16 }}>

        {/* KORTEKS */}
        <div
          className="bed-section"
          style={{
            width: 200,
            padding: 12,
            background: "#f8fafc",
            border: "2px solid #3b82f6",
            borderRadius: 8,
          }}
        >
          <div className="bed-section-label">KORTEKS ROOM (7 BED)</div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginTop: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {B("L2-B1")}
              {B("L2-B2")}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {B("L2-B3")}
              {B("L2-B4")}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {B("L2-B5")}
              {B("L2-B6")}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              {B("L2-B7")}
            </div>
          </div>
        </div>

        {/* MEDULA */}
        <div
          className="bed-section"
          style={{
            flex: 1,
            padding: 12,
            background: "#f8fafc",
            border: "2px solid #3b82f6",
            borderRadius: 8,
            position: "relative",
            minHeight: 470,
            overflow: "hidden",
          }}
        >
          <div className="bed-section-label">MEDULA ROOM (13 BED)</div>

          {/* LEFT SIDE */}
          <div
            style={{
              position: "absolute",
              left: 14,
              top: 34,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {B("L2-C1")}
            {B("L2-C2")}
            {B("L2-C3")}

            <div style={{ height: 40 }} />

            {B("L2-C4")}
            {B("L2-C5")}
            {B("L2-C6")}
          </div>

          {/* RIGHT SIDE */}
          <div
            style={{
              position: "absolute",
              right: 14,
              top: 10,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {B("L2-C7")}
            {B("L2-C8")}
            {B("L2-C9")}
            {B("L2-C10")}
            {B("L2-C11")}
            {B("L2-C12")}
            {B("L2-C13")}
          </div>

          {/* CENTER WALKWAY */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "55%",
              height: "70%",
              opacity: 0.2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >

            {/* TOP */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 80,
                  background: "#ffffff",
                  borderRadius: 6,
                }}
              />

              <div
                style={{
                  width: 80,
                  height: 80,
                  background: "#ffffff",
                  borderRadius: 6,
                }}
              />
            </div>

            {/* BOTTOM */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  width: 90,
                  height: 80,
                  background: "#ffffff",
                  borderRadius: 6,
                }}
              />

              <div
                style={{
                  width: 90,
                  height: 40,
                  background: "#ffffff",
                  borderRadius: 6,
                }}
              />

              <div
                style={{
                  width: 60,
                  height: 30,
                  background: "#ffffff",
                  borderRadius: 6,
                }}
              />
            </div>
          </div>
        </div>

        {/* PAPILA */}
        <div
          className="bed-section"
          style={{
            width: 200,
            padding: 12,
            background: "#ffffff",
            border: "2px solid #3b82f6",
            borderRadius: 8,
          }}
        >
          <div className="bed-section-label">PAPILA ROOM (7 BED)</div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginTop: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {B("L2-D1")}
              {B("L2-D2")}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {B("L2-D3")}
              {B("L2-D4")}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {B("L2-D5")}
              {B("L2-D6")}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              {B("L2-D7")}
            </div>
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
