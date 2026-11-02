import React, { useEffect } from 'react';
import { Play, Pause, Plus, Clock, ArrowRight } from 'lucide-react';

export default function Cronometro({
  tempo,
  secondi,
  setSecondi,
  inEsecuzione,
  timerAvviatoIl,
  onAvvia,
  onPausa,
  onCambiaTempo,
  recupero,
  setRecupero,
  onTick
}) {
  const baseMinuti = tempo === 2 ? 45 : 0;
  const minutiTotali = baseMinuti + Math.floor(secondi / 60);
  const secondiRimanenti = secondi % 60;

  // Calcolo del tempo reale
  useEffect(() => {
    let interval = null;
    if (inEsecuzione && timerAvviatoIl) {
      interval = setInterval(() => {
        // Calcola la differenza in secondi tra ORA e il timestamp di avvio
        const adesso = Date.now();
        const diffSecondi = Math.floor((adesso - timerAvviatoIl) / 1000);
        setSecondi(diffSecondi);
        
        const minAttuale = baseMinuti + Math.floor(diffSecondi / 60);
        if (onTick) onTick(minAttuale);
      }, 500);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [inEsecuzione, timerAvviatoIl, baseMinuti, onTick, setSecondi]);

  const formatNumero = (num) => String(num).padStart(2, '0');

  const aggiungiRecupero = (min) => {
    setRecupero((prev) => prev + min);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-center space-y-4">
      <div className="flex justify-between items-center text-sm font-semibold tracking-wider uppercase text-slate-400">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Clock className="w-4 h-4" />
          {tempo === 1 ? '1° Tempo' : '2° Tempo'}
        </span>
        {recupero > 0 && (
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
            +{recupero}' Recupero
          </span>
        )}
      </div>

      <div className="font-mono text-6xl md:text-7xl font-black text-white tracking-tight py-2 select-none">
        {formatNumero(minutiTotali)}:{formatNumero(secondiRimanenti)}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {inEsecuzione ? (
          <button
            onClick={onPausa}
            className="bg-amber-600 hover:bg-amber-500 text-white py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition text-base col-span-2"
          >
            <Pause className="w-5 h-5 fill-current" /> Pausa
          </button>
        ) : (
          <button
            onClick={onAvvia}
            className="bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition text-base col-span-2 shadow-lg shadow-emerald-950"
          >
            <Play className="w-5 h-5 fill-current" /> Avvia
          </button>
        )}

        <button
          onClick={() => aggiungiRecupero(1)}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" /> 1' Rec
        </button>
      </div>

      <div className="pt-1">
        <button
          onClick={onCambiaTempo}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-2.5 rounded-xl font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
        >
          {tempo === 1 ? 'Passa al 2° Tempo' : 'Termina Partita'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
