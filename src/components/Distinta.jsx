import React, { useState, useEffect, useRef } from 'react';
import { UserCheck, Shield, Plus, Users, Trash2, MapPin, Pencil, Check, X, ArrowLeftRight } from 'lucide-react';
import { salvaRosaBaseSocieta } from '../services/db';

export default function Distinta({ onConfermaDistinta, societa, partitaIniziale, rosaIniziale }) {
  const [partitaInfo, setPartitaInfo] = useState({
    squadraCasa: (societa?.nome || '').toUpperCase(),
    squadraOspite: '',
    allenatore: '',
    dirigente: '',
    isNostraCasa: true
  });

  const [giocatori, setGiocatori] = useState([]);

  // Campi per nuovo giocatore
  const [nuovoNome, setNuovoNome] = useState('');
  const [nuovoNumero, setNuovoNumero] = useState('');

  // Modifica inline giocatore
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editNumero, setEditNumero] = useState('');

  // Flag per evitare di riscrivere il DB durante il primo render
  const initialLoadDone = useRef(false);

  // Sincronizza i dati dal Cloud all'avvio o al cambio società
  useEffect(() => {
    const staffSalvato = societa?.staff_base || {};
    const allenatoreBase = (staffSalvato.allenatore || partitaIniziale?.allenatore || '').toUpperCase();
    const dirigenteBase = (staffSalvato.dirigente || partitaIniziale?.dirigente || '').toUpperCase();

    setPartitaInfo(prev => ({
      ...prev,
      squadraCasa: (societa?.nome || '').toUpperCase(),
      squadraOspite: '',
      allenatore: allenatoreBase,
      dirigente: dirigenteBase,
      isNostraCasa: true
    }));

    const rosaPermanente = (rosaIniziale && rosaIniziale.length > 0)
      ? rosaIniziale
      : (societa?.rosa_base && societa.rosa_base.length > 0)
        ? societa.rosa_base
        : [];

    if (rosaPermanente.length > 0) {
      setGiocatori(rosaPermanente.map(g => ({
        ...g,
        nome: (g.nome || '').toUpperCase()
      })));
    } else {
      setGiocatori([]);
    }

    // Abilita la sincronizzazione automatica dopo il caricamento iniziale
    setTimeout(() => {
      initialLoadDone.current = true;
    }, 300);
  }, [societa, partitaIniziale, rosaIniziale]);

  // Funzione helper per sincronizzare subito la rosa su Supabase Cloud
  const sincronizzaRosaCloud = (nuovaListaGiocatori) => {
    if (!societa?.id || !initialLoadDone.current) return;
    salvaRosaBaseSocieta(societa.id, nuovaListaGiocatori, {
      allenatore: partitaInfo.allenatore,
      dirigente: partitaInfo.dirigente
    });
  };

  const invertiCasaTrasferta = () => {
    setPartitaInfo(prev => ({
      ...prev,
      squadraCasa: prev.squadraOspite,
      squadraOspite: prev.squadraCasa,
      isNostraCasa: !prev.isNostraCasa
    }));
  };

  const titolariCount = giocatori.filter(g => g.isTitolare).length;

  const toggleTitolare = (id) => {
    const nuova = giocatori.map(g => {
      if (g.id === id) {
        if (!g.isTitolare && titolariCount >= 11) {
          alert('Hai già selezionato 11 titolari!');
          return g;
        }
        return { ...g, isTitolare: !g.isTitolare };
      }
      return g;
    });
    setGiocatori(nuova);
    sincronizzaRosaCloud(nuova);
  };

  const setCapitano = (id) => {
    const nuova = giocatori.map(g => ({
      ...g,
      isCapitano: g.id === id ? !g.isCapitano : false,
      isVice: g.id === id ? false : g.isVice
    }));
    setGiocatori(nuova);
    sincronizzaRosaCloud(nuova);
  };

  const setViceCapitano = (id) => {
    const nuova = giocatori.map(g => ({
      ...g,
      isVice: g.id === id ? !g.isVice : false,
      isCapitano: g.id === id ? false : g.isCapitano
    }));
    setGiocatori(nuova);
    sincronizzaRosaCloud(nuova);
  };

  // 1. AGGIUNGI GIOCATORE CON SALVATAGGIO IMMEDIATO SUL DB
  const aggiungiGiocatore = (e) => {
    e.preventDefault();
    if (!nuovoNome.trim() || !nuovoNumero.trim()) return;

    const nuovo = {
      id: Date.now().toString(),
      numero: nuovoNumero.trim(),
      nome: nuovoNome.trim().toUpperCase(),
      ruolo: '',
      isTitolare: titolariCount < 11,
      isCapitano: false,
      isVice: false
    };

    const nuovaLista = [...giocatori, nuovo];
    setGiocatori(nuovaLista);
    sincronizzaRosaCloud(nuovaLista);

    setNuovoNome('');
    setNuovoNumero('');
  };

  // 2. RIMUOVI GIOCATORE CON AGGIORNAMENTO IMMEDIATO SUL DB
  const rimuoviGiocatore = (id) => {
    const nuovaLista = giocatori.filter(g => g.id !== id);
    setGiocatori(nuovaLista);
    sincronizzaRosaCloud(nuovaLista);
    if (editingId === id) setEditingId(null);
  };

  const avviaModifica = (g) => {
    setEditingId(g.id);
    setEditNumero(g.numero);
    setEditNome(g.nome);
  };

  // 3. SALVA MODIFICA GIOCATORE CON AGGIORNAMENTO IMMEDIATO SUL DB
  const salvaModifica = (id) => {
    if (!editNome.trim() || !editNumero.trim()) return;
    const nuovaLista = giocatori.map(g => {
      if (g.id === id) {
        return {
          ...g,
          numero: editNumero.trim(),
          nome: editNome.trim().toUpperCase()
        };
      }
      return g;
    });

    setGiocatori(nuovaLista);
    sincronizzaRosaCloud(nuovaLista);
    setEditingId(null);
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
    onConfermaDistinta({ partitaInfo, giocatori });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 bg-slate-900 text-slate-100 rounded-2xl shadow-xl">
      {/* Banner Intestazione con Logo e Società */}
      <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        {societa?.logo_url ? (
          <img
            src={societa.logo_url}
            alt="Logo Società"
            className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/50 shadow-md flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Shield className="w-8 h-8" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-black text-white uppercase">{societa?.nome || 'DISTINTA DI GARA'}</h1>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 uppercase">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            {societa?.indirizzo_campo || 'CAMPO SPORTIVO'}
          </p>
        </div>
      </div>

      {/* Configurazione Partita con Inversione Casa/Fuori */}
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400 uppercase">
            <Shield className="w-5 h-5" /> Partita di Oggi
          </h2>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-950 border border-slate-700 text-slate-300">
            {partitaInfo.isNostraCasa ? '🏠 GIOCHIAMO IN CASA' : '🚌 GIOCHIAMO FUORI CASA'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-9 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="text-xs uppercase text-slate-400 font-semibold block mb-1">
              Squadra Casa {partitaInfo.isNostraCasa && <span className="text-emerald-400">(La Tua Squadra)</span>}
            </label>
            <input
              type="text"
              placeholder="ES. SQUADRA CASA"
              value={partitaInfo.squadraCasa}
              onChange={(e) => setPartitaInfo({ ...partitaInfo, squadraCasa: e.target.value.toUpperCase() })}
              className={`w-full bg-slate-950 border rounded-lg p-2.5 outline-none text-white text-sm uppercase font-semibold ${
                partitaInfo.isNostraCasa ? 'border-emerald-500/50' : 'border-slate-700'
              }`}
            />
          </div>

          <div className="md:col-span-1 flex justify-center pb-0.5">
            <button
              type="button"
              onClick={invertiCasaTrasferta}
              className="p-3 rounded-xl bg-slate-950 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white transition shadow-md flex items-center justify-center gap-1 w-full md:w-auto"
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
              onChange={(e) => setPartitaInfo({ ...partitaInfo, squadraOspite: e.target.value.toUpperCase() })}
              className={`w-full bg-slate-950 border rounded-lg p-2.5 outline-none text-white text-sm uppercase font-semibold ${
                !partitaInfo.isNostraCasa ? 'border-emerald-500/50' : 'border-slate-700'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs uppercase text-slate-400 font-semibold">Allenatore</label>
            <input
              type="text"
              placeholder="ES. MARIO ROSSI"
              value={partitaInfo.allenatore}
              onChange={(e) => setPartitaInfo({ ...partitaInfo, allenatore: e.target.value.toUpperCase() })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-400 font-semibold">Dirigente Accompagnatore</label>
            <input
              type="text"
              placeholder="ES. LUIGI BIANCHI"
              value={partitaInfo.dirigente}
              onChange={(e) => setPartitaInfo({ ...partitaInfo, dirigente: e.target.value.toUpperCase() })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm uppercase font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Form Aggiunta Rapida */}
      <form onSubmit={aggiungiGiocatore} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-wrap gap-3 items-end">
        <div className="w-24">
          <label className="text-xs text-slate-400 uppercase font-semibold">N° Maglia</label>
          <input
            type="number"
            placeholder="10"
            value={nuovoNumero}
            onChange={(e) => setNuovoNumero(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-bold text-center text-sm"
            required
          />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs text-slate-400 uppercase font-semibold">Nome e Cognome Giocatore</label>
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
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-1.5 transition text-sm shadow-md uppercase"
        >
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </form>

      {/* Elenco Rosa Giocatori */}
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
              <Users className="w-5 h-5 text-blue-400" /> Rosa Giocatori ({giocatori.length})
            </h2>
            <p className="text-[11px] text-emerald-400 mt-0.5">● Sincronizzata in tempo reale sul cloud</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${titolariCount === 11 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
            Titolari: {titolariCount} / 11
          </span>
        </div>

        {giocatori.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-700 rounded-xl uppercase">
            Nessun giocatore registrato per questa società. Aggiungili dal form in alto.
          </div>
        ) : (
          <div className="divide-y divide-slate-700 max-h-[480px] overflow-y-auto">
            {giocatori.map((g) => {
              const inModifica = editingId === g.id;

              return (
                <div key={g.id} className="py-2.5 flex items-center justify-between gap-2">
                  {inModifica ? (
                    <div className="flex-1 flex items-center gap-2">
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
                        className="flex-1 bg-slate-950 border border-emerald-500 rounded p-1.5 text-sm font-bold text-white uppercase"
                        placeholder="NOME GIOCATORE"
                      />
                      <button
                        type="button"
                        onClick={() => salvaModifica(g.id)}
                        className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                        title="Salva nel database"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={annullaModifica}
                        className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                        title="Annulla"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-sm text-emerald-400">
                          {g.numero}
                        </span>
                        <span className="font-semibold text-white text-sm uppercase">{g.nome}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => avviaModifica(g)}
                          className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-amber-400 transition"
                          title="Modifica Numero o Nome"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleTitolare(g.id)}
                          className={`px-2.5 py-1 text-xs font-bold rounded transition uppercase ${
                            g.isTitolare ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {g.isTitolare ? 'TITOLARE' : 'PANCHINA'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setCapitano(g.id)}
                          className={`p-1.5 rounded text-xs font-bold ${
                            g.isCapitano ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                          title="Capitano"
                        >
                          C
                        </button>

                        <button
                          type="button"
                          onClick={() => setViceCapitano(g.id)}
                          className={`p-1.5 rounded text-xs font-bold ${
                            g.isVice ? 'bg-sky-500 text-black' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                          title="Vice Capitano"
                        >
                          VC
                        </button>

                        <button
                          type="button"
                          onClick={() => rimuoviGiocatore(g.id)}
                          className="p-1.5 rounded bg-slate-700 text-rose-400 hover:bg-rose-950 transition"
                          title="Rimuovi ed elimina dal database"
                        >
                          <Trash2 className="w-4 h-4" />
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
