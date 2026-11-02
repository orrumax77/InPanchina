import React, { useState, useEffect, useRef } from 'react';
import Distinta from './components/Distinta';
import Cronometro from './components/Cronometro';
import GestioneEventi from './components/GestioneEventi';
import FeedEventi from './components/FeedEventi';
import RefertoGara from './components/RefertoGara';
import AdminPanel from './components/AdminPanel';
import { 
  loginDirigente, 
  salvaDistintaSuDb, 
  caricaStatoPartita, 
  syncStatoPartitaSuDb, 
  registraEventoCloud, 
  eliminaEventoCloud, 
  aggiornaGiocatoriCloud 
} from './services/db';
import { supabase } from './supabaseClient';
import { ArrowLeft, Shield, LogIn, Lock, FileText, Radio, MapPin, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [faseApp, setFaseApp] = useState('login'); // 'login' | 'admin' | 'distinta' | 'partita' | 'referto'
  
  // Dati Autenticazione Dirigente
  const [utenteConnesso, setUtenteConnesso] = useState(null);
  const [societaAttiva, setSocietaAttiva] = useState(null);
  
  // Campi Form Login
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [stagioneSelezionata, setStagioneSelezionata] = useState('2026/2027');
  const [loginError, setLoginError] = useState('');

  // Accesso Admin Protetta
  const [mostraModalAdmin, setMostraModalAdmin] = useState(false);
  const [pinAdmin, setPinAdmin] = useState('');

  // Partita e Dati Live
  const [partitaInfo, setPartitaInfo] = useState(null);
  const [rosa, setRosa] = useState([]);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  
  const [tempoGara, setTempoGara] = useState(1);
  const [secondiGara, setSecondiGara] = useState(0);
  const [timerAvviatoIl, setTimerAvviatoIl] = useState(null);
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

  // 1. LOGIN DIRIGENTE
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setSalvataggioInCorso(true);
    const res = await loginDirigente(loginUser, loginPassword);
    setSalvataggioInCorso(false);

    if (res.success) {
      setUtenteConnesso(res.utente);
      setSocietaAttiva(res.societa);
      
      const idPartita = `${res.societa.id}_PARTITA_LIVE`;
      const stato = await caricaStatoPartita(idPartita);
      if (stato && stato.partita && stato.partita.stato === 'in-corso') {
        setPartitaInfo({
          squadraCasa: stato.partita.squadra_casa,
          squadraOspite: stato.partita.squadra_ospite,
          allenatore: stato.partita.allenatore,
          dirigente: stato.partita.dirigente
        });
        setGolCasa(stato.partita.gol_casa || 0);
        setGolOspiti(stato.partita.gol_ospite || 0);
        setTempoGara(stato.partita.tempo || 1);
        setInEsecuzione(stato.partita.in_esecuzione || false);
        setTimerAvviatoIl(stato.partita.timer_avviato_il || null);
        setRecupero(stato.partita.recupero || 0);
        setMinutoCorrente(stato.partita.minuto_corrente || 1);
        setSlotUsati(stato.partita.slot_usati || 0);
        setCambiEffettuati(stato.partita.cambi_effettuati || 0);

        if (stato.partita.in_esecuzione && stato.partita.timer_avviato_il) {
          setSecondiGara(Math.floor((Date.now() - stato.partita.timer_avviato_il) / 1000));
        } else {
          setSecondiGara(stato.partita.secondi_gara || 0);
        }

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

        setFaseApp('partita');
      } else {
        setFaseApp('distinta');
      }
    } else {
      setLoginError(res.messaggio);
    }
  };

  // 2. ACCESSO ADMIN MASTER
  const verificaPinAdmin = (e) => {
    e.preventDefault();
    if (pinAdmin === 'admin2026') {
      setMostraModalAdmin(false);
      setPinAdmin('');
      setFaseApp('admin');
    } else {
      alert('PIN Amministratore non corretto!');
    }
  };

  // 3. ASCOLTATORE REALTIME SUPABASE
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
        setInEsecuzione(p.in_esecuzione);
        setTimerAvviatoIl(p.timer_avviato_il);
        setRecupero(p.recupero);
        setMinutoCorrente(p.minuto_corrente);
        setSlotUsati(p.slot_usati);
        setCambiEffettuati(p.cambi_effettuati);

        if (p.in_esecuzione && p.timer_avviato_il) {
          setSecondiGara(Math.floor((Date.now() - p.timer_avviato_il) / 1000));
        } else {
          setSecondiGara(p.secondi_gara);
        }

        setTimeout(() => { isSyncingFromRemote.current = false; }, 400);
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

  // Controlli Cronometro
  const avviaTimer = () => {
    const timestampInizio = Date.now() - (secondiGara * 1000);
    setTimerAvviatoIl(timestampInizio);
    setInEsecuzione(true);

    syncStatoPartitaSuDb(partitaId, {
      golCasa, golOspiti, tempoGara, secondiGara, inEsecuzione: true,
      timerAvviatoIl: timestampInizio, recupero, minutoCorrente, slotUsati, cambiEffettuati
    });
  };

  const mettiInPausaTimer = () => {
    setInEsecuzione(false);
    setTimerAvviatoIl(null);

    syncStatoPartitaSuDb(partitaId, {
      golCasa, golOspiti, tempoGara, secondiGara, inEsecuzione: false,
      timerAvviatoIl: null, recupero, minutoCorrente, slotUsati, cambiEffettuati
    });
  };

  const cambiaFaseGara = (nuovoTempo) => {
    if (nuovoTempo === 2) {
      mettiInPausaTimer();
      setTempoGara(2);
      setSecondiGara(0);
      setRecupero(0);
      syncStatoPartitaSuDb(partitaId, {
        golCasa, golOspiti, tempoGara: 2, secondiGara: 0, inEsecuzione: false,
        timerAvviatoIl: null, recupero: 0, minutoCorrente: 45, slotUsati, cambiEffettuati
      });
      alert('Fine 1° Tempo!');
    } else {
      mettiInPausaTimer();
      alert('Partita terminata! Apertura referto.');
      setFaseApp('referto');
    }
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
    const nuovoCasa = isNostraSquadra ? golCasa + 1 : golCasa;
    const nuovoOspiti = !isNostraSquadra ? golOspiti + 1 : golOspiti;
    setGolCasa(nuovoCasa);
    setGolOspiti(nuovoOspiti);

    syncStatoPartitaSuDb(partitaId, {
      golCasa: nuovoCasa, golOspiti: nuovoOspiti, tempoGara, secondiGara,
      inEsecuzione, timerAvviatoIl, recupero, minutoCorrente, slotUsati, cambiEffettuati
    });
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

      {/* 1. LOGIN DIRIGENTI */}
      {faseApp === 'login' && (
        <div className="max-w-md mx-auto space-y-6 pt-10">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-2">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white">InPanchina</h1>
            <p className="text-xs text-slate-400">Accesso Gestione Panchina & Referto</p>
          </div>

          <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
