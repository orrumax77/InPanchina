import React, { useState, useEffect } from 'react';
import { 
  adminCreaSquadra, 
  adminCreaUtente, 
  adminGetUtentiSocieta, 
  getSocieta, 
  adminAggiornaStatoSocieta,
  adminEliminaSocietaCompleta,
  adminEliminaUtente,
  adminModificaPasswordUtente
} from '../services/db';
import { 
  Shield, 
  Plus, 
  Users, 
  Image as ImageIcon, 
  ArrowLeft, 
  CheckCircle2, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Infinity as InfinityIcon, 
  Calendar,
  Trash2,
  KeyRound,
  X
} from 'lucide-react';

export default function AdminPanel({ onEsci, onSelezionaSquadraDaAdmin }) {
  const [societaList, setSocietaList] = useState([]);
  const [societaSelezionata, setSocietaSelezionata] = useState(null);
  const [utentiSocieta, setUtentiSocieta] = useState([]);

  // Form Nuova Squadra
  const [codice, setCodice] = useState('');
  const [nome, setNome] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [logoBase64, setLogoBase64] = useState('');

  // Form Nuovo Utente
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ruolo, setRuolo] = useState('dirigente');
  const [stagione, setStagione] = useState('2026/2027');

  // Modale Modifica Password
  const [modalPasswordUtente, setModalPasswordUtente] = useState(null);
  const [nuovaPasswordInput, setNuovaPasswordInput] = useState('');

  const [messaggio, setMessaggio] = useState('');

  const ricaricaDati = async () => {
    const list = await getSocieta();
    setSocietaList(list);
    if (societaSelezionata) {
      const aggiornata = list.find(s => s.id === societaSelezionata.id);
      if (aggiornata) setSocietaSelezionata(aggiornata);
    }
  };

  useEffect(() => {
    ricaricaDati();
  }, []);

  useEffect(() => {
    if (societaSelezionata) {
      adminGetUtentiSocieta(societaSelezionata.id).then(setUtentiSocieta);
    } else {
      setUtentiSocieta([]);
    }
  }, [societaSelezionata]);

  // CANCELLAZIONE COMPLETA SQUADRA
  const handleEliminaSquadra = async () => {
    if (!societaSelezionata) return;
    const conferma = window.prompt(
      `ATTENZIONE: Stai per eliminare ${societaSelezionata.nome} e TUTTI i suoi dati (giocatori, partite, referti, cronologie e dirigenti associati).\n\nPer confermare, scrivi il nome della società: "${societaSelezionata.nome}"`
    );

    if (conferma !== societaSelezionata.nome) {
      alert("Eliminazione annullata: il nome inserito non corrisponde.");
      return;
    }

    try {
      await adminEliminaSocietaCompleta(societaSelezionata.id);
      setMessaggio(`Squadra ${societaSelezionata.nome} eliminata definitivamente con tutto il suo archivio.`);
      setSocietaSelezionata(null);
      ricaricaDati();
    } catch (err) {
      alert("Errore durante l'eliminazione della società.");
    }
  };

  // CANCELLAZIONE SINGOLO DIRIGENTE
  const handleEliminaUtente = async (u) => {
    if (!window.confirm(`Vuoi rimuovere l'accesso per l'utente "${u.username}"?`)) return;
    try {
      await adminEliminaUtente(u.id);
      setMessaggio(`Utente ${u.username} rimosso con successo.`);
      const lista = await adminGetUtentiSocieta(societaSelezionata.id);
      setUtentiSocieta(lista);
    } catch {
      alert("Errore durante l'eliminazione dell'utente.");
    }
  };

  // MODIFICA PASSWORD UTENTE
  const handleSalvaNuovaPassword = async (e) => {
    e.preventDefault();
    if (!nuovaPasswordInput.trim()) return;
    try {
      await adminModificaPasswordUtente(modalPasswordUtente.id, nuovaPasswordInput);
      setMessaggio(`Password aggiornata per l'utente ${modalPasswordUtente.username}!`);
      setModalPasswordUtente(null);
      setNuovaPasswordInput('');
      const lista = await adminGetUtentiSocieta(societaSelezionata.id);
      setUtentiSocieta(lista);
    } catch {
      alert("Errore durante l'aggiornamento della password.");
    }
  };

  // GESTIONE STATO / SBLOCCO SQUADRA
  const handleSbloccaIllimitato = async () => {
    try {
      const data2099 = new Date('2099-12-31T23:59:59Z').toISOString();
      const aggiornata = await adminAggiornaStatoSocieta(societaSelezionata.id, {
        attiva: true,
        dataScadenza: data2099
      });
      setSocietaSelezionata(aggiornata);
      setMessaggio(`Accesso ILLIMITATO attivato per ${aggiornata.nome}!`);
      ricaricaDati();
    } catch {
      alert("Errore durante l'aggiornamento.");
    }
  };

  const handleProroga30Giorni = async () => {
    try {
      const nuovaData = new Date();
      nuovaData.setDate(nuovaData.getDate() + 30);
      const aggiornata = await adminAggiornaStatoSocieta(societaSelezionata.id, {
        attiva: true,
        dataScadenza: nuovaData.toISOString()
      });
      setSocietaSelezionata(aggiornata);
      setMessaggio(`Proroga di 30 giorni applicata a ${aggiornata.nome}!`);
      ricaricaDati();
    } catch {
      alert("Errore durante l'aggiornamento.");
    }
  };

  const handleBloccaSquadra = async () => {
    if (!window.confirm(`Sei sicuro di voler bloccare l'accesso per ${societaSelezionata.nome}?`)) return;
    try {
      const aggiornata = await adminAggiornaStatoSocieta(societaSelezionata.id, {
        attiva: false
      });
      setSocietaSelezionata(aggiornata);
      setMessaggio(`Accesso BLOCCATO per ${aggiornata.nome}. I dirigenti non potranno accedere.`);
      ricaricaDati();
    } catch {
      alert("Errore durante l'aggiornamento.");
    }
  };

  const handleCaricaLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        setLogoBase64(canvas.toDataURL('image/png'));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCreaSquadra = async (e) => {
    e.preventDefault();
    if (!codice || !nome) return;
    try {
      const nuova = await adminCreaSquadra({
        codice,
        nome,
        indirizzoCampo: indirizzo,
        logoUrl: logoBase64
      });
      setMessaggio(`Squadra ${nuova.nome} registrata con 30 giorni di prova!`);
      setCodice('');
      setNome('');
      setIndirizzo('');
      setLogoBase64('');
      ricaricaDati();
      setSocietaSelezionata(nuova);
    } catch {
      alert('Errore: Codice società già esistente.');
    }
  };

  const handleCreaUtente = async (e) => {
    e.preventDefault();
    if (!username || !password || !societaSelezionata) return;
    try {
      await adminCreaUtente({
        societaId: societaSelezionata.id,
        username,
        password,
        ruolo,
        stagione
      });
      setMessaggio(`Utente ${username} creato per ${societaSelezionata.nome}!`);
      setUsername('');
      setPassword('');
      const u = await adminGetUtentiSocieta(societaSelezionata.id);
      setUtentiSocieta(u);
    } catch {
      alert('Errore: Username già utilizzato.');
    }
  };

  const isIllimitata = (scadenza) => {
    return new Date(scadenza).getFullYear() >= 2090;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <button
          onClick={onEsci}
          className="text-xs uppercase font-bold text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Disconnetti Admin
        </button>
        <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
          SuperAdmin Globale
        </span>
      </div>

      {messaggio && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {messaggio}
        </div>
      )}

      {/* 1. SELEZIONE SQUADRA E GESTIONE INTEGRALE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" /> Gestione Squadre & Credenziali Dirigenti
        </h2>

        <div>
          <label className="text-xs text-slate-400 uppercase font-semibold">Scegli una Squadra:</label>
          <select
            value={societaSelezionata?.id || ''}
            onChange={(e) => setSocietaSelezionata(societaList.find(s => s.id === e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm mt-1"
          >
            <option value="">-- Seleziona una squadra da gestire --</option>
            {societaList.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome} ({s.codice_societa || s.id}) - {s.attiva ? 'ATTIVA' : 'BLOCCATA'}
              </option>
            ))}
          </select>
        </div>

        {societaSelezionata && (
          <div className="space-y-4">
            {/* Scheda Riepilogo Stato Squadra */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {societaSelezionata.logo_url && (
                    <img src={societaSelezionata.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover border border-slate-700" />
                  )}
                  <div>
                    <h4 className="font-bold text-white text-base">{societaSelezionata.nome}</h4>
                    <p className="text-xs text-slate-400">Codice: {societaSelezionata.codice_societa || societaSelezionata.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                    societaSelezionata.attiva 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {societaSelezionata.attiva ? '● Attiva' : '✕ Bloccata'}
                  </span>

                  <span className="px-2.5 py-1 rounded bg-slate-800 text-xs font-semibold text-slate-300">
                    {isIllimitata(societaSelezionata.data_scadenza_prova)
                      ? 'Licenza: Illimitata'
                      : `Scadenza: ${new Date(societaSelezionata.data_scadenza_prova).toLocaleDateString()}`}
                  </span>
                </div>
              </div>

              {/* PULSANTI CONTROLLO E AZIONI SULLA SQUADRA */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSbloccaIllimitato}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <InfinityIcon className="w-4 h-4" /> Sblocca Illimitata
                </button>

                <button
                  type="button"
                  onClick={handleProroga30Giorni}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Calendar className="w-4 h-4 text-emerald-400" /> +30 Giorni
                </button>

                {societaSelezionata.attiva ? (
                  <button
                    type="button"
                    onClick={handleBloccaSquadra}
                    className="bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Lock className="w-4 h-4" /> Blocca
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProroga30Giorni}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Unlock className="w-4 h-4" /> Sblocca
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSelezionaSquadraDaAdmin(societaSelezionata)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-4 h-4" /> Entra in Panchina
                </button>

                {/* PULSANTE ELIMINAZIONE TOTALE DELLA SQUADRA */}
                <button
                  type="button"
                  onClick={handleEliminaSquadra}
                  className="ml-auto bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/40 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" /> Elimina Squadra Definitivamente
                </button>
              </div>
            </div>

            {/* GESTIONE UTENTI DELLA SQUADRA */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-400">Dirigenti Abilitati per {societaSelezionata.nome}:</h4>

              {/* Elenco Utenti con Modifica Password ed Eliminazione */}
              <div className="space-y-1.5">
                {utentiSocieta.length === 0 ? (
                  <p className="text-xs text-slate-500">Nessun dirigente configurato per questa squadra.</p>
                ) : (
                  utentiSocieta.map(u => (
                    <div key={u.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-white">{u.username}</span>
                        <span className="text-slate-400 ml-3">Password: <code className="text-emerald-400 font-mono">{u.password_chiaro}</code></span>
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 font-semibold">{u.stagione}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setModalPasswordUtente(u);
                            setNuovaPasswordInput(u.password_chiaro || '');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 font-semibold"
                          title="Modifica Password"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Cambia Password
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEliminaUtente(u)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                          title="Elimina Dirigente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Form Aggiunta Nuovo Dirigente */}
              <form onSubmit={handleCreaUtente} className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-end pt-2">
                <div>
                  <label className="text-xs text-slate-400">Nuovo Username</label>
                  <input
                    type="text"
                    placeholder="es. mister_rossi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Password Assegnata</label>
                  <input
                    type="text"
                    placeholder="es. Pass2026!"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Stagione</label>
                  <select
                    value={stagione}
                    onChange={(e) => setStagione(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm"
                  >
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2.5 rounded-lg text-sm flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Aggiungi Dirigente
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* POPUP MODALE MODIFICA PASSWORD DIRIGENTE */}
      {modalPasswordUtente && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSalvaNuovaPassword} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <KeyRound className="w-4 h-4 text-amber-400" /> Nuova Password per {modalPasswordUtente.username}
              </h3>
              <button type="button" onClick={() => setModalPasswordUtente(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Inserisci la nuova password:</label>
              <input
                type="text"
                value={nuovaPasswordInput}
                onChange={(e) => setNuovaPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm mt-1 outline-none font-mono"
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalPasswordUtente(null)}
                className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                Salva Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. REGISTRAZIONE NUOVA SQUADRA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" /> Registra Nuova Squadra (Prova 30 Giorni)
        </h2>

        <form onSubmit={handleCreaSquadra} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Codice Società</label>
            <input
              type="text"
              placeholder="es. FULGOR_2026"
              value={codice}
              onChange={(e) => setCodice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white uppercase text-sm mt-1"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Nome Società</label>
            <input
              type="text"
              placeholder="es. ASD Fulgor Calcio"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm mt-1"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Indirizzo Campo</label>
            <input
              type="text"
              placeholder="es. Via dello Sport 12, Milano"
              value={indirizzo}
              onChange={(e) => setIndirizzo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold block mb-1">Logo Squadra</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg p-2 flex items-center justify-center gap-2 text-xs text-slate-300">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>{logoBase64 ? 'Cambia Immagine' : 'Carica Logo (File)'}</span>
                <input type="file" accept="image/*" onChange={handleCaricaLogo} className="hidden" />
              </label>
              {logoBase64 && (
                <div className="w-10 h-10 rounded-full border border-slate-700 overflow-hidden bg-slate-950 flex-shrink-0">
                  <img src={logoBase64} alt="Logo" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition text-sm"
            >
              <Plus className="w-4 h-4" /> Attiva Squadra (Inizia Prova 30 Giorni)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
