'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
}

interface CategoryData {
  calledTickets: QueueTicket[];
  waitingTickets: QueueTicket[];
  completedTickets: QueueTicket[];
  stats: { total: number; waiting: number; completed: number };
}

type AllCategoriesData = Record<string, CategoryData>;

/* ─── Constants ──────────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'POLI',     label: 'Poli Penyakit Dalam',  emoji: '🏥', prefix: 'A', accent: '#3b82f6', accentLight: '#93c5fd', gradient: 'linear-gradient(135deg, #162a45, #1e6fa6)', cardBg: 'rgba(30,111,166,0.15)', cardBorder: 'rgba(59,130,246,0.35)' },
  { key: 'DIALISIS', label: 'Poli Hemodialisa',      emoji: '💉', prefix: 'B', accent: '#10b981', accentLight: '#a7f3d0', gradient: 'linear-gradient(135deg, #0a3625, #059669)', cardBg: 'rgba(5,150,105,0.15)', cardBorder: 'rgba(52,211,153,0.35)' },
  { key: 'OBAT',     label: 'Farmasi',               emoji: '💊', prefix: 'C', accent: '#f59e0b', accentLight: '#fde68a', gradient: 'linear-gradient(135deg, #5c2c04, #d97706)', cardBg: 'rgba(217,119,6,0.15)',  cardBorder: 'rgba(251,191,36,0.35)' },
];

/* Helper for Text-to-Speech */
const DIGIT_WORDS: Record<string, string> = {
  '0': 'kosong', '1': 'satu', '2': 'dua', '3': 'tiga', '4': 'empat',
  '5': 'lima', '6': 'enam', '7': 'tujuh', '8': 'delapan', '9': 'sembilan',
};

