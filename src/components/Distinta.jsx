import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Plus, Users, Trash2, MapPin } from 'lucide-react';

const DEFAULT_ROSA = [
  { id: '1', numero: '1', nome: 'Rossi Marco', ruolo: 'POR', isTitolare: true, isCapitano: false, isVice: false },
  { id: '2', numero: '2', nome: 'Bianchi Luca', ruolo: 'DIF', isTitolare: true, isCapitano: false, isVice: false },
  { id: '3', numero: '3', nome: 'Ferrari Alex', ruolo: 'DIF', isTitolare: true, isCapitano: false, isVice: false },
  { id: '4', numero: '4', nome: 'Esposito Ciro', ruolo: 'DIF', isTitolare: true, isCapitano: true, isVice: false },
  { id: '5', numero: '5', nome: 'Romano Davide', ruolo: 'DIF', isTitolare: true, isCapitano: false, isVice: false },
  { id: '6', numero: '6', nome: 'Colombo Matteo', ruolo: 'CEN', isTitolare: true, isCapitano: false, isVice: true },
  { id: '7', numero: '7', nome: 'Ricci Simone', ruolo: 'CEN', isTitolare: true, isCapitano: false, isVice: false },
  { id: '8', numero: '8', nome: 'Marino Andrea', ruolo: 'CEN', isTitolare: true, isCapitano: false, isVice: false },
  { id: '9', numero: '9', nome: 'Greco Lorenzo', ruolo: 'ATT', isTitolare: true, isCapitano: false, isVice: false },
  { id: '10', numero: '10', nome: 'Galli Christian', ruolo: 'ATT', isTitolare: true, isCapitano: false, isVice: false },
  { id: '11', numero: '11', nome: 'Conti Fabio', ruolo: 'ATT', isTitolare: true, isCapitano: false, isVice: false },
  { id: '12', numero: '12', nome: 'Villa Stefano', ruolo: 'POR', isTitolare: false, isCapitano: false, isVice: false },
  { id: '13', numero: '13', nome: 'Mancini Paolo', ruolo: 'DIF', isTitolare: false, isCapitano: false, isVice: false },
  { id: '14', numero: '14', nome: 'Costa Gabriele', ruolo: 'CEN', isTitolare: false, isCapitano: false, isVice: false },
  { id: '15', numero: '15', nome: 'Giordano Mattia', ruolo: 'ATT', isTitolare: false, isCapitano: false, isVice: false },
];

