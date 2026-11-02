import React, { useState, useEffect, useRef } from 'react';
import Distinta from './components/Distinta';
import Cronometro from './components/Cronometro';
import GestioneEventi from './components/GestioneEventi';
import FeedEventi from './components/FeedEventi';
import RefertoGara from './components/RefertoGara';
import AdminPanel from './components/AdminPanel';
import { 
  loginSistema, 
  salvaDistintaSuDb, 
  caricaStatoPartita, 
  syncStatoPartitaSuDb, 
  registraEventoCloud, 
  eliminaEventoCloud, 
  aggiornaGiocatoriCloud 
} from './services/db';
import { supabase } from './supabaseClient';
import { ArrowLeft, Shield, LogIn, FileText, Radio, MapPin, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [faseApp, setFaseApp] = useState('login'); // 'login' | 'admin' | 'distinta' | 'partita' | 'referto'
  
  // Dati Autenticazione
  const [utenteConnesso, setUtenteConnesso] = useState(null);
  const [societaAttiva, setSocietaAttiva] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Form Login Unificato
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [stagioneSelezionata, setStagioneSelezionata] = useState('2026/2027');
  const [loginError, setLoginError] = useState('');

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

  // Carica i dati della partita per una specifica società
  const avviaSessioneSocieta = async (soc) => {
    setSocietaAttiva(soc);
    const idPartita = `${soc.id}_PARTITA_LIVE`;
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
  };

  // 1. UNICO FORM LOGIN (riconosce Dirigente o Admin automaticamente)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setSalvataggioInCorso(true);
    const res = await loginSistema(loginUser, loginPassword);
    setSalvataggioInCorso(false);

    if (res.success) {
      if (res.isAdmin) {
        setIsSuperAdmin(true);
        setUtenteConnesso(res.utente);
        setFaseApp('admin');
      } else {
        setIsSuperAdmin(false);
        setUtenteConnesso(res.utente);
        // Squadra selezionata automaticamente dal profilo utente
        await avviaSessioneSocieta(res.societa);
      }
    } else {
      setLoginError(res.messaggio);
    }
  };

  // Admin sceglie di entrare direttamente nella panchina di un club
  const handleAdminEntraInSquadra = async (soc) => {
    await avviaSessioneSocieta(soc);
  };

  // 2. REALTIME SUPABASE
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

  const disconnetti = () => {
    setUtenteConnesso(null);
    setSocietaAttiva(null);
    setIsSuperAdmin(false);
    setFaseApp('login');
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

      {/* 1. LOGIN ACCESSO IMMEDIATO */}
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
            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg font-semibold">
                {loginError}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase">Campionato / Stagione</label>
              <select
                value={stagioneSelezionata}
                onChange={(e) => setStagioneSelezionata(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm mt-1 outline-none"
              >
                <option value="2026/2027">Stagione 2026 / 2027</option>
                <option value="2027/2028">Stagione 2027 / 2028</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase">Username</label>
              <input
                type="text"
                placeholder="Nome utente"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm mt-1 outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm mt-1 outline-none focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition text-sm shadow-lg shadow-emerald-950"
            >
              <LogIn className="w-4 h-4" /> Accedi
            </button>
          </form>
        </div>
      )}

      {/* 2. PANNELLO SUPERADMIN GLOBALE */}
      {faseApp === 'admin' && (
        <AdminPanel
          onEsci={disconnetti}
          onSelezionaSquadraDaAdmin={handleAdminEntraInSquadra}
        />
      )}

      {/* 3. DISTINTA (Logo e Nome caricati in automatico per quella squadra) */}
      {faseApp === 'distinta' && (
        <div className="space-y-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center gap-3">
              {societaAttiva?.logo_url && (
                <img src={societaAttiva.logo_url} alt="Logo" className="w-8 h-8 rounded-full object-cover" />
              )}
              <div>
                <span className="text-sm font-bold text-white block">{societaAttiva?.nome}</span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" /> {societaAttiva?.indirizzo_campo || 'Campo non specificato'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isSuperAdmin && (
                <button
                  onClick={() => setFaseApp('admin')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Torna ad Admin
                </button>
              )}
              <button
                onClick={disconnetti}
                className="text-xs text-rose-400 hover:underline"
              >
                Disconnetti
              </button>
            </div>
          </div>
          <Distinta onConfermaDistinta={handleConfermaDistinta} societa={societaAttiva} />
        </div>
      )}

      {/* 4. LIVE MATCH */}
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
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" /> Live {stagioneSelezionata}
              </span>
              <button
                onClick={() => setFaseApp('referto')}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> Referto
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between text-center">
            <div className="flex-1">
              <h3 className="font-bold text-sm md:text-base text-slate-200 truncate">{partitaInfo?.squadraCasa || 'Casa'}</h3>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">{golCasa}</div>
            </div>
            <div className="px-4 text-slate-600 font-bold text-xl">VS</div>
            <div className="flex-1">
              <h3 className="font-bold text-sm md:text-base text-slate-200 truncate">{partitaInfo?.squadraOspite || 'Ospite'}</h3>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">{golOspiti}</div>
            </div>
          </div>

          <Cronometro
            tempo={tempoGara}
            setTempo={setTempoGara}
            secondi={secondiGara}
            setSecondi={setSecondiGara}
            inEsecuzione={inEsecuzione}
            timerAvviatoIl={timerAvviatoIl}
            onAvvia={avviaTimer}
            onPausa={mettiInPausaTimer}
            onFinePrimoTempo={() => cambiaFaseGara(2)}
            onFinePartita={() => cambiaFaseGara('fine')}
            recupero={recupero}
            setRecupero={setRecupero}
            onTick={(min) => setMinutoCorrente(min)}
          />

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

          <FeedEventi eventi={eventi} onEliminaEvento={eliminaEvento} />
        </div>
      )}

      {/* 5. REFERTO FINALE */}
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
