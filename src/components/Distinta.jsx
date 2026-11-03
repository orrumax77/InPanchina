import React, { useState, useEffect, useRef } from 'react';
import { UserCheck, Shield, Plus, Users, Trash2, MapPin, Pencil, Check, X, ArrowLeftRight, Calendar, CheckCircle2, UserCog } from 'lucide-react';
import { 
  salvaRosaBaseSocieta, 
  salvaBozzaPartitaSuDb, 
  salvaBozzaKeepalive,
  dbAggiungiGiocatore, 
  dbModificaGiocatore, 
  dbEliminaGiocatore 
} from '../services/db';

export default function Distinta({ onConfermaDistinta, societa, partitaIniziale, rosaIniziale }) {
  const dateInputRef = useRef(null);
  const oggiISO = new Date().toISOString().split('T')[0];
  const partitaId = societa?.id ? `${societa.id}_PARTITA_LIVE` : null;

  const staffSocieta = societa?.staff_base || {};

  const [partitaInfo, setPartitaInfo] = useState({
    squadraCasa: (partitaIniziale?.squadraCasa || staffSocieta.squadraCasa || societa?.nome || '').toUpperCase(),
    squadraOspite: (partitaIniziale?.squadraOspite || '').toUpperCase(), // <-- Svuotato per evitare residui della gara precedente
    allenatore: (partitaIniziale?.allenatore || staffSocieta.allenatore || societa?.allenatore_predefinito || '').toUpperCase(),
    allenatoreSeconda: (partitaIniziale?.allenatoreSeconda || staffSocieta.allenatoreSeconda || societa?.allenatore_seconda_predefinito || '').toUpperCase(),
    dirigente: (partitaIniziale?.dirigente || staffSocieta.dirigente || societa?.dirigente_predefinito || '').toUpperCase(),
    dirigenteUfficiali: (partitaIniziale?.dirigenteUfficiali || staffSocieta.dirigenteUfficiali || societa?.dirigente_ufficiali_predefinito || '').toUpperCase(),
    assistenteArbitro: (partitaIniziale?.assistenteArbitro || staffSocieta.assistenteArbitro || societa?.assistente_arbitro_predefinito || '').toUpperCase(),
    medicoSociale: (partitaIniziale?.medicoSociale || staffSocieta.medicoSociale || '').toUpperCase(),
    massaggiatore: (partitaIniziale?.massaggiatore || staffSocieta.massaggiatore || '').toUpperCase(),
    preparatoreAtletico: (partitaIniziale?.preparatoreAtletico || staffSocieta.preparatoreAtletico || '').toUpperCase(),
    preparatorePortieri: (partitaIniziale?.preparatorePortieri || staffSocieta.preparatorePortieri || '').toUpperCase(),
    dataPartita: partitaIniziale?.dataPartita || staffSocieta.dataPartita || oggiISO,
    isNostraCasa: partitaIniziale?.isNostraCasa ?? staffSocieta.isNostraCasa ?? true
  });

  const [giocatori, setGiocatori] = useState([]);
  const [salvataggioNotifica, setSalvataggioNotifica] = useState(false);

  // Campi per nuovo giocatore
  const [nuovoNome, setNuovoNome] = useState('');
  const [nuovoNumero, setNuovoNumero] = useState('');
  const [ultimoNumeroSelezionato, setUltimoNumeroSelezionato] = useState(null);

  // Modifica inline giocatore
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editNumero, setEditNumero] = useState('');

  const infoDebounceRef = useRef(null);
  const isLoaded = useRef(false);

  // Riferimento sempre sincronizzato per garantire il salvataggio alla chiusura improvvisa
  const partitaInfoRef = useRef(partitaInfo);
  useEffect(() => {
    partitaInfoRef.current = partitaInfo;
  }, [partitaInfo]);

  // Listener nativi del browser per salvataggio garantito se la scheda viene chiusa di colpo
  useEffect(() => {
    const salvaAllaChiusura = () => {
      if (infoDebounceRef.current) {
        clearTimeout(infoDebounceRef.current);
      }
      if (societa?.id && partitaInfoRef.current) {
        salvaBozzaKeepalive(societa.id, partitaInfoRef.current);
      }
    };

    window.addEventListener('beforeunload', salvaAllaChiusura);
    window.addEventListener('pagehide', salvaAllaChiusura);

    return () => {
      window.removeEventListener('beforeunload', salvaAllaChiusura);
      window.removeEventListener('pagehide', salvaAllaChiusura);
      salvaAllaChiusura();
    };
  }, [societa?.id]);

  const ordinaPerNumeroMaglia = (lista) => {
    return [...lista].sort((a, b) => {
      const numA = parseInt(a.numero, 10) || 0;
      const numB = parseInt(b.numero, 10) || 0;
      return numA - numB;
    });
  };

  useEffect(() => {
    const staff = societa?.staff_base || {};

    const allenatoreVal = (staff.allenatore || partitaIniziale?.allenatore || societa?.allenatore_predefinito || '').toUpperCase();
    const allenatoreSecVal = (staff.allenatoreSeconda || partitaIniziale?.allenatoreSeconda || societa?.allenatore_seconda_predefinito || '').toUpperCase();
    const dirigenteVal = (staff.dirigente || partitaIniziale?.dirigente || societa?.dirigente_predefinito || '').toUpperCase();
    const dirigenteUffVal = (staff.dirigenteUfficiali || partitaIniziale?.dirigenteUfficiali || societa?.dirigente_ufficiali_predefinito || '').toUpperCase();
    const assistenteVal = (staff.assistenteArbitro || partitaIniziale?.assistenteArbitro || societa?.assistente_arbitro_predefinito || '').toUpperCase();
    const medicoVal = (staff.medicoSociale || partitaIniziale?.medicoSociale || '').toUpperCase();
    const massaggiatoreVal = (staff.massaggiatore || partitaIniziale?.massaggiatore || '').toUpperCase();
    const prepAtlVal = (staff.preparatoreAtletico || partitaIniziale?.preparatoreAtletico || '').toUpperCase();
    const prepPortVal = (staff.preparatorePortieri || partitaIniziale?.preparatorePortieri || '').toUpperCase();
    const squadraCasaVal = (staff.squadraCasa || partitaIniziale?.squadraCasa || societa?.nome || '').toUpperCase();
    const squadraOspiteVal = (partitaIniziale?.squadraOspite || '').toUpperCase(); // <-- Azzera se vuota
    const dataPartitaVal = partitaIniziale?.dataPartita || staff.dataPartita || oggiISO;
    const isNostraCasaVal = partitaIniziale?.isNostraCasa ?? staff.isNostraCasa ?? true;

    setPartitaInfo(prev => ({
      ...prev,
      squadraCasa: squadraCasaVal || prev.squadraCasa,
      squadraOspite: squadraOspiteVal,
      allenatore: allenatoreVal || prev.allenatore,
      allenatoreSeconda: allenatoreSecVal || prev.allenatoreSeconda,
      dirigente: dirigenteVal || prev.dirigente,
      dirigenteUfficiali: dirigenteUffVal || prev.dirigenteUfficiali,
      assistenteArbitro: assistenteVal || prev.assistenteArbitro,
      medicoSociale: medicoVal || prev.medicoSociale,
      massaggiatore: massaggiatoreVal || prev.massaggiatore,
      preparatoreAtletico: prepAtlVal || prev.preparatoreAtletico,
      preparatorePortieri: prepPortVal || prev.preparatorePortieri,
      dataPartita: dataPartitaVal,
      isNostraCasa: isNostraCasaVal
    }));

    const rosaDaCaricare = (rosaIniziale && rosaIniziale.length > 0)
      ? rosaIniziale
      : (societa?.rosa_base && societa.rosa_base.length > 0)
        ? societa.rosa_base
        : [];

    if (rosaDaCaricare.length > 0) {
      const formattati = rosaDaCaricare.map(g => ({
        ...g,
        nome: (g.nome || '').toUpperCase()
      }));
      setGiocatori(ordinaPerNumeroMaglia(formattati));
    }

    setTimeout(() => {
      isLoaded.current = true;
    }, 200);
  }, [societa, partitaIniziale, rosaIniziale, oggiISO]);

  const mostraNotificaSalvataggio = () => {
    setSalvataggioNotifica(true);
    setTimeout(() => setSalvataggioNotifica(false), 2000);
  };

  const trovaSuccessivoNumeroLibero = (aPartireDa = null, idDaEscludere = null) => {
    const numeriOccupati = new Set(
      giocatori
        .filter(g => g.id !== idDaEscludere)
        .map(g => parseInt(g.numero, 10))
        .filter(n => !isNaN(n))
    );

    let base;
    if (aPartireDa !== null && !isNaN(parseInt(aPartireDa, 10))) {
      base = parseInt(aPartireDa, 10) + 1;
    } else if (ultimoNumeroSelezionato !== null) {
      base = ultimoNumeroSelezionato + 1;
    } else if (giocatori.length > 0) {
      const numeriPresenti = Array.from(numeriOccupati);
      base = numeriPresenti.length > 0 ? Math.max(...numeriPresenti) + 1 : 1;
    } else {
      base = 1;
    }

    let num = Math.max(1, base);
    while (numeriOccupati.has(num)) {
      num++;
    }
    return String(num);
  };

  const salvaSubitoSuCloud = async (infoDaSalvare) => {
    if (!societa?.id) return;
    await salvaBozzaPartitaSuDb(societa.id, partitaId, infoDaSalvare);
    mostraNotificaSalvataggio();
  };

  const salvaInfoPartitaCloud = (nuoveInfo) => {
    if (!societa?.id) return;

    if (infoDebounceRef.current) clearTimeout(infoDebounceRef.current);
    infoDebounceRef.current = setTimeout(async () => {
      await salvaSubitoSuCloud(nuoveInfo);
    }, 250);
  };

  const handleAggiornaCampo = (campo, valore) => {
    const valoreFormattato = (campo === 'dataPartita') ? valore : valore.toUpperCase();
    const nuoveInfo = { ...partitaInfo, [campo]: valoreFormattato };
    setPartitaInfo(nuoveInfo);
    salvaInfoPartitaCloud(nuoveInfo);
  };

  const handleBlurCampo = () => {
    if (infoDebounceRef.current) clearTimeout(infoDebounceRef.current);
    salvaSubitoSuCloud(partitaInfo);
  };

  const invertiCasaTrasferta = () => {
    const nuoveInfo = {
      ...partitaInfo,
      squadraCasa: partitaInfo.squadraOspite,
      squadraOspite: partitaInfo.squadraCasa,
      isNostraCasa: !partitaInfo.isNostraCasa
    };
    setPartitaInfo(nuoveInfo);
    salvaSubitoSuCloud(nuoveInfo);
  };

  const formattaDataItaliana = (isoDate) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const apriCalendario = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const titolariCount = giocatori.filter(g => g.isTitolare).length;

  const toggleTitolare = async (id) => {
    const target = giocatori.find(g => g.id === id);
    if (!target) return;
    if (!target.isTitolare && titolariCount >= 11) {
      alert('Hai già selezionato 11 titolari!');
      return;
    }

    const aggiornato = { ...target, isTitolare: !target.isTitolare };
    const nuovaLista = ordinaPerNumeroMaglia(giocatori.map(g => (g.id === id ? aggiornato : g)));
    setGiocatori(nuovaLista);
    await dbModificaGiocatore(societa.id, aggiornato);
    await salvaRosaBaseSocieta(societa.id, nuovaLista, undefined);
    mostraNotificaSalvataggio();
  };

  const setCapitano = async (id) => {
    const target = giocatori.find(g => g.id === id);
    if (!target) return;

    const nuovaLista = ordinaPerNumeroMaglia(giocatori.map(g => ({
      ...g,
      isCapitano: g.id === id ? !g.isCapitano : false,
      isVice: g.id === id ? false : g.isVice
    })));
    setGiocatori(nuovaLista);

    for (const g of nuovaLista) {
      await dbModificaGiocatore(societa.id, g);
    }
    await salvaRosaBaseSocieta(societa.id, nuovaLista, undefined);
    mostraNotificaSalvataggio();
  };

  const setViceCapitano = async (id) => {
    const target = giocatori.find(g => g.id === id);
    if (!target) return;

    const nuovaLista = ordinaPerNumeroMaglia(giocatori.map(g => ({
      ...g,
      isVice: g.id === id ? !g.isVice : false,
      isCapitano: g.id === id ? false : g.isCapitano
    })));
    setGiocatori(nuovaLista);

    for (const g of nuovaLista) {
      await dbModificaGiocatore(societa.id, g);
    }
    await salvaRosaBaseSocieta(societa.id, nuovaLista, undefined);
    mostraNotificaSalvataggio();
  };

  const aggiungiGiocatore = async (e) => {
    e.preventDefault();
    if (!nuovoNome.trim()) return;

    let numeroScelto = nuovoNumero.trim();

    if (!numeroScelto) {
      numeroScelto = trovaSuccessivoNumeroLibero();
    } else {
      const giaPresente = giocatori.find(g => String(g.numero) === String(numeroScelto));
      if (giaPresente) {
        const successivoLibero = trovaSuccessivoNumeroLibero(parseInt(numeroScelto, 10));
        const accettaSuggerito = window.confirm(
          `ATTENZIONE: Il numero ${numeroScelto} è già assegnato a "${giaPresente.nome}".\n\nVuoi procedere dal numero successivo libero (#${successivoLibero})?\n\n• Clicca OK per usare il #${successivoLibero}\n• Clicca ANNULLA per scegliere tu un altro numero`
        );

        if (accettaSuggerito) {
          numeroScelto = successivoLibero;
        } else {
          return;
        }
      }
    }

    const numParsed = parseInt(numeroScelto, 10);
    if (!isNaN(numParsed)) {
      setUltimoNumeroSelezionato(numParsed);
    }

    const nuovo = {
      id: Date.now().toString(),
      numero: numeroScelto,
      nome: nuovoNome.trim().toUpperCase(),
      ruolo: '',
      isTitolare: titolariCount < 11,
      isCapitano: false,
      isVice: false
    };

    const nuovaRosa = ordinaPerNumeroMaglia([...giocatori, nuovo]);
    setGiocatori(nuovaRosa);
    setNuovoNome('');
    setNuovoNumero('');

    await dbAggiungiGiocatore(societa.id, nuovo);
    await salvaRosaBaseSocieta(societa.id, nuovaRosa, undefined);
    mostraNotificaSalvataggio();
  };

  const rimuoviGiocatore = async (id) => {
    const nuovaRosa = ordinaPerNumeroMaglia(giocatori.filter(g => g.id !== id));
    setGiocatori(nuovaRosa);
    if (editingId === id) setEditingId(null);

    await dbEliminaGiocatore(societa.id, id);
    await salvaRosaBaseSocieta(societa.id, nuovaRosa, undefined);
    mostraNotificaSalvataggio();
  };

  const avviaModifica = (g) => {
    setEditingId(g.id);
    setEditNumero(g.numero);
    setEditNome(g.nome);
  };

  const salvaModifica = async (id) => {
    if (!editNome.trim()) return;
    const target = giocatori.find(g => g.id === id);
    if (!target) return;

    let numeroScelto = editNumero.trim();

    if (!numeroScelto) {
      numeroScelto = trovaSuccessivoNumeroLibero(null, id);
    } else {
      const giaPresente = giocatori.find(g => g.id !== id && String(g.numero) === String(numeroScelto));
      if (giaPresente) {
        const successivoLibero = trovaSuccessivoNumeroLibero(parseInt(numeroScelto, 10), id);
        const accettaSuggerito = window.confirm(
          `ATTENZIONE: Il numero ${numeroScelto} è già assegnato a "${giaPresente.nome}".\n\nVuoi procedere dal numero successivo libero (#${successivoLibero})?\n\n• Clicca OK per usare il #${successivoLibero}\n• Clicca ANNULLA per scegliere tu un altro numero`
        );

        if (accettaSuggerito) {
          numeroScelto = successivoLibero;
        } else {
          return;
        }
      }
    }

    const numParsed = parseInt(numeroScelto, 10);
    if (!isNaN(numParsed)) {
      setUltimoNumeroSelezionato(numParsed);
    }

    const aggiornato = {
      ...target,
      numero: numeroScelto,
      nome: editNome.trim().toUpperCase()
    };

    const nuovaRosa = ordinaPerNumeroMaglia(giocatori.map(g => (g.id === id ? aggiornato : g)));
    setGiocatori(nuovaRosa);
    setEditingId(null);

    await dbModificaGiocatore(societa.id, aggiornato);
    await salvaRosaBaseSocieta(societa.id, nuovaRosa, undefined);
    mostraNotificaSalvataggio();
  };

  const annullaModifica = () => {
    setEditingId(null);
    setEditNome('');
    setEditNumero('');
  };

  const handleConferma = () => {
    if (!partitaInfo.squadraCasa.trim() || !partitaInfo.squadraOspite.trim()) {
      alert("Inserisci il nome di entrambe le squadre!");
      return;
    }
    onConfermaDistinta({ partitaInfo, giocatori: ordinaPerNumeroMaglia(giocatori) });
  };

  const numeroSuggeritoPlaceholder = trovaSuccessivoNumeroLibero();
  const giocatoriOrdinati = ordinaPerNumeroMaglia(giocatori);

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-5 bg-slate-900 text-slate-100 rounded-2xl shadow-xl">
      {/* Banner Intestazione */}
      <div className="flex items-center gap-3 sm:gap-4 bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800">
        {societa?.logo_url ? (
          <img
            src={societa.logo_url}
            alt="Logo Società"
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-emerald-500/50 shadow-md flex-shrink-0 bg-slate-900"
          />
        ) : (
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-xl font-black text-white uppercase truncate">{societa?.nome || 'DISTINTA DI GARA'}</h1>
          <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 uppercase truncate">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            {societa?.indirizzo_campo || 'CAMPO SPORTIVO'}
          </p>
        </div>

        {salvataggioNotifica && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-1 rounded-lg animate-pulse flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" /> <span className="hidden sm:inline">Salvato nel Cloud</span>
          </span>
        )}
      </div>

      {/* Configurazione Partita di Oggi */}
      <div className="bg-slate-800 p-4 sm:p-5 rounded-xl border border-slate-700 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-emerald-400 uppercase">
              <Shield className="w-5 h-5" /> Partita di Oggi
            </h2>

            <div 
              onClick={apriCalendario}
              className="flex items-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer transition select-none"
              title="Clicca per aprire il calendario"
            >
              <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0 pointer-events-none" />
              <span className="text-xs font-bold font-mono text-white pointer-events-none">
                {formattaDataItaliana(partitaInfo.dataPartita)}
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={partitaInfo.dataPartita}
                onChange={(e) => handleAggiornaCampo('dataPartita', e.target.value)}
                onBlur={handleBlurCampo}
                className="opacity-0 w-0 h-0 absolute pointer-events-auto"
                tabIndex={-1}
              />
            </div>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-950 border border-slate-700 text-slate-300 uppercase">
            {partitaInfo.isNostraCasa ? '🏠 Giochiamo in Casa' : '🚌 Giochiamo Fuori Casa'}
          </span>
        </div>

        {/* Squadre */}
        <div className="grid grid-cols-1 md:grid-cols-9 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="text-xs uppercase text-slate-400 font-semibold block mb-1">
              Squadra Casa {partitaInfo.isNostraCasa && <span className="text-emerald-400">(La Tua Squadra)</span>}
            </label>
            <input
              type="text"
              placeholder="ES. SQUADRA CASA"
              value={partitaInfo.squadraCasa}
              onChange={(e) => handleAggiornaCampo('squadraCasa', e.target.value)}
              onBlur={handleBlurCampo}
              className={`w-full bg-slate-950 border rounded-lg p-2.5 outline-none text-white text-sm uppercase font-semibold ${
                partitaInfo.isNostraCasa ? 'border-emerald-500/50' : 'border-slate-700'
              }`}
            />
          </div>

          <div className="md:col-span-1 flex justify-center pb-0.5">
            <button
              type="button"
              onClick={invertiCasaTrasferta}
              className="p-3 rounded-xl bg-slate-950 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white transition shadow-md flex items-center justify-center gap-1 w-full md:w-auto cursor-pointer"
              title="Scambia Casa / Fuori Casa"
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>
          </div>

          <div className="md:col-span-4">
            <label className="text-xs uppercase text-slate-400 font-semibold block mb-1">
              Squadra Ospite {!partitaInfo.isNostraCasa && <span className="text-emerald-400">(La Tua Squadra)</span>}
            </label>
            <input
              type="text"
              placeholder="DIGITA SQUADRA AVVERSARIA"
              value={partitaInfo.squadraOspite}
              onChange={(e) => handleAggiornaCampo('squadraOspite', e.target.value)}
              onBlur={handleBlurCampo}
              className={`w-full bg-slate-950 border rounded-lg p-2.5 outline-none text-white text-sm uppercase font-semibold ${
                !partitaInfo.isNostraCasa ? 'border-emerald-500/50' : 'border-slate-700'
              }`}
            />
          </div>
        </div>

        {/* Staff Tecnico & Dirigenziale Completo */}
        <div className="pt-3 border-t border-slate-700/70 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <UserCog className="w-4 h-4 text-emerald-400" /> Staff Tecnico & Dirigenziale Ufficiale
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase text-slate-400 font-semibold">Allenatore</label>
              <input
                type="text"
                placeholder="ES. MARIO ROSSI"
                value={partitaInfo.allenatore}
                onChange={(e) => handleAggiornaCampo('allenatore', e.target.value)}
                onBlur={handleBlurCampo}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
              />
            </div>

            <div>
              <label className="text-xs uppercase text-slate-400 font-semibold">Allenatore in Seconda</label>
              <input
                type="text"
                placeholder="ES. PAOLO VERDI"
                value={partitaInfo.allenatoreSeconda}
                onChange={(e) => handleAggiornaCampo('allenatoreSeconda', e.target.value)}
                onBlur={handleBlurCampo}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs uppercase text-slate-400 font-semibold">Dirigente Accompagnatore Ufficiale della Squadra</label>
              <input
                type="text"
                placeholder="ES. LUIGI BIANCHI"
                value={partitaInfo.dirigente}
                onChange={(e) => handleAggiornaCampo('dirigente', e.target.value)}
                onBlur={handleBlurCampo}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
              />
            </div>

            <div>
              <label className="text-xs uppercase text-slate-400 font-semibold">Dirigente Addetto Ufficiali di Gara</label>
              <input
                type="text"
                placeholder="ES. ANDREA NERI"
                value={partitaInfo.dirigenteUfficiali}
                onChange={(e) => handleAggiornaCampo('dirigenteUfficiali', e.target.value)}
                onBlur={handleBlurCampo}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
              />
            </div>

            <div>
              <label className="text-xs uppercase text-slate-400 font-semibold">Assistente all'Arbitro</label>
              <input
                type="text"
                placeholder="ES. GIOVANNI FERRARI"
                value={partitaInfo.assistenteArbitro}
                onChange={(e) => handleAggiornaCampo('assistenteArbitro', e.target.value)}
                onBlur={handleBlurCampo}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
              />
            </div>

            <div>
              <label className="text-xs uppercase text-slate-400 font-semibold">Medico Sociale</label>
              <input
                type="text"
                placeholder="ES. DOTT. MARCO MANCINI"
                value={partitaInfo.medicoSociale}
                onChange={(e) => handleAggiornaCampo('medicoSociale', e.target.value)}
                onBlur={handleBlurCampo}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
              />
            </div>

            <div>
              <label className="text-xs uppercase text-slate-400 font-semibold">Massaggiatore</label>
              <input
                type="text"
                placeholder="ES. LUCA COSTA"
                value={partitaInfo.massaggiatore}
                onChange={(e) => handleAggiornaCampo('massaggiatore', e.target.value)}
                onBlur={handleBlurCampo}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
              />
            </div>

            <div>
              <label className="text-xs uppercase text-slate-400 font-semibold">Preparatore Atletico</label>
              <input
                type="text"
                placeholder="ES. MATTEO GALLI"
                value={partitaInfo.preparatoreAtletico}
                onChange={(e) => handleAggiornaCampo('preparatoreAtletico', e.target.value)}
                onBlur={handleBlurCampo}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
              />
            </div>

            <div>
              <label className="text-xs uppercase text-slate-400 font-semibold">Preparatore dei Portieri</label>
              <input
                type="text"
                placeholder="ES. ROBERTO VILLA"
                value={partitaInfo.preparatorePortieri}
                onChange={(e) => handleAggiornaCampo('preparatorePortieri', e.target.value)}
                onBlur={handleBlurCampo}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Form Aggiunta Rapida Giocatore */}
      <form onSubmit={aggiungiGiocatore} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-wrap gap-3 items-end">
        <div className="w-20 sm:w-24">
          <label className="text-[11px] sm:text-xs text-slate-400 uppercase font-semibold">N° Maglia</label>
          <input
            type="number"
            placeholder={numeroSuggeritoPlaceholder}
            value={nuovoNumero}
            onChange={(e) => setNuovoNumero(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-bold text-center text-sm"
            title="Lascia vuoto per procedere automaticamente dal numero successivo disponibile"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-[11px] sm:text-xs text-slate-400 uppercase font-semibold">Nome e Cognome Giocatore</label>
          <input
            type="text"
            placeholder="ES. ROSSI MARCO"
            value={nuovoNome}
            onChange={(e) => setNuovoNome(e.target.value.toUpperCase())}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm uppercase font-semibold"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition text-sm shadow-md uppercase cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </form>

      {/* Elenco Rosa Giocatori */}
      <div className="bg-slate-800 p-3 sm:p-5 rounded-xl border border-slate-700 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 uppercase">
              <Users className="w-5 h-5 text-blue-400" /> Rosa Giocatori ({giocatoriOrdinati.length})
            </h2>
            <p className="text-[11px] text-emerald-400 mt-0.5">● Elenco ordinato per N° di maglia</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${titolariCount === 11 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
            Titolari: {titolariCount} / 11
          </span>
        </div>

        {giocatoriOrdinati.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-700 rounded-xl uppercase">
            Nessun giocatore registrato per questa società. Aggiungili dal form in alto.
          </div>
        ) : (
          <div className="divide-y divide-slate-700/80 max-h-[480px] overflow-y-auto pr-1">
            {giocatoriOrdinati.map((g) => {
              const inModifica = editingId === g.id;

              return (
                <div 
                  key={g.id} 
                  className="py-2.5 px-2 hover:bg-slate-800/60 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  {inModifica ? (
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        value={editNumero}
                        onChange={(e) => setEditNumero(e.target.value)}
                        className="w-16 bg-slate-950 border border-emerald-500 rounded p-1.5 text-center text-sm font-bold text-emerald-400"
                        placeholder="N°"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value.toUpperCase())}
                        className="flex-1 min-w-[140px] bg-slate-950 border border-emerald-500 rounded p-1.5 text-sm font-bold text-white uppercase"
                        placeholder="NOME GIOCATORE"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => salvaModifica(g.id)}
                          className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                          title="Salva"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={annullaModifica}
                          className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer"
                          title="Annulla"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-sm text-emerald-400 font-mono flex-shrink-0 shadow-sm">
                          {g.numero}
                        </span>
                        <span className="font-bold text-white text-xs sm:text-sm uppercase truncate">
                          {g.nome}
                        </span>
                        {g.isCapitano && (
                          <span className="text-[10px] font-black bg-amber-500 text-black px-1.5 py-0.2 rounded flex-shrink-0">
                            C
                          </span>
                        )}
                        {g.isVice && (
                          <span className="text-[10px] font-black bg-sky-500 text-black px-1.5 py-0.2 rounded flex-shrink-0">
                            VC
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1.5 flex-shrink-0 pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => avviaModifica(g)}
                          className="w-7 h-7 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-amber-400 flex items-center justify-center transition flex-shrink-0 cursor-pointer"
                          title="Modifica Numero o Nome"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleTitolare(g.id)}
                          className={`w-20 sm:w-24 h-7 text-[10px] sm:text-[11px] font-bold rounded-lg transition uppercase flex items-center justify-center flex-shrink-0 cursor-pointer ${
                            g.isTitolare 
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {g.isTitolare ? 'TITOLARE' : 'PANCHINA'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setCapitano(g.id)}
                          className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center transition flex-shrink-0 cursor-pointer ${
                            g.isCapitano 
                              ? 'bg-amber-500 text-black shadow-sm' 
                              : 'bg-slate-700/80 text-slate-400 hover:bg-slate-600'
                          }`}
                          title="Capitano"
                        >
                          C
                        </button>

                        <button
                          type="button"
                          onClick={() => setViceCapitano(g.id)}
                          className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center transition flex-shrink-0 cursor-pointer ${
                            g.isVice 
                              ? 'bg-sky-500 text-black shadow-sm' 
                              : 'bg-slate-700/80 text-slate-400 hover:bg-slate-600'
                          }`}
                          title="Vice Capitano"
                        >
                          VC
                        </button>

                        <button
                          type="button"
                          onClick={() => rimuoviGiocatore(g.id)}
                          className="w-7 h-7 rounded-lg bg-slate-700/80 text-rose-400 hover:bg-rose-950 hover:text-rose-300 transition flex items-center justify-center flex-shrink-0 cursor-pointer"
                          title="Rimuovi ed elimina dal database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2">
        <button
          onClick={handleConferma}
          disabled={titolariCount !== 11}
          className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex justify-center items-center gap-2 transition ${
            titolariCount === 11
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-950'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          {titolariCount === 11 ? 'Conferma e Salva Distinta' : `Seleziona 11 Titolari (ora: ${titolariCount})`}
        </button>
      </div>
    </div>
  );
}
