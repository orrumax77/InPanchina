import React, { useState, useEffect } from 'react';
import { adminCreaSquadra, adminCreaUtente, adminGetUtentiSocieta, getSocieta } from '../services/db';
import { Shield, Plus, Users, Image as ImageIcon, ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';

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

  const [messaggio, setMessaggio] = useState('');

  const ricaricaDati = async () => {
    const list = await getSocieta();
    setSocietaList(list);
  };

  useEffect(() => {
    ricaricaDati();
  }, []);

  useEffect(() => {
    if (societaSelezionata) {
      adminGetUtentiSocieta(societaSelezionata.id).then(setUtentiSocieta);
    }
  }, [societaSelezionata]);

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

      {/* 1. SELEZIONA O ACCEDI A QUALSIASI SQUADRA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" /> Squadre Registrate & Accesso Diretto
        </h2>

        <div>
          <label className="text-xs text-slate-400 uppercase font-semibold">Scegli una Squadra:</label>
          <select
            value={societaSelezionata?.id || ''}
            onChange={(e) => setSocietaSelezionata(societaList.find(s => s.id === e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm mt-1"
          >
            <option value="">-- Seleziona una squadra --</option>
            {societaList.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome} ({s.codice_societa || s.id})
              </option>
            ))}
          </select>
        </div>

        {societaSelezionata && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {societaSelezionata.logo_url && (
                <img src={societaSelezionata.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-slate-700" />
              )}
              <div>
                <h4 className="font-bold text-white text-sm">{societaSelezionata.nome}</h4>
                <p className="text-xs text-slate-400">Scadenza prova: {new Date(societaSelezionata.data_scadenza_prova).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Tasto per entrare direttamente ovunque */}
            <button
              onClick={() => onSelezionaSquadraDaAdmin(societaSelezionata)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Entra in Panchina come questa Squadra
            </button>
          </div>
        )}

        {/* Creazione Utenti per la squadra selezionata */}
        {societaSelezionata && (
          <div className="pt-3 border-t border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-400">Abilita Dirigente per {societaSelezionata.nome}:</h4>
            <form onSubmit={handleCreaUtente} className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-end">
              <div>
                <label className="text-xs text-slate-400">Username</label>
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
                <label className="text-xs text-slate-400">Password</label>
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
                <Plus className="w-4 h-4" /> Crea Utente
              </button>
            </form>

            <div className="space-y-1.5 pt-1">
              {utentiSocieta.map(u => (
                <div key={u.id} className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white">Utente: {u.username}</span>
                    <span className="text-slate-400 ml-3">Password: <code className="text-emerald-400 font-mono">{u.password_chiaro}</code></span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-semibold">{u.stagione}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. REGISTRA NUOVA SQUADRA (TRIAL 30 GG) */}
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
