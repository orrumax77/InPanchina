import React from 'react';
import { Trash2, Clock } from 'lucide-react';

export default function FeedEventi({ eventi, onEliminaEvento }) {
  if (!eventi || eventi.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500">
        Nessun evento registrato finora.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <h3 className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-emerald-400" /> Cronologia Eventi di Gara
      </h3>

      <div className="divide-y divide-slate-800 max-h-56 overflow-y-auto">
        {eventi.map((ev) => (
          <div key={ev.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-xs font-bold text-emerald-400">
                {ev.minuto}' ({ev.tempo}°T)
              </span>
              <span className="text-slate-200">{ev.dettagli}</span>
            </div>
            <button
              onClick={() => onEliminaEvento(ev.id)}
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
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
