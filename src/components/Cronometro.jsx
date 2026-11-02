import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Clock, ArrowRight, FastForward, Gauge, AlertOctagon, Volume2 } from 'lucide-react';

// Generatore Audio Web Audio API del Fischio Arbitro Realistico (Nessun file esterno necessario)
function riproduciFischioArbitro(tipo = 'fine_gara') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const emettiSingoloFischio = (startTime, duration, isLong = false) => {
      // Oscillatore per la frequenza portante del fischietto (circa 2800Hz / 3200Hz tipica Fox 40)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(2850, startTime);
      osc2.frequency.setValueAtTime(3120, startTime);

      // Modulazione vibrato interna del fischietto (la classica pallina che vibra a 28Hz)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(32, startTime);
      lfoGain.gain.setValueAtTime(140, startTime);
      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);

      // Inviluppo Volume
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
      // Duplice fischio fine 1° Tempo: breve, lungo
      emettiSingoloFischio(now, 0.22);
      emettiSingoloFischio(now + 0.32, 0.65, true);
    } else {
      // Triplice fischio fine gara: breve, breve, lunghissimo
      emettiSingoloFischio(now, 0.20);
      emettiSingoloFischio(now + 0.28, 0.20);
      emettiSingoloFischio(now + 0.56, 0.85, true);
    }
  } catch (err) {
    console.warn("Impossibile riprodurre l'audio del fischietto:", err);
  }
}

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
  const [mostraModaleBlocco, setMostraModaleBlocco] = useState(false);

  const SECONDI_45_MIN = 45 * 60; // 2700 sec
  const LIMITE_MASSIMO_CON_RECUPERO = SECONDI_45_MIN + (recupero * 60);

  const secondiTrascorsi = Math.max(0, secondi);
  const minutiTempo = Math.floor(secondiTrascorsi / 60);
  const secondiTempo = secondiTrascorsi % 60;

  const offsetMinutiPartita = tempo === 2 ? 45 : 0;
  const minutoTotalePartita = offsetMinutiPartita + minutiTempo;

  const tempoScaduto = secondiTrascorsi >= LIMITE_MASSIMO_CON_RECUPERO;
  const fischioGiaSuonato = useRef(false);

  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  const onPausaRef = useRef(onPausa);
  useEffect(() => {
    onPausaRef.current = onPausa;
  }, [onPausa]);

  // Reset del trigger sonoro se si resetta il tempo o si aggiunge recupero
  useEffect(() => {
    if (!tempoScaduto) {
      fischioGiaSuonato.current = false;
      setMostraModaleBlocco(false);
    }
  }, [tempoScaduto, recupero]);

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

            // SCATTA IL FISCHIO DELL'ARBITRO E IL BLOCCO MODALE
            if (!fischioGiaSuonato.current) {
              fischioGiaSuonato.current = true;
              riproduciFischioArbitro(tempo === 1 ? 'primo_tempo' : 'fine_gara');
              setMostraModaleBlocco(true);
            }
          }

          return prox;
        });
      }, stepMs);
    }

    return () => clearInterval(timer);
  }, [inEsecuzione, moltiplicatore, LIMITE_MASSIMO_CON_RECUPERO, offsetMinutiPartita, tempo, setSecondi]);

  const formatNumero = (num) => String(num).padStart(2, '0');

  const avanzaSecondi = (secAggiuntivi) => {
    setSecondi((prev) => {
      const nuovo = Math.min(LIMITE_MASSIMO_CON_RECUPERO, prev + secAggiuntivi);
      const minAttuale = offsetMinutiPartita + Math.floor(nuovo / 60);
      if (onTickRef.current) onTickRef.current(minAttuale);

      if (nuovo >= LIMITE_MASSIMO_CON_RECUPERO) {
        if (onPausaRef.current) onPausaRef.current();
        if (!fischioGiaSuonato.current) {
          fischioGiaSuonato.current = true;
          riproduciFischioArbitro(tempo === 1 ? 'primo_tempo' : 'fine_gara');
          setMostraModaleBlocco(true);
        }
      }

      return nuovo;
    });
  };

  const cambiaFase = () => {
    setMostraModaleBlocco(false);
    if (tempo === 1) {
      if (onFinePrimoTempo) onFinePrimoTempo();
    } else if (tempo === 2) {
      if (onFinePartita) onFinePartita();
    }
  };

  const sbloccaConAltroRecupero = () => {
    setRecupero((prev) => prev + 1);
    setMostraModaleBlocco(false);
    fischioGiaSuonato.current = false;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-center space-y-4 relative">
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

      {/* Pulsante Termina Gara / Passa al 2° Tempo */}
      <div className="pt-1">
        <button
          type="button"
          onClick={cambiaFase}
          className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg ${
            tempo === 2 && tempoScaduto
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950'
              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
          }`}
        >
          {tempo === 1 ? 'Azzera e Passa al 2° Tempo (da 00:00)' : 'Termina Partita e Vai al Referto'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ============================================================ */}
      {/* BLOCCO MODALE FORZATO A TUTTO SCHERMO A TEMPO CONCLUSO        */}
      {/* ============================================================ */}
      {mostraModaleBlocco && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-rose-950">
            {/* Icona Allerta Pulsante con Suono */}
            <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 animate-pulse">
              <AlertOctagon className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold font-mono text-rose-400 bg-rose-950/60 border border-rose-500/40 px-3 py-1 rounded-full uppercase inline-flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> 
                {tempo === 1 ? 'Duplice Fischio' : 'Triplice Fischio Finale'}
              </span>

              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                {tempo === 1 ? 'Fine 1° Tempo!' : 'Partita Terminata!'}
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed uppercase font-medium">
                {tempo === 1 ? (
                  <>Il tempo regolamentare della prima frazione è scaduto. Passa al 2° tempo per azzerare il cronometro a 00:00 o aggiungi eventuale recupero.</>
                ) : (
                  <>
                    Il tempo regolamentare è concluso. Per salvare e validare ufficialmente il match devi accedere al <strong className="text-white">Referto Finale</strong>, altrimenti la sessione live non verrà archiviata!
                  </>
                )}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Tasto Primario Obbligatorio */}
              <button
                type="button"
                onClick={cambiaFase}
                className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-rose-950 transition active:scale-95"
              >
                {tempo === 1 ? 'Azzera e Passa al 2° Tempo' : 'Procedi al Referto Ufficiale (Obbligatorio)'}
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Tasto Secondario per aggiungere recupero extra non inserito */}
              <button
                type="button"
                onClick={sbloccaConAltroRecupero}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs uppercase transition"
              >
                + Aggiungi 1 Minuto di Recupero Extra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
