import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Clock, ArrowRight, FastForward, Gauge, AlertOctagon } from 'lucide-react';

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

  const SECONDI_45_MIN = 45 * 60; // 2700 sec
  const LIMITE_MASSIMO_CON_RECUPERO = SECONDI_45_MIN + (recupero * 60);

  const secondiTrascorsi = Math.max(0, secondi);
  const minutiTempo = Math.floor(secondiTrascorsi / 60);
  const secondiTempo = secondiTrascorsi % 60;

  const offsetMinutiPartita = tempo === 2 ? 45 : 0;
  const minutoTotalePartita = offsetMinutiPartita + minutiTempo;

  // Rilevazione tempo scaduto: raggiunto il 45° o esaurito il recupero
  const tempoScaduto = secondiTrascorsi >= LIMITE_MASSIMO_CON_RECUPERO;
  const nessunRecuperoAggiunto = recupero === 0;

  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  const onPausaRef = useRef(onPausa);
  useEffect(() => {
    onPausaRef.current = onPausa;
  }, [onPausa]);

  useEffect(() => {
    let timer = null;

    if (inEsecuzione) {
      const stepMs = Math.max(25, Math.floor(1000 / moltiplicatore));

      timer = setInterval(() => {
        setSecondi((prev) => {
          if (prev >= LIMITE_MASSIMO_CON_RECUPERO) {
            if (onPausaRef.current) onPausaRef.current();
            return LIMITE_MASSIMO_CON_RECUPERO;
          }

          const prox = prev + 1;
          const minAttuale = offsetMinutiPartita + Math.floor(prox / 60);
          if (onTickRef.current) onTickRef.current(minAttuale);

          if (prox >= LIMITE_MASSIMO_CON_RECUPERO) {
            if (onPausaRef.current) onPausaRef.current();
          }

          return prox;
        });
      }, stepMs);
    }

    return () => clearInterval(timer);
  }, [inEsecuzione, moltiplicatore, LIMITE_MASSIMO_CON_RECUPERO, offsetMinutiPartita, setSecondi]);

  const formatNumero = (num) => String(num).padStart(2, '0');

  const avanzaSecondi = (secAggiuntivi) => {
    setSecondi((prev) => {
      const nuovo = Math.min(LIMITE_MASSIMO_CON_RECUPERO, prev + secAggiuntivi);
      const minAttuale = offsetMinutiPartita + Math.floor(nuovo / 60);
      if (onTickRef.current) onTickRef.current(minAttuale);

      if (nuovo >= LIMITE_MASSIMO_CON_RECUPERO && inEsecuzione) {
        if (onPausaRef.current) onPausaRef.current();
      }

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
          {tempo === 1 ? '1° Tempo (00:00 ➔ 45:00)' : '2° Tempo (00:00 ➔ 45:00)'}
        </span>

        <div className="flex items-center gap-2">
          {moltiplicatore > 1 && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-xs font-bold font-mono animate-pulse flex items-center gap-1">
              <FastForward className="w-3 h-3" /> {moltiplicatore}x
            </span>
          )}

          {recupero > 0 && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
              +{recupero}' Recupero
            </span>
          )}
        </div>
      </div>

      {/* Cifre del Timer */}
      <div className="py-1 select-none">
        <div className={`font-mono text-6xl md:text-7xl font-black tracking-tight ${
          tempoScaduto ? 'text-rose-400' : 'text-white'
        }`}>
          {formatNumero(minutiTempo)}:{formatNumero(secondiTempo)}
        </div>

        <p className="text-xs text-slate-500 font-mono mt-1 uppercase font-semibold">
          Minuto Totale Gara: <strong className="text-emerald-400">{minutoTotalePartita}'</strong>
        </p>
      </div>

      {/* BANNER PROMEMORIA SCADENZA: NESSUN RECUPERO / TEMPO CONCLUSO */}
      {tempoScaduto && (
        <div className="bg-rose-950/80 border-2 border-rose-500 p-3 rounded-xl flex items-center gap-3 text-left animate-pulse">
          <AlertOctagon className="w-6 h-6 text-rose-400 flex-shrink-0" />
          <div className="text-xs text-rose-200">
            <p className="font-bold uppercase tracking-wide">
              {tempo === 2 
                ? 'Tempo regolamentare scaduto! Termina la sessione live' 
                : '1° Tempo concluso!'}
            </p>
            <p className="text-[11px] text-rose-300/90 mt-0.5">
              {tempo === 2 
                ? (nessunRecuperoAggiunto 
                    ? 'Nessun recupero inserito. Clicca su "Termina Partita" per salvare e generare il referto, altrimenti i dati non verranno archiviati.' 
                    : 'Recupero esaurito. Clicca su "Termina Partita" per completare il referto.')
                : 'Clicca su "Passa al 2° Tempo" per resettare il cronometro e proseguire.'}
            </p>
          </div>
        </div>
      )}

      {/* Selettore Velocità */}
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

      {/* Controlli Principali */}
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
            disabled={tempoScaduto}
            className={`py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition text-base col-span-2 uppercase shadow-lg ${
              tempoScaduto
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950 cursor-pointer'
            }`}
          >
            <Play className="w-5 h-5 fill-current" /> Avvia
          </button>
        )}

        <button
          type="button"
          onClick={() => setRecupero((prev) => prev + 1)}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-1 text-sm uppercase"
          title="Aggiungi 1 minuto di recupero alla frazione"
        >
          <Plus className="w-4 h-4" /> 1' Rec
        </button>
      </div>

      {/* Avanzamento Rapido Manuale */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => avanzaSecondi(60)}
          disabled={tempoScaduto}
          className="bg-slate-950 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition uppercase"
        >
          <FastForward className="w-3.5 h-3.5 text-blue-400" /> +1 Minuto
        </button>

        <button
          type="button"
          onClick={() => avanzaSecondi(300)}
          disabled={tempoScaduto}
          className="bg-slate-950 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition uppercase"
        >
          <FastForward className="w-3.5 h-3.5 text-blue-400" /> +5 Minuti
        </button>
      </div>

      {/* Pulsante Termina Gara / Passa a 2° Tempo */}
      <div className="pt-1">
        <button
          type="button"
          onClick={cambiaFase}
          className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg ${
            tempo === 2 && tempoScaduto
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950 animate-bounce'
              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
          }`}
        >
          {tempo === 1 ? 'Azzera e Passa al 2° Tempo (da 00:00)' : 'Termina Partita e Vai al Referto'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
