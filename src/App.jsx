import React, { useState, useEffect } from 'react';
import Distinta from './components/Distinta';
import Cronometro from './components/Cronometro';
import { getSocieta, creaSocieta, salvaDistintaSuDb } from './services/db';
import { ArrowLeft, Shield, Building2, Plus, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [faseApp, setFaseApp] = useState('seleziona_societa'); // 'seleziona_societa' | 'distinta' | 'partita'
  
  // Gestione Società
  const [listaSocieta, setListaSocieta] = useState([]);
  const [societaAttiva, setSocietaAttiva] = useState(() => {
    const salvata = localStorage.getItem('inpanchina_societa');
    return salvata ? JSON.parse(salvata) : null;
  });
  const [nuovoNomeSocieta, setNuovoNomeSocieta] = useState('');
  
  // Dati di gioco
  const [partitaInfo, setPartitaInfo] = useState(null);
  const [rosa, setRosa] = useState([]);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  const [tempoGara, setTempoGara] = useState(1);
  const [golCasa, setGolCasa] = useState(0);
  const [golOspiti, setGolOspiti] = useState(0);

  // Caricamento società all'avvio
  useEffect(() => {
    async function fetchSocieta() {
      const dati = await getSocieta();
      setListaSocieta(dati);
      if (societaAttiva) {
        setFaseApp('distinta');
      }
    }
    fetchSocieta();
  }, []);

  const selezionaClub = (soc) => {
    setSocietaAttiva(soc);
    localStorage.setItem('inpanchina_societa', JSON.stringify(soc));
    setFaseApp('distinta');
  };

  const handleCreaSocieta = async (e) => {
    e.preventDefault();
    if (!nuovoNomeSocieta.trim()) return;
    const slug = nuovoNomeSocieta.toLowerCase().replace(/[^a-z0-9]/g, '-');
    try {
      const nuova = await creaSocieta(slug, nuovoNomeSocieta);
      setListaSocieta([...listaSocieta, nuova]);
      selezionaClub(nuova);
      setNuovoNomeSocieta('');
    } catch (err) {
      alert('Errore nella creazione della società o nome già esistente.');
    }
  };

  const cambiaSocieta = () => {
    localStorage.removeItem('inpanchina_societa');
    setSocietaAttiva(null);
    setFaseApp('seleziona_societa');
  };

  const handleConfermaDistinta = async ({ partitaInfo, giocatori }) => {
    setSalvataggioInCorso(true);
    setPartitaInfo(partitaInfo);
    setRosa(giocatori);

    const partitaId = `${societaAttiva.id}_PARTITA_LIVE`;
    const res = await salvaDistintaSuDb(societaAttiva.id, partitaId, partitaInfo, giocatori);
    setSalvataggioInCorso(false);

    if (res.success) {
      alert(`Distinta salvata nel cloud per: ${societaAttiva.nome}`);
    } else {
      alert('Salvataggio locale completato.');
    }
    setFaseApp('partita');
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-3 md:p-6">
      {salvataggioInCorso && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <p className="text-emerald-400 font-bold text-lg animate-pulse flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 animate-spin" /> Salvataggio dati in corso...
          </p>
        </div>
      )}

      {/* 1. SELEZIONE SOCIETÀ */}
      {faseApp === 'seleziona_societa' && (
        <div className="max-w-md mx-auto space-y-6 pt-10">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-2">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white">InPanchina</h1>
            <p className="text-sm text-slate-400">Seleziona o crea la tua società sportiva</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-xs uppercase font-bold text-slate-400">Società Registrate</h2>
            <div className="space-y-2">
              {listaSocieta.map((soc) => (
                <button
                  key={soc.id}
                  onClick={() => selezionaClub(soc)}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition group"
                >
                  <span className="font-bold text-white group-hover:text-emerald-400">{soc.nome}</span>
                  <span className="text-xs text-slate-500 font-mono">#{soc.id}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleCreaSocieta} className="pt-4 border-t border-slate-800 space-y-2">
              <label className="text-xs text-slate-400">Nuova Società?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Es. USD Aurora 1919"
                  value={nuovoNomeSocieta}
                  onChange={(e) => setNuovoNomeSocieta(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-1 text-white"
                >
                  <Plus className="w-4 h-4" /> Crea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SCHERMATA DISTINTA */}
      {faseApp === 'distinta' && (
        <div className="space-y-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {societaAttiva?.nome}
            </span>
            <button
              onClick={cambiaSocieta}
              className="text-xs text-slate-400 hover:text-rose-400 underline"
            >
              Cambia Società
            </button>
          </div>
          <Distinta onConfermaDistinta={handleConfermaDistinta} />
        </div>
      )}

      {/* 3. SCHERMATA LIVE MATCH */}
      {faseApp === 'partita' && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              onClick={() => setFaseApp('distinta')}
              className="text-xs uppercase font-bold text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Torna a Distinta
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {societaAttiva?.nome}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between text-center">
            <div className="flex-1">
              <h3 className="font-bold text-sm md:text-base text-slate-200 truncate">
                {partitaInfo?.squadraCasa || 'Casa'}
              </h3>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">{golCasa}</div>
              <div className="flex justify-center gap-1 mt-2">
                <button
                  onClick={() => setGolCasa(golCasa + 1)}
                  className="bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded text-xs font-bold"
                >
                  +1
                </button>
                <button
                  onClick={() => setGolCasa(Math.max(0, golCasa - 1))}
                  className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-xs font-bold"
                >
                  -1
                </button>
              </div>
            </div>

            <div className="px-4 text-slate-600 font-bold text-xl">VS</div>

            <div className="flex-1">
              <h3 className="font-bold text-sm md:text-base text-slate-200 truncate">
                {partitaInfo?.squadraOspite || 'Ospite'}
              </h3>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">{golOspiti}</div>
              <div className="flex justify-center gap-1 mt-2">
                <button
                  onClick={() => setGolOspiti(golOspiti + 1)}
                  className="bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded text-xs font-bold"
                >
                  +1
                </button>
                <button
                  onClick={() => setGolOspiti(Math.max(0, golOspiti - 1))}
                  className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-xs font-bold"
                >
                  -1
                </button>
              </div>
            </div>
          </div>

          <Cronometro
            tempo={tempoGara}
            setTempo={setTempoGara}
            onFinePrimoTempo={() => alert('Fine 1° Tempo!')}
            onFinePartita={() => alert('Partita terminata!')}
          />
        </div>
      )}
    </div>
  );
}
