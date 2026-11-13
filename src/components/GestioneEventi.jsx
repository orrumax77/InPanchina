
import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Check
} from 'lucide-react';
import { dbModificaGiocatore, aggiornaGiocatoriCloud } from '../services/db';

export default function GestioneEventi({
  societaId,
  campionato,
  annata,
  partitaId,
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
  onAggiornaCambiSlot,
  onGolSegnato,
  inEsecuzione
}) {
  const [modalGol, setModalGol] = useState(false);
  const [modalAmmonizione, setModalAmmonizione] = useState(false);
  const [modalSostituzione, setModalSostituzione] = useState(false);

  // Stati di selezione per la logica intuitiva "Click & Swap"
  const [selezionatoEsce, setSelezionatoEsce] = useState(null);
  const [selezionatoEntra, setSelezionatoEntra] = useState(null);
  const [coppieInAttesa, setCoppieInAttesa] = useState([]);

  const [, setForzaAggiornamento] = useState(0);

  useEffect(() => {
    setForzaAggiornamento(prev => prev + 1);
  }, [eventi, giocatori]);

  // Riconoscimento automatico intervallo: 2° tempo prima dell'avvio del cronometro a 00:00
  const isIntervalloAutomatico = tempoGara === 2 && !inEsecuzione && secondiGara === 0;
  const [forzaIntervallo, setForzaIntervallo] = useState(false);
  const isIntervalloEffettivo = isIntervalloAutomatico || forzaIntervallo;

  const [avvisoTimerFermo, setAvvisoTimerFermo] = useState(false);

  // Calcoli limiti regolamentari (7 cambi in 3 slot)
  const cambiRimanenti = Math.max(0, 7 - cambiEffettuati);
  const slotRimanenti = Math.max(0, 3 - slotUsati);
  const cambiEsauriti = cambiRimanenti <= 0;
  const slotEsauriti = slotRimanenti <= 0 && !isIntervalloEffettivo;

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

  // 3. Cartellini
  const apriModalCartellino = () => {
    if (!verificaTimerAvviato()) return;
    setModalAmmonizione(true);
  };

  const handleAmmonizione = async (giocatoreId) => {
    const target = giocatori.find(g => g.id === giocatoreId);
    if (!target) return;

    const nuoveAmm = (target.ammonizioni || 0) + 1;
    const espulso = nuoveAmm >= 2;
    const minutoEspulsione = isIntervalloEffettivo ? 45 : minutoCorrente;

    let giocatoreModificato = null;
    const nuevaRosa = giocatori.map(g => {
      if (g.id === giocatoreId) {
        let minutiFinali = Number(g.minuti || 0);
        
        // Se la doppia ammonizione porta all'espulsione, calcoliamo i minuti esatti fatti fino a questo momento
        if (espulso) {
          const minutoInizio = g.minutoUltimoIngresso !== undefined ? Number(g.minutoUltimoIngresso) : 0;
          const segmentMin = Math.max(0, minutoEspulsione - minutoInizio);
          minutiFinali = minutiFinali + segmentMin;
        }

        giocatoreModificato = {
          ...g,
          ammonizioni: nuoveAmm,
          espulso: espulso ? true : g.espulso,
          isTitolare: espulso ? false : g.isTitolare,
          minuti: minutiFinali,
          minutoUscita: espulso ? minutoEspulsione : g.minutoUscita
        };
        return giocatoreModificato;
      }
      return g;
    });

    setGiocatori(nuevaRosa);
    
    // Sincronizzazione immediata sul DB per il giocatore sanzionato
    if (giocatoreModificato && societaId && campionato && annata) {
      await dbModificaGiocatore(societaId, giocatoreModificato, campionato, annata);
    }

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

  const handleEspulsione = async (giocatoreId) => {
    const target = giocatori.find(g => g.id === giocatoreId);
    if (!target) return;

    const minutoEspulsione = isIntervalloEffettivo ? 45 : minutoCorrente;

    let giocatoreModificato = null;
    const nuevaRosa = giocatori.map(g => {
      if (g.id === giocatoreId) {
        const minutiPrecedenti = Number(g.minuti || 0);
        const minutoInizio = g.minutoUltimoIngresso !== undefined ? Number(g.minutoUltimoIngresso) : 0;
        const segmentMin = Math.max(0, minutoEspulsione - minutoInizio);

        giocatoreModificato = { 
          ...g, 
          espulso: true, 
          isTitolare: false,
          minuti: minutiPrecedenti + segmentMin,
          minutoUscita: minutoEspulsione
        };
        return giocatoreModificato;
      }
      return g;
    });

    setGiocatori(nuevaRosa);

    // Sincronizzazione immediata sul DB dell'espulso
    if (giocatoreModificato && societaId && campionato && annata) {
      await dbModificaGiocatore(societaId, giocatoreModificato, campionato, annata);
    }

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

  // 4. Sostituzioni - Apertura modale
  const apriModalCambio = () => {
    if (!isIntervalloEffettivo && !verificaTimerAvviato()) return;
     
    if (cambiEsauriti) {
      alert("Hai già effettuato tutti i 7 cambi a disposizione!");
      return;
    }

    if (slotEsauriti && !isIntervalloEffettivo) {
      alert("Hai esaurito i 3 slot di gioco a disposizione per le sostituzioni!");
      return;
    }

    setSelezionatoEsce(null);
    setSelezionatoEntra(null);
    setCoppieInAttesa([]);
    setModalSostituzione(true);
  };

  const aggiungiCoppiaAlCarrello = () => {
    if (!selezionatoEsce || !selezionatoEntra) return;

    if (cambiEffettuati + coppieInAttesa.length + 1 > 7) {
      alert("Non puoi superare il limite massimo di 7 cambi complessivi!");
      return;
    }

    setCoppieInAttesa(prev => [...prev, { esce: selezionatoEsce, entra: selezionatoEntra }]);
    setSelezionatoEsce(null);
    setSelezionatoEntra(null);
  };

  const rimuoviCoppiaInAttesa = (idx) => {
    setCoppieInAttesa(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfermaDefinitivaCambi = async () => {
    let listaCambi = [...coppieInAttesa];
    if (selezionatoEsce && selezionatoEntra) {
      listaCambi.push({ esce: selezionatoEsce, entra: selezionatoEntra });
    }

    if (listaCambi.length === 0) return;

    if (cambiEffettuati + listaCambi.length > 7) {
      alert(`Puoi effettuare al massimo altri ${cambiRimanenti} cambi!`);
      return;
    }

    let nuevaRosa = [...giocatori];
    const minutoDelCambio = isIntervalloEffettivo ? 45 : minutoCorrente;
    const idsModificati = new Set();

    // 🔄 TRATTIAMO OGNI CAMBIO IN MODO COMPLETAMENTE ISOLATO
    listaCambi.forEach(({ esce, entra }) => {
      idsModificati.add(esce.id);
      idsModificati.add(entra.id);

      // 1. Aggiorniamo il giocatore che ESCE calcolando il suo segmento esatto
      nuevaRosa = nuevaRosa.map(g => {
        if (g.id === esce.id) {
          const minutiPrecedenti = Number(g.minuti || 0);
          const minutoInizio = g.minutoUltimoIngresso !== undefined ? Number(g.minutoUltimoIngresso) : 0;
          const minutiSegmento = Math.max(0, minutoDelCambio - minutoInizio);
          
          return {
            ...g,
            isTitolare: false,
            minuti: minutiPrecedenti + minutiSegmento,
            minutoUscita: minutoDelCambio,
            minutoUltimoIngresso: undefined // Reset per evitare sovrascritture future
          };
        }
        return g;
      });

      // 2. Aggiorniamo il giocatore che ENTRA
      nuevaRosa = nuevaRosa.map(g => {
        if (g.id === entra.id) {
          return {
            ...g,
            isTitolare: true,
            minutoUltimoIngresso: minutoDelCambio,
            minuti: Number(g.minuti || 0) // Preserva i minuti accumulati in eventuali altri segmenti
          };
        }
        return g;
      });

      const notaSlot = isIntervalloEffettivo
        ? "(Intervallo - 0 slot consumati)"
        : `(Slot ${slotUsati + 1}/3)`;

      onNuovoEvento({
        id: (Date.now() + Math.random()).toString(),
        minuto: minutoDelCambio,
        tempo: isIntervalloEffettivo ? 1 : tempoGara,
        tipo: 'SOSTITUZIONE',
        esceId: esce.id,
        entraId: entra.id,
        dettagli: `Cambio: Esce #${esce.numero} ${esce.nome} ➔ Entra #${entra.numero} ${entra.nome} ${notaSlot}`
      });
    });

    // 🚀 3. AGGIORNIAMO LO STATO LOCALE
    setGiocatori(nuevaRosa);

    // 🚀 4. SALVATAGGIO MIRATO NEL DB: Inviamo a Supabase i dati corretti e unici di ogni giocatore toccato
    if (societaId && campionato && annata) {
      for (const idG of idsModificati) {
        const giocatoreAggiornato = nuevaRosa.find(g => g.id === idG);
        if (giocatoreAggiornato) {
          await dbModificaGiocatore(societaId, giocatoreAggiornato, campionato, annata);
        }
      }
    }
      
    const nuoviCambi = cambiEffettuati + listaCambi.length;
    const novosSlot = isIntervalloEffettivo ? slotUsati : Math.min(3, slotUsati + 1);

    try {
      if (onAggiornaCambiSlot) {
        await onAggiornaCambiSlot(nuoviCambi, novosSlot);
      } else {
        setCambiEffettuati(nuoviCambi);
        setSlotUsati(novosSlot);
      }
    } catch (error) {
      console.error("Errore durante l'aggiornamento dei cambi:", error);
    }
      
    setModalSostituzione(false);
    setSelezionatoEsce(null);
    setSelezionatoEntra(null);
    setCoppieInAttesa([]);
  };
  
  
  // Titolari attualmente in campo
  const titolariInCampo = giocatori.filter(g => {
    const eUscito = eventi.some(e => e.tipo === 'SOSTITUZIONE' && (e.esceId === g.id || e.dettagli?.toUpperCase().includes(`ESCE #${g.numero} `) || e.dettagli?.toUpperCase().includes(`ESCE ${g.nome.toUpperCase()}`)));
    const eEntrato = eventi.some(e => e.tipo === 'SOSTITUZIONE' && (e.entraId === g.id || e.dettagli?.toUpperCase().includes(`ENTRA #${g.numero} `) || e.dettagli?.toUpperCase().includes(`ENTRA ${g.nome.toUpperCase()}`)));
    
    if (eUscito && !eEntrato) return false;
    return (g.isTitolare || eEntrato) && !g.espulso;
  }).sort((a, b) => parseInt(a.numero, 10) - parseInt(b.numero, 10));

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

      {/* RIEPILOGO REGOLAMENTARE RAPIDO */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Cambi:</span>
          <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
            cambiEffettuati >= 7 ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-900 text-emerald-400 border border-slate-800'
          }`}>
            {cambiEffettuati} / 7
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
          <ArrowRightLeft className="w-4 h-4" /> Cambio ({cambiEffettuati}/7)
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
              {giocatori.filter(g => {
                const eUscito = eventi.some(e => e.tipo === 'SOSTITUZIONE' && (e.esceId === g.id || e.dettagli?.toUpperCase().includes(`ESCE #${g.numero} `) || e.dettagli?.toUpperCase().includes(`ESCE ${g.nome.toUpperCase()}`)));
                const eEntrato = eventi.some(e => e.tipo === 'SOSTITUZIONE' && (e.entraId === g.id || e.dettagli?.toUpperCase().includes(`ENTRA #${g.numero} `) || e.dettagli?.toUpperCase().includes(`ENTRA ${g.nome.toUpperCase()}`)));
                
                const attualmenteInCampo = (g.isTitolare && (!eUscito || eEntrato)) || (!g.isTitolare && eEntrato);
                
                return (attualmenteInCampo || g.espulso);
              }).map(g => {
                if (g.espulso) {
                  return (
                    <div key={g.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-900 opacity-50 select-none">
                      <span className="text-xs uppercase font-semibold text-slate-600 line-through">
                        #{g.numero} {g.nome} (ESPULSO)
                      </span>
                      <span className="text-[9px] font-bold text-rose-500 uppercase">Non sanzionabile</span>
                    </div>
                  );
                }

                return (
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
                );
              })}
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
      
      {/* MODALE SOSTITUZIONE AGGIORNATO */}
      {modalSostituzione && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 max-w-3xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div>
                <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Gestione Sostituzioni ({minutoCorrente}')
                </h4>
                <p className="text-[11px] text-slate-400">Tocca prima chi <strong className="text-rose-400">Esce</strong> dal campo, poi chi <strong className="text-emerald-400">Entra</strong> dalla panchina.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                  Cambi: <strong className="text-emerald-400">{cambiEffettuati + coppieInAttesa.length}/7</strong>
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

            {/* Toggle Intervallo Smart */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition border cursor-pointer ${
                  isIntervalloEffettivo
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {isIntervalloEffettivo ? '✓ Intervallo Attivo (0 Slot)' : 'Attiva per Intervallo'}
              </button>
            </div>

            {/* Griglie Interattive */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Colonna 1: Titolari in Campo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-rose-400 bg-rose-950/30 border border-rose-900/40 p-2.5 rounded-xl">
                  <span className="flex items-center gap-1.5"><UserMinus className="w-3.5 h-3.5" /> 1. Chi ESCE (Campo)</span>
                  <span className="text-[10px] font-mono">{titolariInCampo.length} in campo</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {titolariInCampo.map(g => {
                    const isSelezionato = selezionatoEsce?.id === g.id;
                    const giaNelCarrello = coppieInAttesa.some(c => c.esce.id === g.id);

                    if (giaNelCarrello) {
                      return (
                        <div key={g.id} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-900 text-slate-600 flex items-center justify-between opacity-40 select-none text-xs">
                          <span>#{g.numero} {g.nome}</span>
                          <span className="text-[9px] uppercase font-bold text-amber-500">Selezionato</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelezionatoEsce(isSelezionato ? null : g)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer text-xs ${
                          isSelezionato
                            ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-950 font-bold'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-[11px] ${
                            isSelezionato ? 'bg-white text-rose-600' : 'bg-slate-900 text-rose-400 border border-rose-900/40'
                          }`}>
                            {g.numero}
                          </span>
                          <span className="uppercase truncate">{g.nome}</span>
                        </div>
                        {isSelezionato && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colonna 2: Panchina */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 p-2.5 rounded-xl">
                  <span className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" /> 2. Chi ENTRA (Panchina)</span>
                  <span className="text-[10px] font-mono">Disponibili</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {giocatori.filter(g => !g.espulso).map(g => {
                    const eUscito = eventi.some(e => e.tipo === 'SOSTITUZIONE' && (e.esceId === g.id || e.dettagli?.toUpperCase().includes(`ESCE #${g.numero} `) || e.dettagli?.toUpperCase().includes(`ESCE ${g.nome.toUpperCase()}`)));
                    const eEntrato = eventi.some(e => e.tipo === 'SOSTITUZIONE' && (e.entraId === g.id || e.dettagli?.toUpperCase().includes(`ENTRA #${g.numero} `) || e.dettagli?.toUpperCase().includes(`ENTRA ${g.nome.toUpperCase()}`)));
                    
                    const giaUscito = (g.isTitolare && eUscito && !eEntrato) || (!g.isTitolare && eUscito);
                    const eInCampoAttr = (g.isTitolare && !eUscito) || (!g.isTitolare && eEntrato);
                    if (eInCampoAttr) return null;

                    const giaNelCarrello = coppieInAttesa.some(c => c.entra.id === g.id || c.esce.id === g.id);
                    const isSelezionato = selezionatoEntra?.id === g.id;

                    if (giaUscito) {
                      return (
                        <div key={g.id} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-900 text-slate-600 flex items-center justify-between opacity-40 select-none text-xs">
                          <span className="line-through">#{g.numero} {g.nome}</span>
                          <span className="text-[9px] uppercase font-bold text-rose-500">Già uscito (Non rientrabile)</span>
                        </div>
                      );
                    }

                    if (giaNelCarrello) {
                      return (
                        <div key={g.id} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-900 text-slate-600 flex items-center justify-between opacity-40 select-none text-xs">
                          <span>#{g.numero} {g.nome}</span>
                          <span className="text-[9px] uppercase font-bold text-amber-500">Selezionato</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelezionatoEntra(isSelezionato ? null : g)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer text-xs ${
                          isSelezionato
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950 font-bold'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-[11px] ${
                            isSelezionato ? 'bg-white text-emerald-600' : 'bg-slate-900 text-emerald-400 border border-emerald-900/40'
                          }`}>
                            {g.numero}
                          </span>
                          <span className="uppercase truncate">{g.nome}</span>
                        </div>
                        {isSelezionato && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Box di accoppiamento attivo */}
            {selezionatoEsce && selezionatoEntra && (
              <div className="bg-slate-950 border border-blue-500/40 rounded-xl p-3 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-rose-400 font-bold uppercase">Esce: #{selezionatoEsce.numero} {selezionatoEsce.nome}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-emerald-400 font-bold uppercase">Entra: #{selezionatoEntra.numero} {selezionatoEntra.nome}</span>
                </div>

                <button
                  type="button"
                  onClick={aggiungiCoppiaAlCarrello}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-[11px] transition shadow cursor-pointer"
                >
                  + Aggiungi Cambio
                </button>
              </div>
            )}

            {/* Lista cambi multipli in attesa */}
            {coppieInAttesa.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  Cambi pronti per questa interruzione ({coppieInAttesa.length}):
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
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Azioni */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalSostituzione(false);
                  setCoppieInAttesa([]);
                  setSelezionatoEsce(null);
                  setSelezionatoEntra(null);
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={handleConfermaDefinitivaCambi}
                disabled={(!selezionatoEsce || !selezionatoEntra) && coppieInAttesa.length === 0}
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
