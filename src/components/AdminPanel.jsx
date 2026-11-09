import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient'; // Assicurati che il percorso del client supabase sia corretto
import { 
  getSocieta, 
  adminCreaSquadra, 
  adminCreaUtente, 
  adminGetUtentiSocieta, 
  adminAggiornaStatoSocieta, 
  adminEliminaSocietaCompleta, 
  adminEliminaUtente, 
  adminModificaPasswordUtente 
} from '../services/db';
import { 
  Shield, 
  Plus, 
  Users, 
  Trash2, 
  Key, 
  Lock, 
  Unlock, 
  Calendar, 
  ExternalLink, 
  LogOut, 
  CheckCircle2, 
  Copy, 
  Check, 
  Pencil, 
  MapPin, 
  X,
  Upload
} from 'lucide-react';

export default function AdminPanel({ onEsci, onSelezionaSquadraDaAdmin }) {
  const [societaList, setSocietaList] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [notifica, setNotifica] = useState('');

  // Form Creazione Squadra
  const [nuovoCodice, setNuovoCodice] = useState('');
  const [nuovoNome, setNuovoNome] = useState('');
  const [nuovoIndirizzo, setNuovoIndirizzo] = useState('');
  const [nuovoLogo, setNuovoLogo] = useState('');
  const fileInputRef = useRef(null);

  // Modal Gestione Credenziali e Utenti
  const [squadraSelezionata, setSquadraSelezionata] = useState(null);
  const [utentiSquadra, setUtentiSquadra] = useState([]);
  const [nuovoUsername, setNuovoUsername] = useState('');
  const [nuovaPassword, setNuovaPassword] = useState('');
  const [copiatoId, setCopiatoId] = useState(null);

  // Modifica password rapida
  const [modificaPassId, setModificaPassId] = useState(null);
  const [tempPass, setTempPass] = useState('');

  // NUOVI STATI PER LA MODIFICA SOCIETÀ DALL'ADMIN PANEL
  const [societaInModifica, setSocietaInModifica] = useState(null);
  const [formModificaSocieta, setFormModificaSocieta] = useState({
    nome: '',
    indirizzo_campo: '',
    logo_url: ''
  });
  const editLogoInputRef = useRef(null);

  const mostraNotifica = (msg) => {
    setNotifica(msg);
    setTimeout(() => setNotifica(''), 3000);
  };

  const caricaDati = async () => {
    setCaricamento(true);
    const lista = await getSocieta();
    setSocietaList(lista);
    setCaricamento(false);
  };

  useEffect(() => {
    caricaDati();
  }, []);

  // Upload logo da dispositivo in Base64 compresso (Nuova Squadra)
  const handleCaricaLogoDaDispositivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido (PNG, JPG, WEBP, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64Compresso = canvas.toDataURL('image/png', 0.85);
        setNuovoLogo(base64Compresso);
        mostraNotifica('Logo caricato dal dispositivo!');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Upload logo da dispositivo in Base64 compresso (Modifica Società Esistente)
  const handleCaricaLogoModificaDaDispositivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido (PNG, JPG, WEBP, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64Compresso = canvas.toDataURL('image/png', 0.85);
        setFormModificaSocieta(prev => ({ ...prev, logo_url: base64Compresso }));
        mostraNotifica('Logo aggiornato!');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCreaSquadra = async (e) => {
    e.preventDefault();
    if (!nuovoCodice.trim() || !nuovoNome.trim()) return;

    try {
      await adminCreaSquadra({
        codice: nuovoCodice,
        nome: nuovoNome,
        indirizzoCampo: nuovoIndirizzo,
        logoUrl: nuovoLogo
      });
      setNuovoCodice('');
      setNuovoNome('');
      setNuovoIndirizzo('');
      setNuovoLogo('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      mostraNotifica('Squadra creata con successo!');
      await caricaDati();
    } catch (err) {
      alert('Errore nella creazione squadra: ' + err.message);
    }
  };

  // Apertura modale di modifica dati società
  const apriModificaSocieta = (soc) => {
    setSocietaInModifica(soc);
    setFormModificaSocieta({
      nome: soc.nome || '',
      indirizzo_campo: soc.indirizzo_campo || '',
      logo_url: soc.logo_url || ''
    });
  };

  // Salvataggio modifiche società su Supabase
  const handleSalvaModificaSocieta = async (e) => {
    e.preventDefault();
    if (!societaInModifica?.id) return;

    try {
      const { error } = await supabase
        .from('societa')
        .update({
          nome: formModificaSocieta.nome.toUpperCase(),
          indirizzo_campo: formModificaSocieta.indirizzo_campo.toUpperCase(),
          logo_url: formModificaSocieta.logo_url
        })
        .eq('id', societaInModifica.id);

      if (error) throw error;

      setSocietaInModifica(null);
      mostraNotifica('Dati società aggiornati con successo!');
      await caricaDati();
    } catch (err) {
      alert("Errore durante l'aggiornamento della società: " + err.message);
    }
  };

  const apriGestioneUtenti = async (soc) => {
    setSquadraSelezionata(soc);
    const utenti = await adminGetUtentiSocieta(soc.id);
    setUtentiSquadra(utenti);
    setNuovoUsername('');
    setNuovaPassword('');
  };

  const handleCreaUtente = async (e) => {
    e.preventDefault();
    if (!nuovoUsername.trim() || !nuovaPassword.trim()) return;

    try {
      await adminCreaUtente({
        societaId: squadraSelezionata.id,
        username: nuovoUsername.trim(),
        password: nuovaPassword.trim(),
        ruolo: 'dirigente'
      });
      setNuovoUsername('');
      setNuovaPassword('');
      const utenti = await adminGetUtentiSocieta(squadraSelezionata.id);
      setUtentiSquadra(utenti);
      mostraNotifica('Utente dirigente creato con successo!');
    } catch (err) {
      alert("Errore nella creazione dell'utente: " + err.message);
    }
  };

  const handleToggleAttiva = async (soc) => {
    try {
      await adminAggiornaStatoSocieta(soc.id, { attiva: !soc.attiva });
      await caricaDati();
      mostraNotifica(`Stato squadra ${soc.attiva ? 'bloccata' : 'attivata'}!`);
    } catch (err) {
      alert('Errore aggiornamento stato: ' + err.message);
    }
  };

  const handleProroga30Giorni = async (soc) => {
    try {
      const dataAttuale = new Date(soc.data_scadenza_prova || new Date());
      const nuovaData = new Date(Math.max(dataAttuale.getTime(), Date.now()));
      nuovaData.setDate(nuovaData.getDate() + 30);

      await adminAggiornaStatoSocieta(soc.id, { 
        attiva: true, 
        dataScadenza: nuovaData.toISOString() 
      });
      await caricaDati();
      mostraNotifica('Licenza prorogata di 30 giorni!');
    } catch (err) {
      alert('Errore proroga licenza: ' + err.message);
    }
  };

  const handleEliminaSquadra = async (soc) => {
    const conferma = window.confirm(`Sei sicuro di voler eliminare DEFINITIVAMENTE la società "${soc.nome}" e tutti i suoi utenti/dati? L'operazione non è reversibile!`);
    if (!conferma) return;

    try {
      await adminEliminaSocietaCompleta(soc.id);
      await caricaDati();
      mostraNotifica('Società eliminata dal database.');
    } catch (err) {
      alert("Errore durante l'eliminazione: " + err.message);
    }
  };

  const handleEliminaUtente = async (utenteId) => {
    if (!window.confirm("Vuoi revocare l'accesso a questo utente?")) return;
    try {
      await adminEliminaUtente(utenteId);
      const utenti = await adminGetUtentiSocieta(squadraSelezionata.id);
      setUtentiSquadra(utenti);
      mostraNotifica('Utente eliminato.');
    } catch (err) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  const handleSalvaNuovaPassword = async (utenteId) => {
    if (!tempPass.trim()) return;
    try {
      await adminModificaPasswordUtente(utenteId, tempPass.trim());
      setModificaPassId(null);
      setTempPass('');
      const utenti = await adminGetUtentiSocieta(squadraSelezionata.id);
      setUtentiSquadra(utenti);
      mostraNotifica('Password aggiornata con successo!');
    } catch (err) {
      alert('Errore aggiornamento password: ' + err.message);
    }
  };

  const copiaCredenziali = (u) => {
    const testo = `⚽ CREDENZIALI INPANCHINA\nSocietà: ${squadraSelezionata?.nome}\nUsername: ${u.username}\nPassword: ${u.password_chiaro}`;
    navigator.clipboard.writeText(testo);
    setCopiatoId(u.id);
    setTimeout(() => setCopiatoId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 px-2 sm:px-4 pb-12">
      {/* Header SuperAdmin */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 flex-shrink-0">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-tight leading-tight">
              Gestione Squadre & Credenziali Dirigenti
            </h1>
            <p className="text-xs text-slate-400">Pannello Amministratore Globale InPanchina</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
          <span className="text-xs font-mono font-bold bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> SuperAdmin
          </span>
          <button
            type="button"
            onClick={onEsci}
            className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[40px]"
          >
            <LogOut className="w-3.5 h-3.5" /> Esci
          </button>
        </div>
      </div>

      {notifica && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {notifica}
        </div>
      )}

      {/* Form Creazione Nuova Squadra */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-black text-white uppercase flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" /> Registra Nuova Squadra / Società
        </h2>

        <form onSubmit={handleCreaSquadra} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Codice Identificativo</label>
            <input
              type="text"
              placeholder="ES. US-AURORA"
              value={nuovoCodice}
              onChange={(e) => setNuovoCodice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white uppercase font-bold outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Nome Società</label>
            <input
              type="text"
              placeholder="ES. U.S. AURORA CALCIO"
              value={nuovoNome}
              onChange={(e) => setNuovoNome(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white uppercase font-bold outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Indirizzo Campo</label>
            <input
              type="text"
              placeholder="ES. VIA DELLO SPORT 1, COMO"
              value={nuovoIndirizzo}
              onChange={(e) => setNuovoIndirizzo(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white uppercase font-medium outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Logo Società</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCaricaLogoDaDispositivo}
                className="hidden"
                id="upload-logo-file"
              />

              <label
                htmlFor="upload-logo-file"
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition min-h-[44px]"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Carica da Dispositivo</span>
              </label>

              {nuovoLogo && (
                <div className="relative flex-shrink-0">
                  <img
                    src={nuovoLogo}
                    alt="Anteprima Logo"
                    className="w-11 h-11 rounded-xl object-cover border-2 border-emerald-500/50 bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNuovoLogo('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white p-0.5 rounded-full hover:bg-rose-500"
                    title="Rimuovi logo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950 cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Aggiungi Società Sportiva
            </button>
          </div>
        </form>
      </div>

      {/* Lista Società */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-black text-white uppercase flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Società Iscritte ({societaList.length})
          </h2>
        </div>

        {caricamento ? (
          <div className="text-center py-10 text-xs text-slate-500 uppercase animate-pulse">
            Caricamento elenco squadre...
          </div>
        ) : societaList.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 uppercase">
            Nessuna società ancora inserita.
          </div>
        ) : (
          <div className="space-y-4">
            {societaList.map((soc) => {
              const scadenza = new Date(soc.data_scadenza_prova);
              const isScaduta = new Date() > scadenza || !soc.attiva;
              const dataFormatted = soc.data_scadenza_prova ? scadenza.toLocaleDateString('it-IT') : 'N/D';

              return (
                <div 
                  key={soc.id}
                  className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {soc.logo_url ? (
                      <img 
                        src={soc.logo_url} 
                        alt="Logo" 
                        className="w-12 h-12 rounded-full object-cover border border-slate-700 flex-shrink-0 mt-0.5 bg-slate-900" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                        <Shield className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-white uppercase truncate">{soc.nome}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                          {soc.codice_societa || soc.id}
                        </span>

                        {/* PULSANTE MODIFICA RAPIDA DATI SOCIETÀ */}
                        <button
                          type="button"
                          onClick={() => apriModificaSocieta(soc)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Modifica dati società"
                        >
                          <Pencil className="w-3 h-3" /> Modifica
                        </button>
                      </div>

                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate uppercase">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        {soc.indirizzo_campo || 'Campo non impostato'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          !isScaduta 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          {!isScaduta ? 'Licenza Attiva' : 'Licenza Scaduta / Bloccata'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" /> Scadenza: {dataFormatted}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pulsantiera Azioni */}
                  <div className="flex flex-col sm:grid sm:grid-cols-2 xl:flex xl:flex-row items-stretch xl:items-center gap-2 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-800/80 w-full xl:w-auto">
                    <div className="grid grid-cols-2 gap-2 sm:contents">
                      <button
                        type="button"
                        onClick={() => apriGestioneUtenti(soc)}
                        className="px-3.5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition min-h-[44px] cursor-pointer"
                        title="Gestisci credenziali dirigenti"
                      >
                        <Key className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span>Credenziali</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelezionaSquadraDaAdmin(soc)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition min-h-[44px] shadow-md shadow-emerald-950 cursor-pointer"
                        title="Entra nella panchina live della società"
                      >
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        <span>Entra Live</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:contents">
                      <button
                        type="button"
                        onClick={() => handleProroga30Giorni(soc)}
                        className="px-3 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600 border border-amber-500/30 text-amber-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition min-h-[44px] cursor-pointer"
                        title="Rinnova di 30 giorni la prova"
                      >
                        <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>+30 Giorni</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleAttiva(soc)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition min-h-[44px] border cursor-pointer ${
                          soc.attiva 
                            ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700' 
                            : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-500/40'
                        }`}
                        title={soc.attiva ? 'Blocca accesso società' : 'Sblocca accesso società'}
                      >
                        {soc.attiva ? <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <Unlock className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        <span>{soc.attiva ? 'Blocca' : 'Attiva'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEliminaSquadra(soc)}
                      className="w-full sm:col-span-2 xl:w-auto px-3.5 py-2.5 rounded-xl text-rose-400 hover:text-white bg-slate-900 hover:bg-rose-950 border border-rose-900/40 transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer font-bold text-xs"
                      title="Elimina società e tutti i dati"
                    >
                      <Trash2 className="w-4 h-4 flex-shrink-0" />
                      <span className="xl:hidden">Elimina Società</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE MODIFICA DATI SOCIETÀ */}
      {societaInModifica && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm sm:text-base font-black text-white uppercase flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-400" /> Modifica Dati Società
              </h3>
              <button
                type="button"
                onClick={() => setSocietaInModifica(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvaModificaSocieta} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nome Società</label>
                <input
                  type="text"
                  value={formModificaSocieta.nome}
                  onChange={(e) => setFormModificaSocieta(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white uppercase font-bold outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Indirizzo Campo Sportivo</label>
                <input
                  type="text"
                  value={formModificaSocieta.indirizzo_campo}
                  onChange={(e) => setFormModificaSocieta(prev => ({ ...prev, indirizzo_campo: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white uppercase font-medium outline-none focus:border-amber-500"
                  placeholder="ES. VIA ROMA 1, MILANO"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Logo Società</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={editLogoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCaricaLogoModificaDaDispositivo}
                    className="hidden"
                    id="edit-upload-logo-file"
                  />
                  <label
                    htmlFor="edit-upload-logo-file"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 hover:border-amber-500 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition min-h-[44px]"
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Cambia Logo</span>
                  </label>

                  {formModificaSocieta.logo_url && (
                    <div className="relative flex-shrink-0">
                      <img
                        src={formModificaSocieta.logo_url}
                        alt="Logo Attuale"
                        className="w-11 h-11 rounded-xl object-cover border-2 border-amber-500/50 bg-slate-950"
                      />
                      <button
                        type="button"
                        onClick={() => setFormModificaSocieta(prev => ({ ...prev, logo_url: '' }))}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white p-0.5 rounded-full hover:bg-rose-500"
                        title="Rimuovi logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSocietaInModifica(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-amber-950 cursor-pointer"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTIONE CREDENZIALI */}
      {squadraSelezionata && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-black text-white uppercase flex items-center gap-2 truncate">
                  <Key className="w-4 h-4 text-blue-400 flex-shrink-0" /> Credenziali Dirigenti
                </h3>
                <p className="text-xs text-slate-400 uppercase truncate">
                  Società: {squadraSelezionata.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSquadraSelezionata(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex-shrink-0"
                title="Chiudi finestra"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Aggiunta Nuovo Utente */}
            <form onSubmit={handleCreaUtente} className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" /> Rilascia Nuovo Profilo Dirigente
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Username Accesso</label>
                  <input
                    type="text"
                    placeholder="mister.aurora"
                    value={nuovoUsername}
                    onChange={(e) => setNuovoUsername(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-medium outline-none focus:border-blue-500 normal-case"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Password</label>
                  <input
                    type="text"
                    placeholder="Aurora_2026!"
                    value={nuovaPassword}
                    onChange={(e) => setNuovaPassword(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono outline-none focus:border-blue-500 normal-case"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase transition tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-950 min-h-[44px]"
              >
                <Plus className="w-4 h-4" /> Crea Profilo di Accesso
              </button>
            </form>

            {/* Elenco Utenti */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center justify-between">
                <span>Account Configurati ({utentiSquadra.length})</span>
                <span className="text-[10px] text-slate-500">Credenziali in chiaro (case-sensitive)</span>
              </h4>

              {utentiSquadra.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 uppercase bg-slate-950 rounded-xl border border-dashed border-slate-800">
                  Nessun profilo utente associato. Creane uno per consentire l'accesso al dirigente.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {utentiSquadra.map((u) => {
                    const inModifica = modificaPassId === u.id;

                    return (
                      <div 
                        key={u.id}
                        className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="font-bold text-white normal-case font-mono truncate text-sm">
                            {u.username}
                          </div>
                           
                          {inModifica ? (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                value={tempPass}
                                onChange={(e) => setTempPass(e.target.value)}
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck="false"
                                className="bg-slate-900 border border-emerald-500 text-white font-mono px-2.5 py-1.5 rounded-lg text-xs outline-none w-36 normal-case"
                                placeholder="Nuova password"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSalvaNuovaPassword(u.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                              >
                                Salva
                              </button>
                              <button
                                type="button"
                                onClick={() => setModificaPassId(null)}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
                              <span>Password: <strong className="normal-case">{u.password_chiaro}</strong></span>
                              <button
                                type="button"
                                onClick={() => {
                                  setModificaPassId(u.id);
                                  setTempPass(u.password_chiaro);
                                }}
                                className="text-slate-500 hover:text-amber-400 p-1 rounded cursor-pointer"
                                title="Cambia password"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Pulsanti Azione Utente */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                          <button
                            type="button"
                            onClick={() => copiaCredenziali(u)}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition min-h-[40px] cursor-pointer"
                          >
                            {copiatoId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiatoId === u.id ? 'Copiato!' : 'Copia'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEliminaUtente(u.id)}
                            className="px-3 py-2 rounded-xl text-rose-400 hover:text-white bg-slate-900 hover:bg-rose-950/60 border border-rose-900/40 transition flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer font-bold"
                            title="Elimina utente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="sm:hidden">Elimina</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