const speakTicket = (categoryLabel: string, prefix: string, num: number, counter?: string | null) => {
  const numStr = String(num).padStart(3, '0');
  const spokenDigits = numStr.split('').map(d => DIGIT_WORDS[d] || d).join(' ');
  
  let text = `Nomor antrian, ${prefix}, ${spokenDigits}`;
  if (counter) {
    text += `, silakan menuju ke ${counter}.`;
  } else {
    text += `, silakan menuju ke bagian, ${categoryLabel}.`;
  }

  // Repeat announcement for clarity
  const fullText = text + '. ' + text;

  // Use Google Translate TTS for 100% consistent Indonesian female voice across all devices
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=id&q=${encodeURIComponent(fullText)}`;
  const audio = new Audio(url);
  
  audio.play().catch((err) => {
    console.warn('Google TTS failed, falling back to Web Speech API:', err);
    // Fallback if network fails or audio is blocked
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'id-ID';
    utterance.rate = 0.82;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    // Prioritize known female voices if available
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
};

/* ─── Display Content ────────────────────────────────────────── */
function DisplayContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<AllCategoriesData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prevCalled, setPrevCalled] = useState<Record<string, string | null>>({ POLI: null, DIALISIS: null, OBAT: null });
  const [flashCat, setFlashCat] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstFetch = useRef(true);

  // Preload voices on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      // Some browsers fire onvoiceschanged
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Authentication Redirect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/queue/display');
      const d: AllCategoriesData = await res.json();
      setData(d);

      // Detect new called or recalled numbers for flash animation and text-to-speech
      for (const cat of CATEGORIES) {
        const calledTicket = d[cat.key]?.calledTickets?.[0];
        if (calledTicket) {
          const callKey = `${calledTicket.id}-${calledTicket.calledAt}`;
          if (callKey !== prevCalled[cat.key]) {
            setPrevCalled(prev => ({ ...prev, [cat.key]: callKey }));

            // Skip voice and flash on first load to prevent noise
            if (!isFirstFetch.current && audioEnabled) {
              setFlashCat(cat.key);
              setTimeout(() => setFlashCat(null), 3000);
              speakTicket(cat.label, cat.prefix, calledTicket.queueNumber, calledTicket.counter);
            }
          }
        } else {
          // If no called ticket exists, ensure key is empty
          if (prevCalled[cat.key] !== '') {
            setPrevCalled(prev => ({ ...prev, [cat.key]: '' }));
          }
        }
      }
      isFirstFetch.current = false;
    } catch (err) {
      console.error('Display fetch error:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevCalled]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
      const dataInterval = setInterval(fetchData, 8000);
      const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => { clearInterval(dataInterval); clearInterval(timeInterval); };
    }
  }, [fetchData, status]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070b13', color: '#fff' }}>
        <p>Memuat...</p>
      </div>
    );
  }

  if (!session) return null;

  const todayDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const timeStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });

  // Enable audio handler
  const enableAudio = () => {
    // Trigger a silent speech to "unlock" the browser's speech synthesis
    if (window.speechSynthesis) {
      const silent = new SpeechSynthesisUtterance('');
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    }
    setAudioEnabled(true);
  };

  return (
    <div ref={containerRef} className="qd-root">
      {/* Audio activation overlay */}
      {!audioEnabled && (
        <div
          onClick={enableAudio}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 16, cursor: 'pointer',
          }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#fff" />
              <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
            </svg>
          </div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>Klik untuk Mengaktifkan Suara</div>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>Klik di mana saja untuk mengaktifkan pengumuman suara antrian</div>
        </div>
      )}
      {/* ── Top Bar ─────────────────────────────────────── */}
      <div className="qd-topbar">
        <div className="qd-topbar-left">
          <div className="qd-brand">
            <span className="qd-brand-icon">🏥</span>
            <div>
              <div className="qd-brand-name">JKC Dialysis</div>
              <div className="qd-brand-sub">Sistem Antrian Digital</div>
            </div>
          </div>
          <span className="qd-date">{todayDate}</span>
        </div>
        <div className="qd-topbar-right">
          <span className="qd-clock">{timeStr}</span>
          
          {/* Back to Staff page */}
          <button 
            className="qd-fullscreen-btn" 
            onClick={() => router.push('/queue')} 
            title="Kembali ke Panel Admin"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 700 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Kembali
          </button>

          <button className="qd-fullscreen-btn" onClick={toggleFullscreen} title="Fullscreen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Category Columns ────────────────────────────── */}
      <div className="qd-columns">
        {CATEGORIES.map(cat => {
          const catData = data?.[cat.key];
          const calledTicket = catData?.calledTickets?.[0];
          const calledNum = calledTicket ? `${cat.prefix}${String(calledTicket.queueNumber).padStart(3, '0')}` : '---';
          const isFlashing = flashCat === cat.key;
          const waitingList = catData?.waitingTickets || [];

          return (
            <div key={cat.key} className="qd-col">
              {/* Category Header */}
              <div className="qd-col-header" style={{ background: cat.gradient }}>
                <span className="qd-col-emoji">{cat.emoji}</span>
                <span className="qd-col-title">{cat.label}</span>
                {catData && (
                  <span className="qd-col-count">{catData.stats.waiting} menunggu</span>
                )}
              </div>

              {/* Current Called */}
              <div className="qd-col-current" style={{ background: cat.cardBg, borderColor: cat.cardBorder }}>
                <div className="qd-col-label">SEDANG DIPANGGIL</div>
                <div className={`qd-col-num ${isFlashing ? 'qd-flash' : ''} ${calledTicket ? 'qd-pulse' : ''}`}
                  style={{ color: cat.accent }}>
                  {calledNum}
                </div>
                {calledTicket?.patientName && (
                  <div className="qd-col-patient">{calledTicket.patientName}</div>
                )}
                {calledTicket?.counter && (
                  <div className="qd-col-counter" style={{ color: cat.accentLight, fontWeight: 700, marginTop: 6, fontSize: 16 }}>
                    📍 {calledTicket.counter}
                  </div>
                )}
                {!calledTicket && (
                  <div className="qd-col-patient" style={{ opacity: 0.3 }}>—</div>
                )}
              </div>

              {/* Other currently called */}
              {catData && catData.calledTickets.length > 1 && (
                <div className="qd-col-others">
                  {catData.calledTickets.slice(1).map(t => (
                    <div key={t.id} className="qd-col-other-item" style={{ borderColor: cat.cardBorder }}>
                      <span style={{ color: cat.accentLight, fontWeight: 800, fontSize: 18 }}>
                        {cat.prefix}{String(t.queueNumber).padStart(3, '0')}
                      </span>
                      {t.patientName && <span className="qd-col-other-name">{t.patientName}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Waiting List */}
              <div className="qd-col-waiting">
                <div className="qd-col-section-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                  ANTRIAN BERIKUTNYA
                </div>
                {waitingList.length > 0 ? (
                  <div className="qd-col-wait-list">
                    {waitingList.slice(0, 6).map((t, i) => (
                      <div key={t.id} className={`qd-col-wait-item ${i === 0 ? 'qd-col-wait-next' : ''}`}
                        style={i === 0 ? { borderColor: cat.cardBorder, background: cat.cardBg } : {}}>
                        <span className="qd-col-wait-num" style={i === 0 ? { color: cat.accent } : {}}>
                          {cat.prefix}{String(t.queueNumber).padStart(3, '0')}
                        </span>
                        <span className="qd-col-wait-name">{t.patientName || '—'}</span>
                      </div>
                    ))}
                    {waitingList.length > 6 && (
                      <div className="qd-col-wait-more">+{waitingList.length - 6} lainnya</div>
                    )}
                  </div>
                ) : (
                  <div className="qd-col-empty">Tidak ada antrian</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page Wrapper ───────────────────────────────────────────── */
export default function QueueDisplayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1a', color: '#fff' }}>
        <p>Memuat tampilan antrian...</p>
      </div>
    }>
      <DisplayContent />
    </Suspense>
  );
}
