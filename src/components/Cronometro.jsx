import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Clock, ArrowRight, FastForward } from 'lucide-react';

// Generatore Audio Web Audio API del Fischio Arbitro
function riproduciFischioArbitro(tipo = 'fine_gara') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const emettiSingoloFischio = (startTime, duration, isLong = false) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(2850, startTime);
      osc2.frequency.setValueAtTime(3120, startTime);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(32, startTime);
      lfoGain.gain.setValueAtTime(140, startTime);
      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.35, startTime + 0.03);
      gainNode.gain.setValueAtTime(0.35, startTime + duration - 0.04);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      lfo.start(startTime);
      osc1.start(startTime);
      osc2.start(startTime);

      lfo.stop(startTime + duration);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    };

    const now = ctx.currentTime + 0.05;

    if (tipo === 'primo_tempo') {
      emettiSingoloFischio(now, 0.22);
      emettiSingoloFischio(now + 0.32, 0.65, true);
    } else {
      emettiSingoloFischio(now, 0.20);
      emettiSingoloFischio(now + 0.28, 0.20);
      emettiSingoloFischio(now + 0.56, 0.85, true);
    }
  } catch (err) {
    console.warn("Audio fischietto non disponibile:", err);
  }
}

export default function Cronometro({
  tempo,
  secondi,
  setSecondi,
  inEsecuzione,
  avviatoAlle,       // Timestamp ISO assoluto di avvio condiviso da Supabase
  secondiBase,       // Secondi accumulati prima dell'ultimo avvio
  onAvvia,
  onPausa,
  onAvanzaTempo,     // Notifica ad App.jsx per l'avanzamento senza fermare il timer
  onFinePrimoTempo,
  onFinePartita,
  recupero,
  setRecupero,
  onTick,
  onTriggerScadenzaTempo
}) {
  const SECONDI_45_MIN = 45 * 60;
  const LIMITE_MASSIMO_CON_RECUPERO = SECONDI_45_MIN + (recupero * 60);

  const secondiTrascorsi = Math.max(0, secondi);
  const minutiTempo = Math.floor(secondiTrascorsi / 60);
  const secondiTempo = secondiTrascorsi % 60;

  const offsetMinutiPartita = tempo === 2 ? 45 : 0;
  const minutoTotalePartita = offsetMinutiPartita + minutiTempo;

  const tempoScaduto = secondiTrascorsi >= LIMITE_MASSIMO_CON_RECUPERO;
  const fischioGiaEseguito = useRef(false);

  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  const onPausaRef = useRef(onPausa);
  useEffect(() => {
    onPausaRef.current = onPausa;
  }, [onPausa]);

  const onAvanzaTempoRef = useRef(onAvanzaTempo);
  useEffect(() => {
    onAvanzaTempoRef.current = onAvanzaTempo;
  }, [onAvanzaTempo]);

  const onTriggerScadenzaRef = useRef(onTriggerScadenzaTempo);
  useEffect(() => {
    onTriggerScadenzaRef.current = onTriggerScadenzaTempo;
  }, [onTriggerScadenzaTempo]);

  // Se viene aggiunto recupero, riarma il trigger fischio
  useEffect(() => {
    if (!tempoScaduto) {
      fischioGiaEseguito.current = false;
    }
  }, [tempoScaduto, recupero]);

  // SINCRONIZZAZIONE AL SECONDO INTERO TRAMITE TIMESTAMP ASSOLUTO CONDIVISO
  useEffect(() => {
    let timer = null;

    if (inEsecuzione && avviatoAlle) {
      const aggiornaTimerSincronizzato = () => {
        const startMs = new Date(avviatoAlle).getTime();
        const nowMs = Date.now();
        const diffSecondiReali = Math.max(0, Math.floor((nowMs - startMs) / 1000));

        // ARROTONDAMENTO A NUMERO INTERO CON Math.floor PER EVITARE MILLISECONDI
        const tempoCalcolato = Math.min(
          LIMITE_MASSIMO_CON_RECUPERO,
          Math.floor((secondiBase || 0) + diffSecondiReali)
        );

        setSecondi(tempoCalcolato);

        const minAttuale = offsetMinutiPartita + Math.floor(tempoCalcolato / 60);
        if (onTickRef.current) onTickRef.current(minAttuale);

        if (tempoCalcolato >= LIMITE_MASSIMO_CON_RECUPERO) {
          if (onPausaRef.current) onPausaRef.current(tempoCalcolato);
          if (!fischioGiaEseguito.current) {
            fischioGiaEseguito.current = true;
            riproduciFischioArbitro(tempo === 1 ? 'primo_tempo' : 'fine_gara');
            if (onTriggerScadenzaRef.current) onTriggerScadenzaRef.current(tempo);
          }
        }
      };

      aggiornaTimerSincronizzato();

      // Intervallo fisso al secondo intero esatto
      timer = setInterval(aggiornaTimerSincronizzato, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [inEsecuzione, avviatoAlle, secondiBase, LIMITE_MASSIMO_CON_RECUPERO, offsetMinutiPartita, tempo, setSecondi]);

  const formatNumero = (num) => String(Math.floor(num)).padStart(2, '0');

  // Avanza il timer SENZA fermare l'esecuzione (con calcolo esatto del delta in secondi)
  const avanzaSecondi = (secAggiuntivi) => {
    const nuovo = Math.min(LIMITE_MASSIMO_CON_RECUPERO, Math.floor(secondiTrascorsi + secAggiuntivi));
    setSecondi(nuovo);

    // Notifica ad App.jsx per aggiornare secondiBase e sincronizzare il DB senza stoppare
    if (onAvanzaTempoRef.current) {
      onAvanzaTempoRef.current(secAggiuntivi, nuovo);
    }

    const minAttuale = offsetMinutiPartita + Math.floor(nuovo / 60);
    if (onTickRef.current) onTickRef.current(minAttuale);

    if (nuovo >= LIMITE_MASSIMO_CON_RECUPERO) {
      if (onPausaRef.current) onPausaRef.current(nuovo);
      if (!fischioGiaEseguito.current) {
        fischioGiaEseguito.current = true;
        riproduciFischioArbitro(tempo === 1 ? 'primo_tempo' : 'fine_gara');
        if (onTriggerScadenzaRef.current) onTriggerScadenzaRef.current(tempo);
      }
    }
  };

  const cambiaFase = () => {
    if (tempo === 1) {
      if (onFinePrimoTempo) onFinePrimoTempo();
    } else if (tempo === 2) {
      if (onFinePartita) onFinePartita();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-xl text-center space-y-3 sm:space-y-4 relative w-full overflow-hidden">
      {/* Intestazione Cronometro */}
      <div className="flex flex-wrap justify-between items-center gap-2 text-xs sm:text-sm font-semibold tracking-wider uppercase text-slate-400">
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold truncate">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{tempo === 1 ? '1° Tempo (00:00 ➔ 45:00)' : '2° Tempo (00:00 ➔ 45:00)'}</span>
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          {recupero > 0 && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold">
              +{recupero}' Rec
            </span>
          )}
        </div>
      </div>

      {/* Cifre del Timer (Intere, senza millisecondi) */}
      <div className="py-1 select-none">
        <div className={`font-mono text-5xl sm:text-6xl md:text-7xl font-black tracking-tight ${
          tempoScaduto ? 'text-rose-400' : 'text-white'
        }`}>
          {formatNumero(minutiTempo)}:{formatNumero(secondiTempo)}
        </div>

        <p className="text-[11px] sm:text-xs text-slate-500 font-mono mt-1 uppercase font-semibold">
          Minuto Totale Gara: <strong className="text-emerald-400">{minutoTotalePartita}'</strong>
        </p>
      </div>

      {/* Controlli Principali */}
      <div className="grid grid-cols-3 gap-2">
        {inEsecuzione ? (
          <button
            type="button"
            onClick={() => onPausa()}
            className="bg-amber-600 hover:bg-amber-500 text-white py-3 px-3 sm:px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm sm:text-base col-span-2 shadow-lg shadow-amber-950/40 uppercase cursor-pointer"
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> Stoppa
          </button>
        ) : (
          <button
            type="button"
            onClick={onAvvia}
            disabled={tempoScaduto}
            className={`py-3 px-3 sm:px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm sm:text-base col-span-2 uppercase shadow-lg ${
              tempoScaduto
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950 cursor-pointer'
            }`}
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> Avvia
          </button>
        )}

        <button
          type="button"
          onClick={() => setRecupero((prev) => prev + 1)}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-3 px-2 rounded-xl font-bold flex items-center justify-center gap-1 text-xs sm:text-sm uppercase cursor-pointer whitespace-nowrap"
          title="Aggiungi 1 minuto di recupero alla frazione"
        >
          <Plus className="w-3.5 h-3.5" /> 1' Rec
        </button>
      </div>

      {/* Avanzamento Rapido Manuale (senza stop) */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => avanzaSecondi(60)}
          disabled={tempoScaduto}
          className="bg-slate-950 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-300 py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition uppercase cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> +1 Minuto
        </button>

        <button
          type="button"
          onClick={() => avanzaSecondi(300)}
          disabled={tempoScaduto}
          className="bg-slate-950 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-300 py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition uppercase cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> +5 Minuti
        </button>
      </div>

      {/* Pulsante Termina Gara / Passa a 2° Tempo */}
      <div className="pt-1">
        <button
          type="button"
          onClick={cambiaFase}
          className={`w-full py-3 sm:py-3.5 px-2 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg cursor-pointer ${
            tempo === 2 && tempoScaduto
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950'
              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
          }`}
        >
          <span className="truncate">{tempo === 1 ? 'Azzera e Passa al 2° Tempo (da 00:00)' : 'Termina Partita e Vai al Referto'}</span>
          <ArrowRight className="w-4 h-4 flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}
