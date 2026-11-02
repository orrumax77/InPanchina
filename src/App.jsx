import React, { useState, useEffect, useRef } from 'react';
import Distinta from './components/Distinta';
import Cronometro from './components/Cronometro';
import GestioneEventi from './components/GestioneEventi';
import FeedEventi from './components/FeedEventi';
import RefertoGara from './components/RefertoGara';
import { 
  getSocieta, 
  creaSocieta, 
  salvaDistintaSuDb, 
  caricaStatoPartita, 
  syncStatoPartitaSuDb, 
  registraEventoCloud, 
  eliminaEventoCloud, 
  aggiornaGiocatoriCloud 
} from './services/db';
import { supabase } from './supabaseClient';
import { ArrowLeft, Shield, Building2, Plus, CheckCircle2, FileText, RotateCcw, Radio } from 'lucide-react';

export default function App() {
  const [faseApp, setFaseApp] = useState('seleziona_societa');
  
  // Società
  const [listaSocieta, setListaSocieta] = useState([]);
  const [societaAttiva, setSocietaAttiva] = useState(() => {
    const salvata = localStorage.getItem('inpanchina_societa');
    return salvata ? JSON.parse(salvata) : null;
  });
  const [nuovoNomeSocieta, setNuovoNomeSocieta] = useState('');
  
  // Partita e Dati Live
  const [partitaInfo, setPartitaInfo] = useState(null);
  const [rosa, setRosa] = useState([]);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  
  const [tempoGara, setTempoGara] = useState(1);
  const [secondiGara, setSecondiGara] = useState(0);
  const [inEsecuzione, setInEsecuzione] = useState(false);
  const [recupero, setRecupero] = useState(0);
  const [minutoCorrente, setMinutoCorrente] = useState(1);
  const [golCasa, setGolCasa] = useState(0);
  const [golOspiti, setGolOspiti] = useState(0);

  const [eventi, setEventi] = useState([]);
  const [slotUsati, setSlotUsati] = useState(0);
  const [cambiEffettuati, setCambiEffettuati] = useState(0);

  const partitaId = societaAttiva ? `${societaAttiva.id}_PARTITA_LIVE` : null;
  const isSyncingFromRemote = useRef(false);

  // 1. CARICAMENTO SOCIETÀ E STATO PARTITA
  useEffect(() => {
    async function init() {
      const datiSoc = await getSocieta();
      setListaSocieta(datiSoc);

      if (societaAttiva) {
        const idPartita = `${societaAttiva.id}_PARTITA_LIVE`;
        const stato = await caricaStatoPartita(idPartita);
        
        if (stato && stato.partita) {
          setPartitaInfo({
            squadraCasa: stato.partita.squadra_casa,
            squadraOspite: stato.partita.squadra_ospite,
            allenatore: stato.partita.allenatore,
            dirigente: stato.partita.dirigente
          });
          setGolCasa(stato.partita.gol_casa || 0);
          setGolOspiti(stato.partita.gol_ospite || 0);
          setTempoGara(stato.partita.tempo || 1);
          setSecondiGara(stato.partita.secondi_gara || 0);
          setInEsecuzione(stato.partita.in_esecuzione || false);
          setRecupero(stato.partita.recupero || 0);
          setMinutoCorrente(stato.partita.minuto_corrente || 1);
          setSlotUsati(stato.partita.slot_usati || 0);
          setCambiEffettuati(stato.partita.cambi_effettuati || 0);

          if (stato.giocatori.length > 0) {
            setRosa(stato.giocatori.map(g => ({
              id: g.id.replace(`${idPartita}_`, ''),
              numero: g.numero,
              nome: g.nome,
              ruolo: g.ruolo,
              isTitolare: g.is_titolare,
              isCapitano: g.is_capitano,
              isVice: g.is_vice,
              ammonizioni: g.ammonizioni,
              espulso: g.espulso
            })));
          }

          if (stato.eventi.length > 0) {
            setEventi(stato.eventi);
          }

          if (stato.partita.stato === 'in-corso') {
            setFaseApp('partita');
            return;
          }
        }
        setFaseApp('distinta');
      }
    }
    init();
  }, [societaAttiva]);

  // 2. CANALE REALTIME: Ascolta gli aggiornamenti fatti da altri dirigenti
  useEffect(() => {
    if (!partitaId) return;

    const channel = supabase
      .channel(`realtime-partita-${partitaId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partite', filter: `id=eq.${partitaId}` }, (payload) => {
        isSyncingFromRemote.current = true;
        const p = payload.new;
        setGolCasa(p.gol_casa);
        setGolOspiti(p.gol_ospite);
        setTempoGara(p.tempo);
        setSecondiGara(p.secondi_gara);
        setInEsecuzione(p.in_esecuzione);
        setRecupero(p.recupero);
        setMinutoCorrente(p.minuto_corrente);
        setSlotUsati(p.slot_usati);
        setCambiEffettuati(p.cambi_effettuati);
        setTimeout(() => { isSyncingFromRemote.current = false; }, 300);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventi', filter: `partita_id=eq.${partitaId}` }, async () => {
        const stato = await caricaStatoPartita(partitaId);
        if (stato && stato.eventi) setEventi(stato.eventi);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partitaId]);

  // 3. SINCRONIZZAZIONE PERIODICA SUL CLOUD (se il cronometro è attivo o il dato cambia localmente)
  useEffect(() => {
    if (faseApp !== 'partita' || !partitaId || isSyncingFromRemote.current) return;

    const timer = setTimeout(() => {
      syncStatoPartitaSuDb(partitaId, {
        golCasa,
        golOspiti,
        tempoGara,
        secondiGara,
        inEsecuzione,
        recupero,
        minutoCorrente,
        slotUsati,
        cambiEffettuati
      });
    }, 1500); // Salva su Cloud ogni secondo e mezzo senza saturare la rete

    return () => clearTimeout(timer);
  }, [partitaId, faseApp, golCasa, golOspiti, tempoGara, secondiGara, inEsecuzione, recupero, minutoCorrente, slotUsati, cambiEffettuati]);

  const selezionaClub = (soc) => {
    setSocietaAttiva(soc);
    localStorage.setItem('inpanchina_societa', JSON.stringify(soc));
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
    } catch {
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

    await salvaDistintaSuDb(societaAttiva.id, partitaId, partitaInfo, giocatori);
    setSalvataggioInCorso(false);
    setFaseApp('partita');
  };

  const handleGolSegnato = async (isNostraSquadra) => {
    if (isNostraSquadra) {
      setGolCasa(prev => prev + 1);
    } else {
      setGolOspiti(prev => prev + 1);
    }
  };

  const handleNuovoEvento = async (evento) => {
    setEventi(prev => [evento, ...prev]);
    await registraEventoCloud(partitaId, evento);
  };

  const eliminaEvento = async (id) => {
    setEventi(eventi.filter(e => e.id !== id));
    await eliminaEventoCloud(id);
  };

  const handleAggiornaRosa = async (nuovaRosa) => {
    setRosa(nuovaRosa);
    await aggiornaGiocatoriCloud(partitaId, societaAttiva.id, nuovaRosa);
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-3 md:p-6">
      {salvataggioInCorso && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <p className="text-emerald-400 font-bold text-lg animate-pulse flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 animate-spin" /> Connessione Database Cloud...
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

      {/* 2. DISTINTA */}
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

      {/* 3. LIVE MATCH SINCRONIZZATO */}
      {faseApp === 'partita' && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              onClick={() => setFaseApp('distinta')}
              className="text-xs uppercase font-bold text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Distinta
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" /> Sincronizzato Cloud
              </span>
              <button
                onClick={() => setFaseApp('referto')}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> Referto
              </button>
            </div>
          </div>

          {/* Punteggio */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between text-center">
            <div className="flex-1">
              <h3 className="font-bold text-sm md:text-base text-slate-200 truncate">
                {partitaInfo?.squadraCasa || 'Casa'}
              </h3>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">{golCasa}</div>
            </div>

            <div className="px-4 text-slate-600 font-bold text-xl">VS</div>

            <div className="flex-1">
              <h3 className="font-bold text-sm md:text-base text-slate-200 truncate">
                {partitaInfo?.squadraOspite || 'Ospite'}
              </h3>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">{golOspiti}</div>
            </div>
          </div>

          {/* Cronometro con sync */}
          <Cronometro
            tempo={tempoGara}
            setTempo={setTempoGara}
            secondi={secondiGara}
            setSecondi={setSecondiGara}
            inEsecuzione={inEsecuzione}
            setInEsecuzione={setInEsecuzione}
            recupero={recupero}
            setRecupero={setRecupero}
            onTick={(min) => setMinutoCorrente(min)}
            onFinePrimoTempo={() => alert('Fine 1° Tempo!')}
            onFinePartita={() => {
              alert('Partita terminata! Apertura referto.');
              setFaseApp('referto');
            }}
          />

          {/* Modulo Eventi */}
          <GestioneEventi
            giocatori={rosa}
            setGiocatori={handleAggiornaRosa}
            eventi={eventi}
            setEventi={setEventi}
            onNuovoEvento={handleNuovoEvento}
            minutoCorrente={minutoCorrente}
            tempoGara={tempoGara}
            slotUsati={slotUsati}
            setSlotUsati={setSlotUsati}
            cambiEffettuati={cambiEffettuati}
            setCambiEffettuati={setCambiEffettuati}
            onGolSegnato={handleGolSegnato}
          />

          {/* Timeline Eventi */}
          <FeedEventi eventi={eventi} onEliminaEvento={eliminaEvento} />
        </div>
      )}

      {/* 4. REFERTO FINALE */}
      {faseApp === 'referto' && (
        <RefertoGara
          partitaInfo={partitaInfo}
          societaNome={societaAttiva?.nome}
          golCasa={golCasa}
          golOspiti={golOspiti}
          eventi={eventi}
          giocatori={rosa}
          onChiudi={() => setFaseApp('partita')}
        />
      )}
    </div>
  );
}
