import React, { useState } from 'react';
import { Plus, ArrowRightLeft, ShieldAlert, AlertTriangle, ArrowRight, UserMinus, UserPlus } from 'lucide-react';

export default function GestioneEventi({
  giocatori,
  setGiocatori,
  eventi,
  setEventi,
  onNuovoEvento,
  minutoCorrente,
  tempoGara,
  slotUsati,
  setSlotUsati,
  cambiEffettuati,
  setCambiEffettuati,
  onGolSegnato,
  inEsecuzione
}) {
  const [modalGol, setModalGol] = useState(false);
  const [modalAmmonizione, setModalAmmonizione] = useState(false);
  const [modalSostituzione, setModalSostituzione] = useState(false);

  const [giocatoreEsce, setGiocatoreEsce] = useState('');
  const [giocatoreEntra, setGiocatoreEntra] = useState('');

  const [avvisoTimerFermo, setAvvisoTimerFermo] = useState(false);

  // Controllo timer avviato
  const verificaTimerAvviato = () => {
    if (!inEsecuzione) {
      setAvvisoTimerFermo(true);
      setTimeout(() => setAvvisoTimerFermo(false), 3000);
      return false;
    }
    return true;
  };

  // 1. Gol Nostro
  const apriModalGol = () => {
    if (!verificaTimerAvviato()) return;
    setModalGol(true);
  };

  const handleGolNostro = (giocatoreId) => {
    const marcatore = giocatori.find(g => g.id === giocatoreId);
    const nome = marcatore ? `#${marcatore.numero} ${marcatore.nome}` : 'Nostra Squadra';

    onNuovoEvento({
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: 'GOL',
      squadra: 'NOSTRA',
      dettagli: `Gol: ${nome}`
    });

    if (onGolSegnato) onGolSegnato(true);
    setModalGol(false);
  };

  // 2. Gol Avversari
  const handleGolAvversario = () => {
    if (!verificaTimerAvviato()) return;

    onNuovoEvento({
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: 'GOL',
      squadra: 'AVVERSARIA',
      dettagli: 'Gol Squadra Avversaria'
    });

    if (onGolSegnato) onGolSegnato(false);
  };

  // 3. Cartellino
  const apriModalCartellino = () => {
    if (!verificaTimerAvviato()) return;
    setModalAmmonizione(true);
  };

  const handleAmmonizione = (giocatoreId) => {
    const target = giocatori.find(g => g.id === giocatoreId);
    if (!target) return;

    const nuoveAmm = (target.ammonizioni || 0) + 1;
    const espulso = nuoveAmm >= 2;

    const nuovaRosa = giocatori.map(g => {
      if (g.id === giocatoreId) {
        return {
          ...g,
          ammonizioni: nuoveAmm,
          espulso: espulso ? true : g.espulso
        };
      }
      return g;
    });

    setGiocatori(nuovaRosa);

    onNuovoEvento({
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: espulso ? 'ESPULSIONE' : 'AMMONIZIONE',
      dettagli: espulso 
        ? `Doppia Ammonizione / Espulsione: #${target.numero} ${target.nome}` 
        : `Ammonizione: #${target.numero} ${target.nome}`
    });

    setModalAmmonizione(false);
  };

  const handleEspulsione = (giocatoreId) => {
    const target = giocatori.find(g => g.id === giocatoreId);
    if (!target) return;

    const nuovaRosa = giocatori.map(g => {
      if (g.id === giocatoreId) {
        return { ...g, espulso: true };
      }
      return g;
    });

    setGiocatori(nuovaRosa);

    onNuovoEvento({
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: 'ESPULSIONE',
      dettagli: `Espulsione Diretta: #${target.numero} ${target.nome}`
    });

    setModalAmmonizione(false);
  };

  // 4. Sostituzione
  const apriModalCambio = () => {
    if (!verificaTimerAvviato()) return;
    setGiocatoreEsce('');
    setGiocatoreEntra('');
    setModalSostituzione(true);
  };

  const handleSostituzione = () => {
    if (!giocatoreEsce || !giocatoreEntra) return;

    const esce = giocatori.find(g => g.id === giocatoreEsce);
    const entra = giocatori.find(g => g.id === giocatoreEntra);

    if (!esce || !entra) return;

    const nuovaRosa = giocatori.map(g => {
      if (g.id === giocatoreEsce) return { ...g, isTitolare: false };
      if (g.id === giocatoreEntra) return { ...g, isTitolare: true };
      return g;
    });

    setGiocatori(nuovaRosa);
    setCambiEffettuati(prev => prev + 1);
    setSlotUsati(prev => Math.min(3, prev + 1));

    onNuovoEvento({
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: 'SOSTITUZIONE',
      dettagli: `Cambio: Esce #${esce.numero} ${esce.nome} ➔ Entra #${entra.numero} ${entra.nome}`
    });

    setModalSostituzione(false);
    setGiocatoreEsce('');
    setGiocatoreEntra('');
  };

  const titolariInCampo = giocatori
    .filter(g => g.isTitolare && !g.espulso)
    .sort((a, b) => parseInt(a.numero, 10) - parseInt(b.numero, 10));

  const panchinaDisponibile = giocatori
    .filter(g => !g.isTitolare && !g.espulso)
    .sort((a, b) => parseInt(a.numero, 10) - parseInt(b.numero, 10));

  const targetEsce = giocatori.find(g => g.id === giocatoreEsce);
  const targetEntra = giocatori.find(g => g.id === giocatoreEntra);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl space-y-4 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase font-bold text-slate-400">Registra Evento di Gara</h3>
        {!inEsecuzione && (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Cronometro in pausa
          </span>
        )}
      </div>

      {avvisoTimerFermo && (
        <div className="bg-rose-950/90 border-2 border-rose-500 p-3 rounded-xl flex items-center gap-2.5 text-rose-200 text-xs font-bold uppercase animate-bounce shadow-xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>Attenzione: Avvia il cronometro prima di inserire un evento di gara!</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={apriModalGol}
          className={`font-bold py-3 px-2 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition shadow-md ${
            inEsecuzione 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950 cursor-pointer' 
              : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 opacity-80'
          }`}
        >
          <Plus className="w-4 h-4" /> Gol Nostro
        </button>

        <button
          type="button"
          onClick={handleGolAvversario}
          className={`font-bold py-3 px-2 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition shadow-md ${
            inEsecuzione 
              ? 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 cursor-pointer' 
              : 'bg-slate-800/80 text-slate-500 border border-slate-700/60 opacity-80'
          }`}
        >
          <Plus className="w-4 h-4" /> Gol Avversari
        </button>

        <button
          type="button"
          onClick={apriModalCartellino}
          className={`font-bold py-3 px-2 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition shadow-md ${
            inEsecuzione 
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950 cursor-pointer' 
              : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 opacity-80'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Cartellino
        </button>

        <button
          type="button"
          onClick={apriModalCambio}
          className={`font-bold py-3 px-2 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition shadow-md ${
            inEsecuzione 
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950 cursor-pointer' 
              : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 opacity-80'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> Cambio ({cambiEffettuati}/5)
        </button>
      </div>

      {/* Modal Gol Nostro */}
      {modalGol && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4">
            <h4 className="text-sm font-bold text-white uppercase">Chi ha segnato il gol?</h4>
            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-800">
              {titolariInCampo.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleGolNostro(g.id)}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-xs font-semibold uppercase text-slate-200"
                >
                  <span>#{g.numero} {g.nome}</span>
                  <Plus className="w-4 h-4 text-emerald-400" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleGolNostro('')}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-xs font-semibold uppercase text-amber-400 pt-2"
              >
                <span>Autogol / Marcatore Non In Lista</span>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setModalGol(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Modal Cartellino */}
      {modalAmmonizione && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4">
            <h4 className="text-sm font-bold text-white uppercase">Seleziona Giocatore Sanzionato</h4>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {giocatori.filter(g => !g.espulso).map(g => (
                <div key={g.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-xs uppercase font-semibold text-slate-200">#{g.numero} {g.nome}</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAmmonizione(g.id)}
                      className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase"
                    >
                      Giallo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEspulsione(g.id)}
                      className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase"
                    >
                      Rosso
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setModalAmmonizione(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* MODAL SOSTITUZIONE A LISTE SELEZIONABILI */}
      {modalSostituzione && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Registra Sostituzione (Minuto {minutoCorrente}')
              </h4>
              <span className="text-[11px] font-bold text-slate-400 uppercase bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                Slot {slotUsati}/3 • Cambi {cambiEffettuati}/5
              </span>
            </div>

            {/* Griglia a 2 colonne di liste */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Colonna 1: Chi ESCE (Titolari) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-rose-400 bg-rose-950/30 border border-rose-900/40 p-2 rounded-lg">
                  <span className="flex items-center gap-1.5"><UserMinus className="w-3.5 h-3.5" /> 1. Seleziona chi ESCE</span>
                  <span className="text-[10px] font-mono text-slate-400">({titolariInCampo.length})</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {titolariInCampo.length === 0 ? (
                    <p className="text-[11px] text-slate-500 uppercase text-center py-6">Nessun titolare disponibile</p>
                  ) : (
                    titolariInCampo.map(g => {
                      const isSel = giocatoreEsce === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGiocatoreEsce(g.id)}
                          className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                            isSel
                              ? 'bg-rose-950/70 border-rose-500 text-white shadow-md shadow-rose-950/50'
                              : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono flex-shrink-0 ${
                              isSel ? 'bg-rose-600 text-white' : 'bg-slate-900 text-rose-400 border border-rose-900/40'
                            }`}>
                              {g.numero}
                            </span>
                            <span className="text-xs font-semibold uppercase truncate">{g.nome}</span>
                          </div>
                          {isSel && (
                            <span className="text-[10px] font-bold text-rose-300 bg-rose-900/50 px-2 py-0.5 rounded uppercase flex-shrink-0">
                              ESCE
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Colonna 2: Chi ENTRA (Panchina) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 p-2 rounded-lg">
                  <span className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" /> 2. Seleziona chi ENTRA</span>
                  <span className="text-[10px] font-mono text-slate-400">({panchinaDisponibile.length})</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {panchinaDisponibile.length === 0 ? (
                    <p className="text-[11px] text-slate-500 uppercase text-center py-6">Nessuna riserva disponibile</p>
                  ) : (
                    panchinaDisponibile.map(g => {
                      const isSel = giocatoreEntra === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGiocatoreEntra(g.id)}
                          className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                            isSel
                              ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                              : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono flex-shrink-0 ${
                              isSel ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-emerald-400 border border-emerald-900/40'
                            }`}>
                              {g.numero}
                            </span>
                            <span className="text-xs font-semibold uppercase truncate">{g.nome}</span>
                          </div>
                          {isSel && (
                            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/50 px-2 py-0.5 rounded uppercase flex-shrink-0">
                              ENTRA
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Anteprima grafica del cambio selezionato */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex-1 truncate">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Esce:</span>
                <span className="font-bold uppercase text-rose-400 truncate block">
                  {targetEsce ? `#${targetEsce.numero} ${targetEsce.nome}` : 'Seleziona dalla lista a sinistra'}
                </span>
              </div>

              <div className="px-3 text-slate-600">
                <ArrowRight className="w-4 h-4" />
              </div>

              <div className="flex-1 text-right truncate">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Entra:</span>
                <span className="font-bold uppercase text-emerald-400 truncate block">
                  {targetEntra ? `#${targetEntra.numero} ${targetEntra.nome}` : 'Seleziona dalla lista a destra'}
                </span>
              </div>
            </div>

            {/* Pulsanti Azione */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setModalSostituzione(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSostituzione}
                disabled={!giocatoreEsce || !giocatoreEntra}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-black uppercase transition shadow-lg shadow-blue-950 cursor-pointer disabled:cursor-not-allowed"
              >
                Conferma Sostituzione
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
