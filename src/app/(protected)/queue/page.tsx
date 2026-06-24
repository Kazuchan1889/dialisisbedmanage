'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Types ──────────────────────────────────────────────────── */
interface QueueTicket {
  id: string;
  category: string;
  queueNumber: number;
  patientName: string | null;
  status: string;
  counter: string | null;
  calledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ─── Constants ──────────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'POLI',     label: 'Poli Penyakit Dalam',  emoji: '🏥', prefix: 'A', color: '#1e6fa6', bg: '#eff6ff', border: '#bfdbfe', headerBg: 'linear-gradient(135deg, #1e6fa6, #3b82f6)', lightBg: '#f0f7ff' },
  { key: 'DIALISIS', label: 'Poli Hemodialisa',      emoji: '💉', prefix: 'B', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', headerBg: 'linear-gradient(135deg, #059669, #34d399)', lightBg: '#f0fdf8' },
  { key: 'OBAT',     label: 'Farmasi',               emoji: '💊', prefix: 'C', color: '#d97706', bg: '#fffbeb', border: '#fde68a', headerBg: 'linear-gradient(135deg, #d97706, #fbbf24)', lightBg: '#fffdf5' },
];

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string; icon: string }> = {
  WAITING:   { label: 'Menunggu',         bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: '⏳' },
  CALLED:    { label: 'Dipanggil',        bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd', icon: '📢' },
  SERVING:   { label: 'Sedang Dilayani',  bg: '#dcfce7', color: '#15803d', border: '#86efac', icon: '✅' },
  COMPLETED: { label: 'Selesai',          bg: '#f0fdf4', color: '#6b7280', border: '#d1d5db', icon: '✔️' },
  SKIPPED:   { label: 'Dilewati',         bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', icon: '⏭️' },
};

/* ─── Helpers ────────────────────────────────────────────────── */
function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtDate(ds: string) {
  return new Date(ds + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─── Text-to-Speech Helper ──────────────────────────────────── */
const DIGIT_WORDS: Record<string, string> = {
  '0': 'kosong', '1': 'satu', '2': 'dua', '3': 'tiga', '4': 'empat',
  '5': 'lima', '6': 'enam', '7': 'tujuh', '8': 'delapan', '9': 'sembilan',
};

function speakTicket(prefix: string, num: number, counter?: string, categoryLabel?: string) {
  const numStr = String(num).padStart(3, '0');
  const spokenDigits = numStr.split('').map(d => DIGIT_WORDS[d] || d).join(' ');

  let text = `Nomor antrian, ${prefix}, ${spokenDigits}`;
  if (counter) {
    text += `, silakan menuju ke ${counter}.`;
  } else if (categoryLabel) {
    text += `, silakan menuju ke bagian ${categoryLabel}.`;
  } else {
    text += `, silakan menuju ke loket.`;
  }

  // Repeat announcement for clarity
  const fullText = text + '. ' + text;

  // Use Google Translate TTS for 100% consistent Indonesian female voice across all devices
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=id&q=${encodeURIComponent(fullText)}`;
  const audio = new Audio(url);
  
  audio.play().catch((err) => {
    console.warn('Google TTS failed, falling back to Web Speech API:', err);
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'id-ID';
    utterance.rate = 0.82;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredNames = ['Gadis', 'Google Bahasa Indonesia', 'Damayanti'];
    let idVoice = null;
    for (const name of preferredNames) {
      idVoice = voices.find(v => v.lang.includes('id') && v.name.includes(name));
      if (idVoice) break;
    }
    if (!idVoice) {
      idVoice = voices.find(v => v.lang.startsWith('id') || v.lang.includes('ID'));
    }
    
    if (idVoice) utterance.voice = idVoice;
    window.speechSynthesis.speak(utterance);
  });
}

/* ─── Main Page Component ────────────────────────────────────── */
interface PatientOption {
  id: string;
  name: string;
  mrNumber: string;
  title?: string | null;
}

export default function QueuePage() {
  const [activeCategory, setActiveCategory] = useState('POLI');
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Patient autocomplete state
  const [patientQuery, setPatientQuery] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState<PatientOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Counter configuration, persisted in localStorage
  const [myCounter, setMyCounter] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('queue_counter') || 'Loket 1';
    }
    return 'Loket 1';
  });

  useEffect(() => {
    localStorage.setItem('queue_counter', myCounter);
  }, [myCounter]);

  const cat = CATEGORIES.find(c => c.key === activeCategory) || CATEGORIES[0];

  /* ─── Patient search autocomplete ──────────────────────── */
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPatientSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=10&page=1`);
      const data = await res.json();
      setPatientSuggestions(data.patients || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Failed to search patients:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const handlePatientInputChange = (value: string) => {
    setPatientQuery(value);
    setNewPatientName(value);
    // Debounce search
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchPatients(value), 300);
  };

  const selectPatient = (patient: PatientOption) => {
    const displayName = patient.title ? `${patient.title} ${patient.name}` : patient.name;
    setNewPatientName(displayName);
    setPatientQuery(displayName);
    setShowSuggestions(false);
    setPatientSuggestions([]);
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ─── Fetch tickets ─────────────────────────────────────── */
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`/api/queue?category=${activeCategory}&date=${todayStr()}`);
      const d = await res.json();
      setTickets(d.tickets || []);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    setLoading(true);
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  /* ─── Actions ───────────────────────────────────────────── */
  const createTicket = async () => {
    setCreating(true);
    try {
      await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: activeCategory, patientName: newPatientName || null }),
      });
      setNewPatientName('');
      setPatientQuery('');
      setPatientSuggestions([]);
      setShowNewModal(false);
      fetchTickets();
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, status: string, counter?: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, counter }),
      });

      // Speak announcement when calling a patient
      if (status === 'CALLED') {
        const ticket = tickets.find(t => t.id === id);
        if (ticket) {
          speakTicket(cat.prefix, ticket.queueNumber, counter, cat.label);
        }
      }

      fetchTickets();
    } catch (err) {
      console.error('Failed to update ticket:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm('Hapus tiket antrian ini?')) return;
    setActionLoading(id);
    try {
      await fetch(`/api/queue/${id}`, { method: 'DELETE' });
      fetchTickets();
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    } finally {
      setActionLoading(null);
    }
  };

  /* ─── Stats ─────────────────────────────────────────────── */
  const stats = {
    total: tickets.length,
    waiting: tickets.filter(t => t.status === 'WAITING').length,
    called: tickets.filter(t => t.status === 'CALLED' || t.status === 'SERVING').length,
    completed: tickets.filter(t => t.status === 'COMPLETED').length,
    skipped: tickets.filter(t => t.status === 'SKIPPED').length,
  };

  const activeTickets = tickets.filter(t => t.status !== 'COMPLETED' && t.status !== 'SKIPPED');
  const doneTickets = tickets.filter(t => t.status === 'COMPLETED' || t.status === 'SKIPPED');
  const currentCalled = tickets.find(t => t.status === 'CALLED' || t.status === 'SERVING');

  /* ─── Render ────────────────────────────────────────────── */
  return (
    <>
      {/* ── Top Bar ────────────────────────────────────────── */}
      <div className="topbar">
        <div>
          <div className="topbar-title">🎫 Manajemen Antrian</div>
          <div className="topbar-date">{fmtDate(todayStr())}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* Counter Configuration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>Loket/Ruang:</span>
            <input
              type="text"
              className="form-input"
              style={{ width: 110, height: 32, padding: '0 10px', fontSize: 13, borderRadius: 8 }}
              value={myCounter}
              onChange={e => setMyCounter(e.target.value)}
              placeholder="e.g. Loket 1"
            />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => window.open('/queue/display', '_blank')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            Tampilan Layar
          </button>
          <button className="btn btn-secondary btn-sm" onClick={fetchTickets}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Sistem Antrian Digital</h1>
          <p className="page-subtitle">Klinik Utama Jakarta Kidney Center — Pengelolaan Antrian Pasien</p>
        </div>

        {/* ── Doctor Schedules ─────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>👨‍⚕️</span> Jadwal Praktek Dokter
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            
            {/* Dokter Umum */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderTop: '4px solid #3b82f6', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#3b82f6', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Umum</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>dr. Erin Destrini, MARS</div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span>📅</span> Senin - Sabtu &bull; 07:00 - 19:00
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>dr. Fitri Dian Pramesti, MARS, CBS</div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span>📅</span> Senin - Sabtu &bull; 07:00 - 19:00
                </div>
              </div>
            </div>

            {/* Sp.PD */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderTop: '4px solid #10b981', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Spesialis Penyakit Dalam</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>dr. Renti Woro Sismiastuti, Sp.PD, FINASIM</div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span>📅</span> Senin - Selasa &bull; 09:00 - 10:00
                </div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ visibility: 'hidden' }}>📅</span> Rabu &bull; 14:30 - 15:30
                </div>
              </div>
            </div>

            {/* KGH */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', borderTop: '4px solid #f59e0b', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Konsultan Ginjal Hipertensi</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', lineHeight: 1.4 }}>Prof. DR. dr. Lucky Aziza Bawazier, Sp.PD, KGH, FACP, FINASIM, S.H., M.H.</div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span>📅</span> Senin - Sabtu &bull; 10:00 - 14:00
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Category Tabs ─────────────────────────────────── */}
        <div className="q-tabs-row" style={{ marginBottom: 24 }}>
          {CATEGORIES.map(c => {
            const isActive = activeCategory === c.key;
            return (
              <button
                key={c.key}
                className={`q-cat-tab ${isActive ? 'active' : ''}`}
                style={{ '--tc': c.color, '--tbg': c.bg, '--tbd': c.border, '--tgr': c.headerBg } as React.CSSProperties}
                onClick={() => setActiveCategory(c.key)}
              >
                <span className="q-cat-emoji">{c.emoji}</span>
                <div className="q-cat-text" style={{ textAlign: 'left' }}>
                  <span className="q-cat-name">{c.label}</span>
                  <span style={{ display: 'block', fontSize: 11, opacity: isActive ? 0.8 : 0.5, fontWeight: 500 }}>
                    Prefix: {c.prefix}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Top Section: Stats + Current + Add ────────────── */}
        <div className="q-top-grid" style={{ marginBottom: 24 }}>
          {/* Current Called */}
          <div className="q-current-card" style={{ background: cat.headerBg }}>
            <div className="q-current-label">Sedang Dipanggil</div>
            <div className="q-current-num">
              {currentCalled ? `${cat.prefix}${String(currentCalled.queueNumber).padStart(3, '0')}` : '---'}
            </div>
            {currentCalled?.patientName && (
              <div className="q-current-name">{currentCalled.patientName}</div>
            )}
            {currentCalled?.counter && (
              <div className="q-current-counter" style={{ fontSize: 11, background: 'rgba(255,255,255,0.18)', padding: '3px 8px', borderRadius: 4, marginTop: 6, display: 'inline-block', fontWeight: 600 }}>
                📍 {currentCalled.counter}
              </div>
            )}
            {!currentCalled && (
              <div className="q-current-name" style={{ opacity: 0.5 }}>Belum ada panggilan</div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="q-stats-grid">
            <div className="q-stat-card">
              <div className="q-stat-icon" style={{ background: '#f1f5f9', color: '#475569' }}>📊</div>
              <div className="q-stat-info">
                <div className="q-stat-num">{stats.total}</div>
                <div className="q-stat-lbl">Total</div>
              </div>
            </div>
            <div className="q-stat-card">
              <div className="q-stat-icon" style={{ background: '#f1f5f9', color: '#475569' }}>⏳</div>
              <div className="q-stat-info">
                <div className="q-stat-num" style={{ color: '#475569' }}>{stats.waiting}</div>
                <div className="q-stat-lbl">Menunggu</div>
              </div>
            </div>
            <div className="q-stat-card">
              <div className="q-stat-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>📢</div>
              <div className="q-stat-info">
                <div className="q-stat-num" style={{ color: '#1d4ed8' }}>{stats.called}</div>
                <div className="q-stat-lbl">Dipanggil</div>
              </div>
            </div>
            <div className="q-stat-card">
              <div className="q-stat-icon" style={{ background: '#dcfce7', color: '#15803d' }}>✔️</div>
              <div className="q-stat-info">
                <div className="q-stat-num" style={{ color: '#15803d' }}>{stats.completed}</div>
                <div className="q-stat-lbl">Selesai</div>
              </div>
            </div>
          </div>

          {/* Add Ticket */}
          <div className="q-add-card" onClick={() => setShowNewModal(true)} style={{ borderColor: cat.border, background: cat.lightBg }}>
            <div className="q-add-icon" style={{ background: cat.headerBg }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <span className="q-add-text" style={{ color: cat.color }}>Tambah Antrian</span>
            <span className="q-add-sub">Klik untuk menambahkan antrian baru</span>
          </div>
        </div>

        {/* ── Queue Content ─────────────────────────────────── */}
        <div className="q-content">
          {loading ? (
            <div className="q-empty-state">
              <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }} />
              <p>Memuat antrian...</p>
            </div>
          ) : activeTickets.length === 0 && doneTickets.length === 0 ? (
            <div className="q-empty-state">
              <div className="q-empty-icon">🎫</div>
              <p className="q-empty-title">Belum ada antrian hari ini</p>
              <p className="q-empty-sub">Klik &quot;Tambah Antrian&quot; untuk memulai</p>
            </div>
          ) : (
            <div className="q-tables-grid">
              {/* Active Tickets */}
              <div className="q-table-section">
                <div className="queue-table-wrapper" style={{ flex: 1 }}>
                  <div className="queue-table-header" style={{ background: cat.headerBg }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                      {cat.emoji} Antrian Aktif — {cat.label}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                      {activeTickets.length} tiket
                    </span>
                  </div>
                  {activeTickets.length > 0 ? (
                    <div className="q-ticket-list">
                      {activeTickets.map(ticket => {
                        const st = STATUS_META[ticket.status] || STATUS_META.WAITING;
                        const isActionLoading = actionLoading === ticket.id;
                        return (
                          <div key={ticket.id} className={`q-ticket-row ${ticket.status === 'CALLED' ? 'q-ticket-called' : ''}`}>
                            <div className="q-ticket-left">
                              <div className="queue-number-badge" style={{ background: cat.headerBg }}>
                                {cat.prefix}{String(ticket.queueNumber).padStart(3, '0')}
                              </div>
                              <div className="q-ticket-info">
                                <div className="q-ticket-name">{ticket.patientName || '—'}</div>
                                <div className="q-ticket-meta">
                                  <span className={`queue-status-badge ${ticket.status === 'CALLED' ? 'queue-status-pulse' : ''}`}
                                    style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                    {st.icon} {st.label}
                                  </span>
                                  <span className="q-ticket-time">{fmtTime(ticket.createdAt)}</span>
                                  {ticket.counter && <span className="q-ticket-counter">📍 {ticket.counter}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="q-ticket-actions">
                              {ticket.status === 'WAITING' && (
                                <>
                                  <button className="queue-action-btn queue-action-call" disabled={isActionLoading}
                                    onClick={() => updateStatus(ticket.id, 'CALLED', myCounter)}>📢 Panggil</button>
                                  <button className="queue-action-btn queue-action-skip" disabled={isActionLoading}
                                    onClick={() => updateStatus(ticket.id, 'SKIPPED')}>⏭️ Lewati</button>
                                </>
                              )}
                              {ticket.status === 'CALLED' && (
                                <>
                                  <button className="queue-action-btn queue-action-call" disabled={isActionLoading}
                                    onClick={() => updateStatus(ticket.id, 'CALLED', myCounter)}>📢 Panggil Ulang</button>
                                  <button className="queue-action-btn queue-action-serve" disabled={isActionLoading}
                                    onClick={() => updateStatus(ticket.id, 'SERVING', myCounter)}>✅ Layani</button>
                                  <button className="queue-action-btn queue-action-skip" disabled={isActionLoading}
                                    onClick={() => updateStatus(ticket.id, 'SKIPPED')}>⏭️ Lewati</button>
                                </>
                              )}
                              {ticket.status === 'SERVING' && (
                                <>
                                  <button className="queue-action-btn queue-action-call" disabled={isActionLoading}
                                    onClick={() => updateStatus(ticket.id, 'CALLED', myCounter)}>📢 Panggil Ulang</button>
                                  <button className="queue-action-btn queue-action-complete" disabled={isActionLoading}
                                    onClick={() => updateStatus(ticket.id, 'COMPLETED')}>✔️ Selesai</button>
                                </>
                              )}
                              <button className="queue-action-btn queue-action-delete" disabled={isActionLoading}
                                onClick={() => deleteTicket(ticket.id)} title="Hapus">🗑️</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="q-empty-state" style={{ padding: 32 }}>
                      <p style={{ color: '#94a3b8' }}>Semua antrian sudah selesai 🎉</p>
                    </div>
                  )}
                </div>
              </div>

              {/* History */}
              <div className="q-table-section">
                <div className="queue-table-wrapper" style={{ flex: 1 }}>
                  <div className="queue-table-header" style={{ background: 'linear-gradient(135deg, #64748b, #94a3b8)' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>📋 Riwayat Hari Ini</span>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{doneTickets.length} tiket</span>
                  </div>
                  {doneTickets.length > 0 ? (
                    <div className="q-ticket-list">
                      {doneTickets.map(ticket => {
                        const st = STATUS_META[ticket.status] || STATUS_META.COMPLETED;
                        return (
                          <div key={ticket.id} className="q-ticket-row" style={{ opacity: 0.65 }}>
                            <div className="q-ticket-left">
                              <div className="queue-number-badge" style={{ background: 'linear-gradient(135deg, #94a3b8, #cbd5e1)' }}>
                                {cat.prefix}{String(ticket.queueNumber).padStart(3, '0')}
                              </div>
                              <div className="q-ticket-info">
                                <div className="q-ticket-name" style={{ color: '#64748b' }}>{ticket.patientName || '—'}</div>
                                <div className="q-ticket-meta">
                                  <span className="queue-status-badge"
                                    style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                    {st.icon} {st.label}
                                  </span>
                                  {ticket.completedAt && <span className="q-ticket-time">{fmtTime(ticket.completedAt)}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="q-ticket-actions">
                              <button className="queue-action-btn queue-action-delete"
                                onClick={() => deleteTicket(ticket.id)} title="Hapus">🗑️</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="q-empty-state" style={{ padding: 32 }}>
                      <p style={{ color: '#94a3b8' }}>Belum ada riwayat</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New Ticket Modal ──────────────────────────────── */}
      {showNewModal && (
        <div className="queue-modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="queue-modal" onClick={e => e.stopPropagation()}>
            <div className="queue-modal-header" style={{ background: cat.headerBg }}>
              <h3>{cat.emoji} Tambah Antrian — {cat.label}</h3>
              <button className="queue-modal-close" onClick={() => setShowNewModal(false)}>✕</button>
            </div>
            <div className="queue-modal-body">
              <label className="queue-modal-label">Nama Pasien</label>
              <div ref={autocompleteRef} style={{ position: 'relative' }}>
                <input
                  className="queue-modal-input"
                  type="text"
                  placeholder="Ketik nama pasien untuk mencari..."
                  value={patientQuery}
                  onChange={e => handlePatientInputChange(e.target.value)}
                  onFocus={() => { if (patientSuggestions.length > 0) setShowSuggestions(true); }}
                  onKeyDown={e => e.key === 'Enter' && createTicket()}
                  autoFocus
                  autoComplete="off"
                />
                {/* Loading indicator */}
                {loadingSuggestions && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                  </div>
                )}
                {/* Dropdown suggestions */}
                {showSuggestions && patientSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto',
                    marginTop: 4,
                  }}>
                    {patientSuggestions.map(p => (
                      <div
                        key={p.id}
                        onClick={() => selectPatient(p)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f7ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: 'linear-gradient(135deg, #1e6fa6, #3b82f6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: '#fff',
                        }}>
                          {p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.title ? `${p.title} ${p.name}` : p.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>MR: {p.mrNumber}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* No results */}
                {showSuggestions && patientQuery.length >= 2 && patientSuggestions.length === 0 && !loadingSuggestions && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '14px',
                    marginTop: 4, textAlign: 'center', fontSize: 13, color: '#94a3b8',
                  }}>
                    Pasien tidak ditemukan — nama akan digunakan langsung
                  </div>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                Ketik minimal 2 huruf untuk mencari pasien. Nomor antrian otomatis dengan prefix <strong>{cat.prefix}</strong>
              </p>
            </div>
            <div className="queue-modal-footer">
              <button className="queue-btn-secondary" onClick={() => setShowNewModal(false)}>Batal</button>
              <button className="queue-btn-primary" onClick={createTicket} disabled={creating}
                style={{ background: cat.headerBg }}>
                {creating ? 'Membuat...' : '➕ Tambah Antrian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
