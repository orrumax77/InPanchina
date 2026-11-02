import React, { useState } from 'react';
import { ArrowLeftRight, Square, CircleDot, X } from 'lucide-react';

export default function GestioneEventi({
  giocatori,
  setGiocatori,
  eventi,
  onNuovoEvento,
  minutoCorrente,
  tempoGara,
  slotUsati,
  setSlotUsati,
  cambiEffettuati,
  setCambiEffettuati,
  onGolSegnato
}) {
  const [modalAperta, setModalAperta] = useState(null);
  const [giocatoreEsce, setGiocatoreEsce] = useState(null);

  const inCampo = giocatori.filter(g => g.isTitolare && !g.espulso);
  const inPanchina = giocatori.filter(g => !g.isTitolare && !g.espulso);

  const eseguiSostituzione = (giocatoreEntra) => {
    if (!giocatoreEsce) return;
    if (cambiEffettuati >= 5) {
      alert('Tutti i 5 cambi sono stati utilizzati!');
      return;
    }
    if (slotUsati >= 3) {
      alert('Tutti i 3 slot per i cambi sono stati utilizzati!');
      return;
    }

    const nuovaRosa = giocatori.map(g => {
      if (g.id === giocatoreEsce.id) return { ...g, isTitolare: false };
      if (g.id === giocatoreEntra.id) return { ...g, isTitolare: true };
      return g;
    });

    setGiocatori(nuovaRosa);

    const nuovoEvento = {
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: 'SOSTITUZIONE',
      dettagli: `ESCE #${giocatoreEsce.numero} ${giocatoreEsce.nome} ➔ ENTRA #${giocatoreEntra.numero} ${giocatoreEntra.nome}`
    };

    if (onNuovoEvento) onNuovoEvento(nuovoEvento);
    setCambiEffettuati(cambiEffettuati + 1);
    setSlotUsati(slotUsati + 1);
    setGiocatoreEsce(null);
    setModalAperta(null);
  };

  const assegnaCartellino = (giocatore, colore) => {
    let nuovoTipo = 'AMMONIZIONE';
    let dettagli = '';

    const nuovaRosa = giocatori.map(g => {
      if (g.id === giocatore.id) {
        if (colore === 'giallo') {
          const nuoveAmm = (g.ammonizioni || 0) + 1;
          const espulso = nuoveAmm >= 2;
          nuovoTipo = espulso ? 'ESPULSIONE' : 'AMMONIZIONE';
          dettagli = espulso
            ? `2° GIALLO ➔ ROSSO PER #${g.numero} ${g.nome}`
            : `AMMONITO #${g.numero} ${g.nome}`;
          return { ...g, ammonizioni: nuoveAmm, espulso };
        } else {
          nuovoTipo = 'ESPULSIONE';
          dettagli = `ROSSO DIRETTO PER #${g.numero} ${g.nome}`;
          return { ...g, espulso: true };
        }
      }
      return g;
    });

    setGiocatori(nuovaRosa);

    const ev = {
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: nuovoTipo,
      dettagli
    };

    if (onNuovoEvento) onNuovoEvento(ev);
    setModalAperta(null);
  };

  const registraGol = (giocatore) => {
    const dettagli = giocatore
      ? `GOL DI #${giocatore.numero} ${giocatore.nome}`
      : 'GOL SQUADRA AVVERSARIA';

    const ev = {
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: 'GOL',
      dettagli
    };

    if (onNuovoEvento) onNuovoEvento(ev);
    onGolSegnato(Boolean(giocatore));
    setModalAperta(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs font-semibold uppercase">
        <span className="text-slate-300">
          Cambi: <strong className="text-white">{cambiEffettuati}/5</strong>
        </span>
        <span className="text-slate-300">
          Slot Usati: <strong className="text-amber-400">{slotUsati}/3</strong>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setModalAperta('SOSTITUZIONE')}
          className="bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-blue-950 text-xs uppercase"
        >
          <ArrowLeftRight className="w-5 h-5" /> Sostituzione
        </button>

        <button
          onClick={() => setModalAperta('CARTELLINO')}
          className="bg-amber-600 hover:bg-amber-500 text-white p-3.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-amber-950 text-xs uppercase"
        >
          <Square className="w-5 h-5 fill-current" /> Cartellino
        </button>

        <button
          onClick={() => setModalAperta('GOL')}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-emerald-950 text-xs uppercase"
        >
          <CircleDot className="w-5 h-5" /> Gol
        </button>
      </div>

      {modalAperta === 'SOSTITUZIONE' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white flex items-center gap-2 uppercase">
                <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                {!giocatoreEsce ? '1. Chi ESCE dal campo' : `2. Chi ENTRA al posto di #${giocatoreEsce.numero}?`}
              </h3>
              <button onClick={() => { setModalAperta(null); setGiocatoreEsce(null); }} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!giocatoreEsce ? (
              <div className="space-y-1.5">
                {inCampo.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGiocatoreEsce(g)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-rose-950/40 border border-slate-800 flex justify-between items-center text-sm uppercase"
                  >
                    <span className="font-bold text-white">#{g.numero} {g.nome}</span>
                    <span className="text-rose-400 font-semibold text-xs uppercase">Esce ➔</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {inPanchina.map(g => (
                  <button
                    key={g.id}
                    onClick={() => eseguiSostituzione(g)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 flex justify-between items-center text-sm uppercase"
                  >
                    <span className="font-bold text-white">#{g.numero} {g.nome}</span>
                    <span className="text-emerald-400 font-semibold text-xs uppercase">Entra ➔</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {modalAperta === 'CARTELLINO' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white uppercase">Assegna Cartellino</h3>
              <button onClick={() => setModalAperta(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2">
              {giocatori.filter(g => !g.espulso).map(g => (
                <div key={g.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center text-sm uppercase">
                  <div>
                    <span className="font-bold text-white block">#{g.numero} {g.nome}</span>
                    <span className="text-xs text-slate-500">
                      {g.isTitolare ? 'In Campo' : 'In Panchina'} {g.ammonizioni === 1 && '• (1 Giallo)'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => assegnaCartellino(g, 'giallo')}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded uppercase"
                    >
                      Giallo
                    </button>
                    <button
                      onClick={() => assegnaCartellino(g, 'rosso')}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded uppercase"
                    >
                      Rosso
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalAperta === 'GOL' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white uppercase">Chi ha segnato?</h3>
              <button onClick={() => setModalAperta(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <button
              onClick={() => registraGol(null)}
              className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm text-slate-200 border border-slate-700 text-center uppercase"
            >
              ⚽ Gol Squadra Avversaria
            </button>

            <div className="pt-2 text-xs uppercase font-bold text-slate-400">Marcatore Nostra Squadra:</div>
            <div className="space-y-1.5">
              {inCampo.map(g => (
                <button
                  key={g.id}
                  onClick={() => registraGol(g)}
                  className="w-full p-2.5 bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 rounded-lg text-left text-sm font-semibold flex justify-between uppercase"
                >
                  <span>#{g.numero} {g.nome}</span>
                  <span className="text-emerald-400">⚽ Segna</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
