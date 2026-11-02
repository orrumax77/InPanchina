import React from 'react';
import { Trash2, Clock } from 'lucide-react';

// Icona Pallone da Calcio Ufficiale Realistico
function IconaPalloneCalcio() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-sm flex-shrink-0" fill="none">
      <circle cx="12" cy="12" r="10" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
      {/* Pentagono centrale */}
      <polygon points="12,7.5 15,9.8 13.8,13.5 10.2,13.5 9,9.8" fill="#0f172a" />
      {/* Raggi verso i bordi */}
      <line x1="12" y1="7.5" x2="12" y2="2" stroke="#0f172a" strokeWidth="1.3" />
      <line x1="15" y1="9.8" x2="21" y2="7.5" stroke="#0f172a" strokeWidth="1.3" />
      <line x1="13.8" y1="13.5" x2="18.5" y2="19" stroke="#0f172a" strokeWidth="1.3" />
      <line x1="10.2" y1="13.5" x2="5.5" y2="19" stroke="#0f172a" strokeWidth="1.3" />
      <line x1="9" y1="9.8" x2="3" y2="7.5" stroke="#0f172a" strokeWidth="1.3" />
      {/* Toppe periferiche */}
      <path d="M7 2.8 L12 2 L17 2.8" stroke="#0f172a" strokeWidth="1.2" fill="none" />
      <path d="M21 7.5 L21.8 12 L19.5 15" stroke="#0f172a" strokeWidth="1.2" fill="none" />
      <path d="M3 7.5 L2.2 12 L4.5 15" stroke="#0f172a" strokeWidth="1.2" fill="none" />
      <path d="M8 21.2 L12 22 L16 21.2" stroke="#0f172a" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

// Icona Cartellino Giallo Arbitrale (rettangolo arrotondato inclinato)
function IconaCartellinoGiallo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-sm flex-shrink-0">
      <rect
        x="6"
        y="3"
        width="11"
        height="17"
        rx="2"
        transform="rotate(12 11.5 11.5)"
        fill="#eab308"
        stroke="#ca8a04"
        strokeWidth="1.2"
      />
      <rect
        x="7.5"
        y="4.5"
        width="3"
        height="14"
        rx="1"
        transform="rotate(12 11.5 11.5)"
        fill="#fef08a"
        opacity="0.4"
      />
    </svg>
  );
}

// Icona Cartellino Rosso Arbitrale (rettangolo arrotondato inclinato)
function IconaCartellinoRosso() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-sm flex-shrink-0">
      <rect
        x="6"
        y="3"
        width="11"
        height="17"
        rx="2"
        transform="rotate(12 11.5 11.5)"
        fill="#ef4444"
        stroke="#b91c1c"
        strokeWidth="1.2"
      />
      <rect
        x="7.5"
        y="4.5"
        width="3"
        height="14"
        rx="1"
        transform="rotate(12 11.5 11.5)"
        fill="#fca5a5"
        opacity="0.4"
      />
    </svg>
  );
}

// Icona Sostituzione Tattica Calcio (Freccia Verde Entra / Freccia Rossa Esce)
function IconaSostituzioneCalcio() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-sm flex-shrink-0" fill="none">
      {/* Freccia Verde ENTRA */}
      <path
        d="M5 14 C5 9 8 5 14 5"
        stroke="#22c55e"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <polyline
        points="11,2 15,5 11,8"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Freccia Rossa ESCE */}
      <path
        d="M19 10 C19 15 16 19 10 19"
        stroke="#ef4444"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <polyline
        points="13,22 9,19 13,16"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FeedEventi({ eventi, onEliminaEvento }) {
  if (!eventi || eventi.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500 uppercase">
        Nessun evento registrato finora.
      </div>
    );
  }

  const renderIconaEvento = (tipo) => {
    switch (tipo) {
      case 'GOL':
        return (
          <span className="w-8 h-8 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-950/40" title="Gol">
            <IconaPalloneCalcio />
          </span>
        );
      case 'AMMONIZIONE':
        return (
          <span className="w-8 h-8 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-950/40" title="Cartellino Giallo">
            <IconaCartellinoGiallo />
          </span>
        );
      case 'ESPULSIONE':
        return (
          <span className="w-8 h-8 rounded-xl bg-slate-950 border border-rose-500/30 flex items-center justify-center flex-shrink-0 shadow-md shadow-rose-950/40" title="Cartellino Rosso">
            <IconaCartellinoRosso />
          </span>
        );
      case 'SOSTITUZIONE':
        return (
          <span className="w-8 h-8 rounded-xl bg-slate-950 border border-blue-500/30 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-950/40" title="Sostituzione">
            <IconaSostituzioneCalcio />
          </span>
        );
      default:
        return (
          <span className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-slate-400" />
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl space-y-3">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
        <h3 className="text-xs uppercase font-bold text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" /> Cronologia Eventi di Gara ({eventi.length})
        </h3>
        <span className="text-[10px] text-slate-500 uppercase font-semibold font-mono">
          Ultimi eventi in alto
        </span>
      </div>

      <div className="divide-y divide-slate-800/80 max-h-64 overflow-y-auto pr-1">
        {eventi.map((ev) => (
          <div key={ev.id} className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-slate-950/40 px-2 rounded-xl transition">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icona Realistica */}
              {renderIconaEvento(ev.tipo)}

              {/* Minuto e Tempo */}
              <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-emerald-400 flex-shrink-0">
                {ev.minuto}' <span className="text-[10px] text-slate-500 font-normal">({ev.tempo}°T)</span>
              </span>

              {/* Dettagli Evento */}
              <span className="text-slate-200 uppercase font-semibold text-xs md:text-sm truncate">
                {ev.dettagli}
              </span>
            </div>

            {/* Pulsante Elimina */}
            <button
              onClick={() => onEliminaEvento(ev.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition flex-shrink-0"
              title="Annulla evento"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
