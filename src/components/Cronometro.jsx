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

  // Ogni tempo regolamentare dura 45 minuti (2700 secondi)
  const SECONDI_45_MIN = 45 * 60; // 2700 sec
  const LIMITE_MASSIMO_CON_RECUPERO = SECONDI_45_MIN + (recupero * 60);

  // Calcolo tempo della frazione corrente (00:00 -> 45:00)
  const secondiTrascorsi = Math.max(0, secondi);
  const minutiTempo = Math.floor(secondiTrascorsi / 60);
  const secondiTempo = secondiTrascorsi % 60;

  // Minuto assoluto di partita (1° tempo: 1-45, 2° tempo: 46-90)
  const offsetMinutiPartita = tempo === 2 ? 45 : 0;
  const minutoTotalePartita = offsetMinutiPartita + minutiTempo;

  const isInRecupero = secondiTrascorsi >= SECONDI_45_MIN;
  const secondiExtra = isInRecupero ? secondiTrascorsi - SECONDI_45_MIN : 0;
  const minutiExtra = Math.floor(secondiExtra / 60);
  const secondiExtraRimanenti = secondiExtra % 60;

  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  const onPausaRef = useRef(onPausa);
  useEffect(() => {
    onPausaRef.current = onPausa;
  }, [onPausa]);

  // Timer continuo con blocco automatico al raggiungimento dei 45' (o dei 45' + recupero)
  useEffect(() => {
    let timer = null;

    if (inEsecuzione) {
      const stepMs = Math.max(25, Math.floor(1000 / moltiplicatore));

      timer = setInterval(() => {
        setSecondi((prev) => {
          // Se stiamo raggiungendo il limite dei 45' (o 45' + recupero), ci fermiamo
          if (prev >= LIMITE_MASSIMO_CON_RECUPERO) {
            if (onPausaRef.current) onPausaRef.current();
            return LIMITE_MASSIMO_CON_RECUPERO;
          }

          const prox = prev + 1;
          const minAttuale = offsetMinutiPartita + Math.floor(prox / 60);
          if (onTickRef.current) onTickRef.current(minAttuale);

          // Raggiunto il traguardo esattamente ora: stoppa il cronometro
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

  // Avanzamento rapido che non supera il limite prefissato dei 45' (+ eventuale recupero)
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

      {/* Cifre del Timer: azzerato a 00:00 per ciascun tempo */}
      <div className="py-1 select-none">
        <div className={`font-mono text-6xl md:text-7xl font-black tracking-tight ${
          isInRecupero ? 'text-amber-400' : 'text-white'
        }`}>
          {formatNumero(minutiTempo)}:{formatNumero(secondiTempo)}
        </div>

        {/* Indicazione di contesto gara assoluto */}
        <p className="text-xs text-slate-500 font-mono mt-1 uppercase font-semibold">
          Minuto di Gara Totale: <strong className="text-emerald-400">{minutoTotalePartita}'</strong>
        </p>

        {/* Notifica di Recupero se oltre i 45 minuti della frazione */}
        {isInRecupero && (
          <div className="mt-2 text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 inline-block px-3 py-1 rounded-full uppercase">
            Recupero Giocato: +{formatNumero(minutiExtra)}:{formatNumero(secondiExtraRimanenti)}
            {recupero > 0 && ` / ${recupero}'`}
          </div>
        )}
      </div>

      {/* Selettore Velocità (1x, 2x, 5x, 10x) */}
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

      {/* Controlli Principali: Avvia / Stoppa + Aggiunta Recupero */}
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
          title="Aggiungi 1 minuto di recupero alla frazione"
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

      {/* Passaggio al 2° Tempo (con azzeramento) o Termina Gara */}
      <div className="pt-1">
        <button
          type="button"
          onClick={cambiaFase}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-2.5 rounded-xl font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
        >
          {tempo === 1 ? 'Azzera e Passa al 2° Tempo (da 00:00)' : 'Termina Partita (Referto)'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
