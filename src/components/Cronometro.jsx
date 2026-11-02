import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Clock, ArrowRight, FastForward, Gauge } from 'lucide-react';

export default function Cronometro({
  tempo,
  secondi,
  setSecondi,
  inEsecuzione,
  onAvvia,
  onPausa,
  onFinePrimoTempo,
  onFinePartita,
  recupero,
  setRecupero,
  onTick
}) {
  const [moltiplicatore, setMoltiplicatore] = useState(1); // 1x | 2x | 5x | 10x
  const baseMinuti = tempo === 2 ? 45 : 0;
  const minutiTotali = baseMinuti + Math.floor(secondi / 60);
  const secondiRimanenti = secondi % 60;

  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Timer ad intervallo continuo calibrato sul moltiplicatore di velocità
  useEffect(() => {
    let timer = null;

    if (inEsecuzione) {
      const stepMs = Math.max(25, Math.floor(1000 / moltiplicatore));

      timer = setInterval(() => {
        setSecondi((prev) => {
          const prox = prev + 1;
          const minAttuale = baseMinuti + Math.floor(prox / 60);
          if (onTickRef.current) onTickRef.current(minAttuale);
          return prox;
        });
      }, stepMs);
    }

    return () => clearInterval(timer);
  }, [inEsecuzione, moltiplicatore, baseMinuti, setSecondi]);

  const formatNumero = (num) => String(num).padStart(2, '0');

  // Avanzamento rapido istantaneo di N minuti
  const avanzaSecondi = (secAggiuntivi) => {
    setSecondi((prev) => {
      const nuovo = prev + secAggiuntivi;
      const minAttuale = baseMinuti + Math.floor(nuovo / 60);
      if (onTickRef.current) onTickRef.current(minAttuale);
      return nuovo;
    });
  };

  const cambiaFase = () => {
    if (tempo === 1) {
      if (onFinePrimoTempo) onFinePrimoTempo();
    } else if (tempo === 2) {
      if (onFinePartita) onFinePartita();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-center space-y-4">
      {/* Intestazione Cronometro */}
      <div className="flex justify-between items-center text-sm font-semibold tracking-wider uppercase text-slate-400">
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <Clock className="w-4 h-4" />
          {tempo === 1 ? '1° Tempo' : '2° Tempo'}
        </span>

        <div className="flex items-center gap-2">
          {moltiplicatore > 1 && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-xs font-bold font-mono animate-pulse flex items-center gap-1">
              <FastForward className="w-3 h-3" /> {moltiplicatore}x
            </span>
          )}

          {recupero > 0 && (
            <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
              +{recupero}' Rec
            </span>
          )}
        </div>
      </div>

      {/* Cifre del Timer */}
      <div className="font-mono text-6xl md:text-7xl font-black text-white tracking-tight py-1 select-none">
        {formatNumero(minutiTotali)}:{formatNumero(secondiRimanenti)}
      </div>

      {/* Barra Selettore Velocità (1x, 2x, 5x, 10x) */}
      <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
        <span className="text-slate-400 font-bold flex items-center gap-1.5 pl-1 uppercase text-[11px]">
          <Gauge className="w-4 h-4 text-emerald-400" /> Velocità:
        </span>
        <div className="flex gap-1.5">
          {[1, 2, 5, 10].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setMoltiplicatore(v)}
              className={`px-3 py-1 rounded-lg font-bold font-mono transition text-xs ${
                moltiplicatore === v
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {v}x
            </button>
          ))}
        </div>
      </div>

      {/* Controlli Principali: Avvia / Stoppa + Recupero */}
      <div className="grid grid-cols-3 gap-2">
        {inEsecuzione ? (
          <button
            type="button"
            onClick={onPausa}
            className="bg-amber-600 hover:bg-amber-500 text-white py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition text-base col-span-2 shadow-lg shadow-amber-950/40 uppercase"
          >
            <Pause className="w-5 h-5 fill-current" /> Stoppa
          </button>
        ) : (
          <button
            type="button"
            onClick={onAvvia}
            className="bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition text-base col-span-2 shadow-lg shadow-emerald-950 uppercase"
          >
            <Play className="w-5 h-5 fill-current" /> Avvia
          </button>
        )}

        <button
          type="button"
          onClick={() => setRecupero((prev) => prev + 1)}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-1 text-sm uppercase"
        >
          <Plus className="w-4 h-4" /> 1' Rec
        </button>
      </div>

      {/* Avanzamento Rapido Manuale (+1 Minuto e +5 Minuti) */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => avanzaSecondi(60)}
          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition uppercase"
        >
          <FastForward className="w-3.5 h-3.5 text-blue-400" /> +1 Minuto
        </button>

        <button
          type="button"
          onClick={() => avanzaSecondi(300)}
          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition uppercase"
        >
          <FastForward className="w-3.5 h-3.5 text-blue-400" /> +5 Minuti
        </button>
      </div>

      {/* Tasto Fine Tempo / Partita */}
      <div className="pt-1">
        <button
          type="button"
          onClick={cambiaFase}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-2.5 rounded-xl font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
        >
          {tempo === 1 ? 'Passa al 2° Tempo' : 'Termina Partita'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
