import React, { useState, useEffect } from 'react';
import { adminCreaSquadra, adminCreaUtente, adminGetUtentiSocieta, getSocieta } from '../services/db';
import { Shield, Plus, Users, MapPin, Image, Key, Calendar, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function AdminPanel({ onEsci }) {
  const [societaList, setSocietaList] = useState([]);
  const [societaSelezionata, setSocietaSelezionata] = useState(null);
  const [utentiSocieta, setUtentiSocieta] = useState([]);

  // Form Nuova Squadra
  const [codice, setCodice] = useState('');
  const [nome, setNome] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

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

  const handleCreaSquadra = async (e) => {
    e.preventDefault();
    if (!codice || !nome) return;
    try {
      const nuova = await adminCreaSquadra({
        codice,
        nome,
        indirizzoCampo: indirizzo,
        logoUrl
      });
      setMessaggio(`Squadra ${nuova.nome} creata con prova di 30 giorni!`);
      setCodice('');
      setNome('');
      setIndirizzo('');
      setLogoUrl('');
      ricaricaDati();
      setSocietaSelezionata(nuova);
    } catch (err) {
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
      setMessaggio(`Utente ${username} creato con successo!`);
      setUsername('');
      setPassword('');
      const u = await adminGetUtentiSocieta(societaSelezionata.id);
      setUtentiSocieta(u);
    } catch (err) {
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
          <ArrowLeft className="w-4 h-4" /> Esci dal Pannello Admin
        </button>
        <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
          SuperAdmin Mode
        </span>
      </div>

      {messaggio && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {messaggio}
        </div>
      )}

      {/* 1. SEZIONE CREAZIONE NUOVA SQUADRA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" /> Registra Nuova Squadra (Prova 30 Giorni)
        </h2>

        <form onSubmit={handleCreaSquadra} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Codice Società (Univoco)</label>
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
            <label className="text-xs text-slate-400 uppercase font-semibold">Indirizzo Campo Sportivo</label>
            <input
              type="text"
              placeholder="es. Via dello Sport 12, Milano"
              value={indirizzo}
              onChange={(e) => setIndirizzo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">URL Logo Squadra (Opzionale)</label>
            <input
              type="url"
              placeholder="https://link-al-tuo-logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm mt-1"
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition text-sm"
            >
              <Plus className="w-4 h-4" /> Attiva Squadra (Inizia Prova Gratuita)
            </button>
          </div>
        </form>
      </div>

      {/* 2. GESTIONE UTENTI PER SQUADRA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" /> Abilita Utenti per Società
        </h2>

        <div>
          <label className="text-xs text-slate-400 uppercase font-semibold">Seleziona la Società:</label>
          <select
            value={societaSelezionata?.id || ''}
            onChange={(e) => setSocietaSelezionata(societaList.find(s => s.id === e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm mt-1"
          >
            <option value="">-- Seleziona una squadra --</option>
            {societaList.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome} ({s.codice_societa || s.id}) - Scadenza: {new Date(s.data_scadenza_prova).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        {societaSelezionata && (
          <div className="pt-3 border-t border-slate-800 space-y-4">
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
                <label className="text-xs text-slate-400">Password da Assegnare</label>
                <input
                  type="text"
                  placeholder="es. Fulgor2026!"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Campionato / Stagione</label>
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

            {/* Elenco Utenti Attivi per questa società */}
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Credenziali attive per {societaSelezionata.nome}:</h4>
              {utentiSocieta.length === 0 ? (
                <p className="text-xs text-slate-500">Nessun utente creato per questa squadra.</p>
              ) : (
                <div className="space-y-1.5">
                  {utentiSocieta.map(u => (
                    <div key={u.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-white">Utente: {u.username}</span>
                        <span className="text-slate-400 ml-3">Password: <code className="text-emerald-400 font-mono">{u.password_chiaro}</code></span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-semibold">{u.stagione}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