export default function Distinta({ onConfermaDistinta, societa }) {
  const [partitaInfo, setPartitaInfo] = useState(() => {
    const salvati = localStorage.getItem('panchina_partita_info');
    return salvati ? JSON.parse(salvati) : {
      squadraCasa: societa?.nome || 'ASD Nostra Squadra',
      squadraOspite: 'Real Avversari',
      allenatore: 'M. Allegri',
      dirigente: 'G. Marotta'
    };
  });

  const [giocatori, setGiocatori] = useState(() => {
    const salvati = localStorage.getItem('panchina_rosa');
    return salvati ? JSON.parse(salvati) : DEFAULT_ROSA;
  });

  const [nuovoNome, setNuovoNome] = useState('');
  const [nuovoNumero, setNuovoNumero] = useState('');
  const [nuovoRuolo, setNuovoRuolo] = useState('CEN');

  useEffect(() => {
    localStorage.setItem('panchina_rosa', JSON.stringify(giocatori));
    localStorage.setItem('panchina_partita_info', JSON.stringify(partitaInfo));
  }, [giocatori, partitaInfo]);

  const titolariCount = giocatori.filter(g => g.isTitolare).length;

  const toggleTitolare = (id) => {
    setGiocatori(giocatori.map(g => {
      if (g.id === id) {
        if (!g.isTitolare && titolariCount >= 11) {
          alert('Hai già selezionato 11 titolari!');
          return g;
        }
        return { ...g, isTitolare: !g.isTitolare };
      }
      return g;
    }));
  };

  const setCapitano = (id) => {
    setGiocatori(giocatori.map(g => ({
      ...g,
      isCapitano: g.id === id ? !g.isCapitano : false,
      isVice: g.id === id ? false : g.isVice
    })));
  };

  const setViceCapitano = (id) => {
    setGiocatori(giocatori.map(g => ({
      ...g,
      isVice: g.id === id ? !g.isVice : false,
      isCapitano: g.id === id ? false : g.isCapitano
    })));
  };

  const aggiungiGiocatore = (e) => {
    e.preventDefault();
    if (!nuovoNome.trim() || !nuovoNumero.trim()) return;

    const nuovo = {
      id: Date.now().toString(),
      numero: nuovoNumero,
      nome: nuovoNome,
      ruolo: nuovoRuolo,
      isTitolare: titolariCount < 11,
      isCapitano: false,
      isVice: false
    };

    setGiocatori([...giocatori, nuovo]);
    setNuovoNome('');
    setNuovoNumero('');
  };

  const rimuoviGiocatore = (id) => {
    setGiocatori(giocatori.filter(g => g.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 bg-slate-900 text-slate-100 rounded-2xl shadow-xl">
      {/* Banner Intestazione con Logo Ufficiale Società */}
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
          <h1 className="text-xl font-black text-white">{societa?.nome || 'Distinta di Gara'}</h1>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            {societa?.indirizzo_campo || 'Campo Sportivo Ufficiale'}
          </p>
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-md">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-emerald-400">
          <Shield className="w-5 h-5" /> Configurazione Partita
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase text-slate-400 font-semibold">Squadra Casa</label>
            <input
              type="text"
              value={partitaInfo.squadraCasa}
              onChange={(e) => setPartitaInfo({ ...partitaInfo, squadraCasa: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-400 font-semibold">Squadra Ospite</label>
            <input
              type="text"
              value={partitaInfo.squadraOspite}
              onChange={(e) => setPartitaInfo({ ...partitaInfo, squadraOspite: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-400 font-semibold">Allenatore</label>
            <input
              type="text"
              value={partitaInfo.allenatore}
              onChange={(e) => setPartitaInfo({ ...partitaInfo, allenatore: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-400 font-semibold">Dirigente Accompagnatore</label>
            <input
              type="text"
              value={partitaInfo.dirigente}
              onChange={(e) => setPartitaInfo({ ...partitaInfo, dirigente: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm"
            />
          </div>
        </div>
      </div>

      <form onSubmit={aggiungiGiocatore} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-wrap gap-3 items-end">
        <div className="w-20">
          <label className="text-xs text-slate-400">N°</label>
          <input
            type="number"
            placeholder="10"
            value={nuovoNumero}
            onChange={(e) => setNuovoNumero(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-bold text-center text-sm"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-slate-400">Nome e Cognome</label>
          <input
            type="text"
            placeholder="Cognome Nome"
            value={nuovoNome}
            onChange={(e) => setNuovoNome(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
          />
        </div>
        <div className="w-28">
          <label className="text-xs text-slate-400">Ruolo</label>
          <select
            value={nuovoRuolo}
            onChange={(e) => setNuovoRuolo(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
          >
            <option value="POR">POR</option>
            <option value="DIF">DIF</option>
            <option value="CEN">CEN</option>
            <option value="ATT">ATT</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1 transition text-sm"
        >
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </form>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> Rosa Giocatori
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${titolariCount === 11 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
            Titolari: {titolariCount} / 11
          </span>
        </div>

        <div className="divide-y divide-slate-700 max-h-[480px] overflow-y-auto">
          {giocatori.map((g) => (
            <div key={g.id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-sm text-emerald-400">
                  {g.numero}
                </span>
                <div>
                  <span className="font-semibold text-white block text-sm">{g.nome}</span>
                  <span className="text-xs text-slate-400 uppercase font-mono">{g.ruolo}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleTitolare(g.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition ${
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
                >
                  C
                </button>

                <button
                  type="button"
                  onClick={() => setViceCapitano(g.id)}
                  className={`p-1.5 rounded text-xs font-bold ${
                    g.isVice ? 'bg-sky-500 text-black' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  VC
                </button>

                <button
                  type="button"
                  onClick={() => rimuoviGiocatore(g.id)}
                  className="p-1.5 rounded bg-slate-700 text-rose-400 hover:bg-rose-950 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={() => onConfermaDistinta && onConfermaDistinta({ partitaInfo, giocatori })}
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
