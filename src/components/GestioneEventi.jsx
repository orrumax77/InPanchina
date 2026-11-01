import React, { useState } from 'react';
import { ArrowLeftRight, Square, CircleDot, AlertTriangle, X } from 'lucide-react';

export default function GestioneEventi({
  giocatori,
  setGiocatori,
  eventi,
  setEventi,
  minutoCorrente,
  tempoGara,
  slotUsati,
  setSlotUsati,
  cambiEffettuati,
  setCambiEffettuati,
  onGolSegnato
}) {
  const [modalAperta, setModalAperta] = useState(null); // 'SOSTITUZIONE' | 'CARTELLINO' | 'GOL'
  const [giocatoreEsce, setGiocatoreEsce] = useState(null);

  // Filtra chi è in campo e chi è in panchina
  const inCampo = giocatori.filter(g => g.isTitolare && !g.espulso);
  const inPanchina = giocatori.filter(g => !g.isTitolare && !g.espulso);

  // 1. GESTIONE SOSTITUZIONE
  const eseguiSostituzione = (giocatoreEntra) => {
    if (!giocatoreEsce) return;
    if (cambiEffettuati >= 5) {
      alert('Hai già effettuato tutti i 5 cambi a disposizione!');
      return;
    }
    if (slotUsati >= 3) {
      alert('Attenzione: hai già consumato tutti i 3 slot temporali per i cambi!');
      return;
    }

    // Aggiorna stato titolari/panchina
    setGiocatori(giocatori.map(g => {
      if (g.id === giocatoreEsce.id) return { ...g, isTitolare: false };
      if (g.id === giocatoreEntra.id) return { ...g, isTitolare: true };
      return g;
    }));

    // Registra evento
    const nuovoEvento = {
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: 'SOSTITUZIONE',
      dettagli: `Esce #${giocatoreEsce.numero} ${giocatoreEsce.nome} ➔ Entra #${giocatoreEntra.numero} ${giocatoreEntra.nome}`,
      idEsce: giocatoreEsce.id,
      idEntra: giocatoreEntra.id
    };

    setEventi([nuovoEvento, ...eventi]);
    setCambiEffettuati(cambiEffettuati + 1);
    setSlotUsati(slotUsati + 1);
    setGiocatoreEsce(null);
    setModalAperta(null);
  };

  // 2. GESTIONE CARTELLINI
  const assegnaCartellino = (giocatore, colore) => {
    let nuovoTipo = 'AMMONIZIONE';
    let dettagli = '';

    setGiocatori(giocatori.map(g => {
      if (g.id === giocatore.id) {
        if (colore === 'giallo') {
          const nuoveAmm = (g.ammonizioni || 0) + 1;
          const espulso = nuoveAmm >= 2;
          nuovoTipo = espulso ? 'ESPULSIONE' : 'AMMONIZIONE';
          dettagli = espulso
            ? `2° Giallo ➔ Rosso per #${g.numero} ${g.nome}`
            : `Ammonito #${g.numero} ${g.nome}`;
          return { ...g, ammonizioni: nuoveAmm, espulso };
        } else {
          nuovoTipo = 'ESPULSIONE';
          dettagli = `Rosso diretto per #${g.numero} ${g.nome}`;
          return { ...g, espulso: true };
        }
      }
      return g;
    }));

    setEventi([{
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: nuovoTipo,
      dettagli,
      giocatoreId: giocatore.id
    }, ...eventi]);

    setModalAperta(null);
  };

  // 3. GESTIONE GOL
  const registraGol = (giocatore) => {
    const dettagli = giocatore
      ? `Gol di #${giocatore.numero} ${giocatore.nome}`
      : 'Gol avversario';

    setEventi([{
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: 'GOL',
      dettagli
    }, ...eventi]);

    onGolSegnato(Boolean(giocatore));
    setModalAperta(null);
  };

  return (
    <div className="space-y-4">
      {/* Indicatori Slot e Cambi */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs font-semibold">
        <span className="text-slate-300">
          Cambi: <strong className="text-white">{cambiEffettuati}/5</strong>
        </span>
        <span className="text-slate-300">
          Slot Usati: <strong className="text-amber-400">{slotUsati}/3</strong>
        </span>
      </div>

      {/* Pulsanti Grandi per Azioni Rapide a Bordo Campo */}
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

      {/* POPUP MODALE SOSTITUZIONI */}
      {modalAperta === 'SOSTITUZIONE' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                {!giocatoreEsce ? '1. Seleziona chi ESCE dal campo' : `2. Chi ENTRA al posto di #${giocatoreEsce.numero}?`}
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
                    className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-rose-950/40 border border-slate-800 flex justify-between items-center text-sm"
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
                    className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 flex justify-between items-center text-sm"
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

      {/* POPUP MODALE CARTELLINI */}
      {modalAperta === 'CARTELLINO' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white">Assegna Cartellino</h3>
              <button onClick={() => setModalAperta(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2">
              {giocatori.filter(g => !g.espulso).map(g => (
                <div key={g.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-bold text-white block">#{g.numero} {g.nome}</span>
                    <span className="text-xs text-slate-500">
                      {g.isTitolare ? 'In Campo' : 'In Panchina'} {g.ammonizioni === 1 && '• (1 Giallo)'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => assegnaCartellino(g, 'giallo')}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded"
                    >
                      Giallo
                    </button>
                    <button
                      onClick={() => assegnaCartellino(g, 'rosso')}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded"
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

      {/* POPUP MODALE GOL */}
      {modalAperta === 'GOL' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white">Chi ha segnato?</h3>
              <button onClick={() => setModalAperta(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <button
              onClick={() => registraGol(null)}
              className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm text-slate-200 border border-slate-700 text-center"
            >
              ⚽ Gol Squadra Avversaria
            </button>

            <div className="pt-2 text-xs uppercase font-bold text-slate-400">Marcatore Nostra Squadra:</div>
            <div className="space-y-1.5">
              {inCampo.map(g => (
                <button
                  key={g.id}
                  onClick={() => registraGol(g)}
                  className="w-full p-2.5 bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 rounded-lg text-left text-sm font-semibold flex justify-between"
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
