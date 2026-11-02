import React, { useState } from 'react';
import { Plus, UserCheck, ArrowRightLeft, ShieldAlert, AlertTriangle } from 'lucide-react';

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
  inEsecuzione // Riceve lo stato di marcia del cronometro
}) {
  const [modalGol, setModalGol] = useState(false);
  const [modalAmmonizione, setModalAmmonizione] = useState(false);
  const [modalEspulsione, setModalEspulsione] = useState(false);
  const [modalSostituzione, setModalSostituzione] = useState(false);

  const [giocatoreSelezionato, setGiocatoreSelezionato] = useState('');
  const [giocatoreEsce, setGiocatoreEsce] = useState('');
  const [giocatoreEntra, setGiocatoreEntra] = useState('');

  const [avvisoTimerFermo, setAvvisoTimerFermo] = useState(false);

  // Controllo preliminare obbligatorio: se il timer è fermo lancia un alert e blocca l'azione
  const verificaTimerAvviato = () => {
    if (!inEsecuzione) {
      setAvvisoTimerFermo(true);
      setTimeout(() => setAvvisoTimerFermo(false), 3000);
      return false;
    }
    return true;
  };

  // 1. REGISTRAZIONE GOL NOSTRA SQUADRA
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
    setGiocatoreSelezionato('');
  };

  // 2. REGISTRAZIONE GOL AVVERSARI
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

  // 3. REGISTRAZIONE AMMONIZIONE
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
    setGiocatoreSelezionato('');
  };

  // 4. REGISTRAZIONE ESPULSIONE DIRETTA
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
    setGiocatoreSelezionato('');
  };

  // 5. REGISTRAZIONE SOSTITUZIONE
  const apriModalCambio = () => {
    if (!verificaTimerAvviato()) return;
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

  const titolariInCampo = giocatori.filter(g => g.isTitolare && !g.espulso);
  const panchinaDisponibile = giocatori.filter(g => !g.isTitolare && !g.espulso);

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

      {/* BANNER DI AVVISO QUANDO SI TENTA UN INSERIMENTO A TIMER FERMO */}
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

      {/* Modal Sostituzione */}
      {modalSostituzione && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4">
            <h4 className="text-sm font-bold text-white uppercase">Registra Sostituzione</h4>
            
            <div>
              <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">Esce dal campo:</label>
              <select
                value={giocatoreEsce}
                onChange={(e) => setGiocatoreEsce(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white uppercase"
              >
                <option value="">Seleziona titolare</option>
                {titolariInCampo.map(g => (
                  <option key={g.id} value={g.id}>#{g.numero} {g.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">Entra dalla panchina:</label>
              <select
                value={giocatoreEntra}
                onChange={(e) => setGiocatoreEntra(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white uppercase"
              >
                <option value="">Seleziona riserva</option>
                {panchinaDisponibile.map(g => (
                  <option key={g.id} value={g.id}>#{g.numero} {g.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalSostituzione(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSostituzione}
                disabled={!giocatoreEsce || !giocatoreEntra}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase transition"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
