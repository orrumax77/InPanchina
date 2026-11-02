import React from 'react';
import { Trash2, Clock, CircleDot, Square, ArrowLeftRight } from 'lucide-react';

export default function FeedEventi({ eventi, onEliminaEvento }) {
  if (!eventi || eventi.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500 uppercase">
        Nessun evento registrato finora.
      </div>
    );
  }

  // Riconoscimento e resa visiva con icona e colori specifici per ogni tipo di evento
  const renderIconaEvento = (tipo) => {
    switch (tipo) {
      case 'GOL':
        return (
          <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-sm" title="Gol">
            <CircleDot className="w-4 h-4" />
          </span>
        );
      case 'AMMONIZIONE':
        return (
          <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0 shadow-sm" title="Cartellino Giallo">
            <Square className="w-3.5 h-4 fill-amber-400 text-amber-400" />
          </span>
        );
      case 'ESPULSIONE':
        return (
          <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center flex-shrink-0 shadow-sm" title="Cartellino Rosso">
            <Square className="w-3.5 h-4 fill-rose-500 text-rose-500" />
          </span>
        );
      case 'SOSTITUZIONE':
        return (
          <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0 shadow-sm" title="Sostituzione">
            <ArrowLeftRight className="w-4 h-4" />
          </span>
        );
      default:
        return (
          <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3.5 h-3.5" />
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
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Icona Grafica Differenziata */}
              {renderIconaEvento(ev.tipo)}

              {/* Minuto e Tempo Gara */}
              <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-emerald-400 flex-shrink-0">
                {ev.minuto}' <span className="text-[10px] text-slate-500 font-normal">({ev.tempo}°T)</span>
              </span>

              {/* Descrizione Testuale dell'Evento */}
              <span className="text-slate-200 uppercase font-semibold text-xs md:text-sm truncate">
                {ev.dettagli}
              </span>
            </div>

            {/* Pulsante Eliminazione Singolo Evento */}
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
