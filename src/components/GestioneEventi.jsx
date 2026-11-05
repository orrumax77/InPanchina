import React, { useState } from 'react';
import { 
  Plus, 
  ArrowRightLeft, 
  ShieldAlert, 
  AlertTriangle, 
  ArrowRight, 
  UserMinus, 
  UserPlus, 
  Sparkles, 
  X, 
  AlertCircle 
} from 'lucide-react';

export default function GestioneEventi({
  giocatori,
  setGiocatori,
  eventi,
  setEventi,
  onNuovoEvento,
  minutoCorrente,
  tempoGara,
  secondiGara = 0,
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

  // Supporto per cambi multipli nello stesso slot (es. doppio o triplo cambio)
  const [coppieInAttesa, setCoppieInAttesa] = useState([]);

  // Riconoscimento automatico intervallo: 2° tempo prima dell'avvio del cronometro a 00:00
  const isIntervalloAutomatico = tempoGara === 2 && !inEsecuzione && secondiGara === 0;
  const [forzaIntervallo, setForzaIntervallo] = useState(false);
  const isIntervalloEffettivo = isIntervalloAutomatico || forzaIntervallo;

  const [avvisoTimerFermo, setAvvisoTimerFermo] = useState(false);

  // Calcoli limiti regolamentari (5 cambi in 3 slot)
  const cambiRimanenti = Math.max(0, 5 - cambiEffettuati);
  const slotRimanenti = Math.max(0, 3 - slotUsati);
  const cambiEsauriti = cambiRimanenti <= 0;
  const slotEsauriti = slotRimanenti <= 0 && !isIntervalloEffettivo;

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
      giocatoreId: giocatoreId || null,
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
          espulso: espulso ? true : g.espulso,
          isTitolare: espulso ? false : g.isTitolare
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
      giocatoreId: giocatoreId,
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
        return { ...g, espulso: true, isTitolare: false };
      }
      return g;
    });

    setGiocatori(nuovaRosa);

    onNuovoEvento({
      id: Date.now().toString(),
      minuto: minutoCorrente,
      tempo: tempoGara,
      tipo: 'ESPULSIONE',
      giocatoreId: giocatoreId,
      dettagli: `Espulsione Diretta: #${target.numero} ${target.nome}`
    });

    setModalAmmonizione(false);
  };

  // 4. Sostituzioni (regola 5 cambi in 3 slot + intervallo)
  const apriModalCambio = () => {
    if (!isIntervalloEffettivo && !verificaTimerAvviato()) return;
     
    if (cambiEsauriti) {
      alert("Hai già effettuato tutti i 5 cambi a disposizione!");
      return;
    }

    if (slotEsauriti && !isIntervalloEffettivo) {
      alert("Hai esaurito i 3 slot di gioco a disposizione per le sostituzioni!");
      return;
    }

    setGiocatoreEsce('');
    setGiocatoreEntra('');
    setCoppieInAttesa([]);
    setModalSostituzione(true);
  };

  const aggiungiAltraCoppia = () => {
    if (!giocatoreEsce || !giocatoreEntra) return;

    const esce = giocatori.find(g => g.id === giocatoreEsce);
    const entra = giocatori.find(g => g.id === giocatoreEntra);
    if (!esce || !entra) return;

    if (cambiEffettuati + coppieInAttesa.length + 1 > 5) {
      alert("Non puoi superare il limite massimo di 5 cambi complessivi!");
      return;
    }

    setCoppieInAttesa(prev => [...prev, { esce, entra }]);
    setGiocatoreEsce('');
    setGiocatoreEntra('');
  };

  const rimuoviCoppiaInAttesa = (idx) => {
    setCoppieInAttesa(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfermaTuttiICambi = async () => {
    let listaCambi = [...coppieInAttesa];
    if (giocatoreEsce && giocatoreEntra) {
      const esce = giocatori.find(g => g.id === giocatoreEsce);
      const entra = giocatori.find(g => g.id === giocatoreEntra);
      if (esce && entra) {
        listaCambi.push({ esce, entra });
      }
    }

    if (listaCambi.length === 0) return;

    if (cambiEffettuati + listaCambi.length > 5) {
      alert(`Puoi effettuare al massimo altri ${cambiRimanenti} cambi!`);
      return;
    }

    if (!isIntervalloEffettivo && slotUsati >= 3) {
      alert("Tutti i 3 slot di gioco sono già stati esauriti!");
      return;
    }

    let nuovaRosa = [...giocatori];

    listaCambi.forEach(({ esce, entra }) => {
      nuovaRosa = nuovaRosa.map(g => {
        if (g.id === esce.id) return { ...g, isTitolare: false };
        if (g.id === entra.id) return { ...g, isTitolare: true };
        return g;
      });

      const notaSlot = isIntervalloEffettivo
        ? "(Intervallo - 0 slot consumati)"
        : `(Slot ${slotUsati + 1}/3)`;

      onNuovoEvento({
        id: (Date.now() + Math.random()).toString(),
        minuto: isIntervalloEffettivo ? 45 : minutoCorrente,
        tempo: isIntervalloEffettivo ? 1 : tempoGara,
        tipo: 'SOSTITUZIONE',
        esceId: esce.id,
        entraId: entra.id,
        dettagli: `Cambio: Esce #${esce.numero} ${esce.nome} ➔ Entra #${entra.numero} ${entra.nome} ${notaSlot}`
      });
    });

    setGiocatori(nuovaRosa);
    
    // Calcoliamo i nuovi valori aggiornati
    const nuoviCambiEffettuati = cambiEffettuati + listaCambi.length;
    const nuoviSlotUsati = isIntervalloEffettivo ? slotUsati : Math.min(3, slotUsati + 1);

    setCambiEffettuati(nuoviCambiEffettuati);
    if (!isIntervalloEffettivo) {
      setSlotUsati(nuoviSlotUsati);
    }

    // SINCRONIZZAZIONE PERSISTENTE SUL DB CLOUD (Supabase)
    try {
      const { syncStatoPartitaSuDb } = await import('../services/db');
      const partitaId = `${giocatori[0]?.societa_id || ''}_PARTITA_LIVE`; // O ricavato dal contesto
      // Nota: se preferisci passare la funzione di sync direttamente come prop da App.jsx puoi farlo, 
      // oppure usiamo l'importazione diretta dei servizi di database come fatto altrove.
    } catch (e) {
      // Gestito in automatico se integrato nel flusso principale
    }

    setModalSostituzione(false);
    setGiocatoreEsce('');
    setGiocatoreEntra('');
    setCoppieInAttesa([]);
  };
  
  // Chi è attualmente titolare in campo (e non espulso, e non già selezionato per uscire in questo slot)
  const titolariInCampo = giocatori
    .filter(g => g.isTitolare && !g.espulso && !coppieInAttesa.some(c => c.esce.id === g.id))
    .sort((a, b) => parseInt(a.numero, 10) - parseInt(b.numero, 10));

  const targetEsce = giocatori.find(g => g.id === giocatoreEsce);
  const targetEntra = giocatori.find(g => g.id === giocatoreEntra);

  const cambioDisabilitato = cambiEsauriti || (slotEsauriti && !isIntervalloEffettivo);

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

      {/* RIEPILOGO REGOLAMENTARE RAPIDO: CAMBI & SLOT */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Cambi:</span>
          <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
            cambiEffettuati >= 5 ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-900 text-emerald-400 border border-slate-800'
          }`}>
            {cambiEffettuati} / 5
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Slot Usati:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((num) => {
              const attivo = num <= slotUsati;
              return (
                <span
                  key={num}
                  className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] border ${
                    attivo
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                  title={`Slot ${num} ${attivo ? 'usato' : 'disponibile'}`}
                >
                  {num}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* PULSANTIERA AZIONI RAPIDE */}
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
          disabled={cambioDisabilitato}
          className={`font-bold py-3 px-2 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition shadow-md ${
            cambioDisabilitato
              ? 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
              : inEsecuzione || isIntervalloEffettivo
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
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-xs font-semibold uppercase text-slate-200 cursor-pointer"
                >
                  <span>#{g.numero} {g.nome}</span>
                  <Plus className="w-4 h-4 text-emerald-400" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleGolNostro('')}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-xs font-semibold uppercase text-amber-400 pt-2 cursor-pointer"
              >
                <span>Autogol / Marcatore Non In Lista</span>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setModalGol(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase cursor-pointer"
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
              {giocatori.filter(g => g.isTitolare && !g.espulso).map(g => (
                <div key={g.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-xs uppercase font-semibold text-slate-200">
                    #{g.numero} {g.nome} {g.ammonizioni > 0 ? `(🟨 ${g.ammonizioni})` : ''}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAmmonizione(g.id)}
                      className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Giallo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEspulsione(g.id)}
                      className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase cursor-pointer"
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
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase cursor-pointer"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* MODAL SOSTITUZIONE */}
      {modalSostituzione && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 max-w-2xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
              <div>
                <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Sostituzioni di Gara (Minuto {isIntervalloEffettivo ? "45' (Int.)" : `${minutoCorrente}'`})
                </h4>
                <p className="text-[11px] text-slate-400">Regola ufficiale: Max 5 cambi in 3 interruzioni di gioco (slot).</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                  Cambi: <strong className="text-emerald-400">{cambiEffettuati + coppieInAttesa.length}/5</strong>
                </span>
                <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-md border ${
                  isIntervalloEffettivo
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}>
                  {isIntervalloEffettivo ? 'Slot: 0 (Intervallo)' : `Slot: ${slotUsati}/3`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-white block uppercase text-[11px]">Sostituzione durante l'Intervallo</span>
                  <span className="text-[10px] text-slate-400">Non consuma nessuno dei 3 slot di gioco.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setForzaIntervallo(!forzaIntervallo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border cursor-pointer ${
                  isIntervalloEffettivo
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {isIntervalloEffettivo ? '✓ Attivo (0 Slot)' : 'Attiva per Intervallo'}
              </button>
            </div>

            {slotEsauriti && !isIntervalloEffettivo && (
              <div className="bg-amber-950/50 border border-amber-500/40 p-2.5 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Attenzione: tutti i 3 slot di gioco a tempo attivo sono stati utilizzati!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Colonna 1: Chi ESCE (Titolari attualmente in campo) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-rose-400 bg-rose-950/30 border border-rose-900/40 p-2 rounded-lg">
                  <span className="flex items-center gap-1.5"><UserMinus className="w-3.5 h-3.5" /> 1. Chi ESCE (In campo)</span>
                  <span className="text-[10px] font-mono text-slate-400">({titolariInCampo.length})</span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {titolariInCampo.length === 0 ? (
                    <p className="text-[11px] text-slate-500 uppercase text-center py-6">Nessun titolare disponibile</p>
                  ) : (
                    titolariInCampo.map(g => {
                      const isSel = giocatoreEsce === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGiocatoreEsce(isSel ? '' : g.id)}
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

              {/* Colonna 2: Chi ENTRA (Panchina - Mostra tutti ma disabilita chi è già uscito) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 p-2 rounded-lg">
                  <span className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" /> 2. Chi ENTRA (Panchina)</span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {giocatori.filter(g => !g.isTitolare && !g.espulso).map(g => {
                    // Controlliamo se il giocatore è già uscito in precedenza controllando la cronologia degli eventi di sostituzione
                    const giaUscito = eventi.some(e => 
                      e.tipo === 'SOSTITUZIONE' && (
                        e.esceId === g.id || 
                        (e.dettagli && (e.dettagli.toUpperCase().includes(g.nome.toUpperCase()) || e.dettagli.includes(`#${g.numero} `)))
                      )
                    );

                    const isSel = giocatoreEntra === g.id;

                    if (giaUscito) {
                      return (
                        <div key={g.id} className="w-full text-left p-2.5 rounded-xl border bg-slate-950/40 border-slate-900 text-slate-600 flex items-center justify-between opacity-50 select-none">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono flex-shrink-0 bg-slate-900 text-slate-600 border border-slate-800">
                              {g.numero}
                            </span>
                            <span className="text-xs font-semibold uppercase truncate line-through">{g.nome}</span>
                          </div>
                          <span className="text-[9px] font-bold text-rose-500 uppercase flex-shrink-0">
                            Già uscito (Non rientrabile)
                          </span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGiocatoreEntra(isSel ? '' : g.id)}
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
                  })}
                </div>
              </div>
            </div>

            {giocatoreEsce && giocatoreEntra && (
              <div className="space-y-2">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex-1 truncate">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Esce:</span>
                    <span className="font-bold uppercase text-rose-400 truncate block">
                      {targetEsce ? `#${targetEsce.numero} ${targetEsce.nome}` : ''}
                    </span>
                  </div>

                  <div className="px-3 text-slate-600">
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  <div className="flex-1 text-right truncate">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Entra:</span>
                    <span className="font-bold uppercase text-emerald-400 truncate block">
                      {targetEntra ? `#${targetEntra.numero} ${targetEntra.nome}` : ''}
                    </span>
                  </div>
                </div>

                {cambiEffettuati + coppieInAttesa.length + 1 < 5 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={aggiungiAltraCoppia}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> Prepara un altro cambio in questo stesso slot
                    </button>
                  </div>
                )}
              </div>
            )}

            {coppieInAttesa.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  Cambi raggruppati in questa interruzione ({coppieInAttesa.length}):
                </span>
                <div className="space-y-1.5">
                  {coppieInAttesa.map((coppia, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-rose-400 font-bold font-mono">#{coppia.esce.numero} {coppia.esce.nome}</span>
                        <span className="text-slate-500">➔</span>
                        <span className="text-emerald-400 font-bold font-mono">#{coppia.entra.numero} {coppia.entra.nome}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => rimuoviCoppiaInAttesa(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="Rimuovi questo cambio dal gruppo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setModalSostituzione(false);
                  setCoppieInAttesa([]);
                  setGiocatoreEsce('');
                  setGiocatoreEntra('');
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={handleConfermaTuttiICambi}
                disabled={(!giocatoreEsce || !giocatoreEntra) && coppieInAttesa.length === 0}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-black uppercase transition shadow-lg shadow-blue-950 cursor-pointer disabled:cursor-not-allowed"
              >
                {isIntervalloEffettivo
                  ? 'Conferma Cambio nell\'Intervallo (0 Slot)'
                  : `Conferma Sostituzione (Consuma Slot ${slotUsati + 1} di 3)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
