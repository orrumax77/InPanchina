import React, { useState, useEffect, useRef } from 'react';
import Distinta from './components/Distinta';
import Cronometro from './components/Cronometro';
import GestioneEventi from './components/GestioneEventi';
import FeedEventi from './components/FeedEventi';
import RefertoGara from './components/RefertoGara';
import ArchivioReferti from './components/ArchivioReferti';
import AdminPanel from './components/AdminPanel';
import { 
  loginSistema, 
  salvaDistintaSuDb, 
  caricaStatoPartita, 
  syncStatoPartitaSuDb, 
  registraEventoCloud, 
  eliminaEventoCloud, 
  aggiornaGiocatoriCloud,
  salvaRosaBaseSocieta,
  salvaBozzaPartitaSuDb,
  getSocietaById,
  caricaRosaSocieta,
  archiviaPartitaEResettaLive
} from './services/db';
import { supabase } from './supabaseClient';
import { 
  ArrowLeft, 
  LogIn, 
  FileText, 
  Radio, 
  MapPin, 
  CheckCircle2, 
  UserCircle2, 
  Archive, 
  RotateCcw, 
  AlertOctagon, 
  Volume2, 
  ArrowRight 
} from 'lucide-react';

// Calcola dinamicamente la categoria LND ufficiale in base alla stagione e all'anno di nascita
const getCategoriaLND = (stagione, annataStr) => {
  if (!annataStr || isNaN(annataStr)) return annataStr;
  const annoNascita = parseInt(annataStr, 10);
  const annoInizioStagione = parseInt(stagione.split('/')[0], 10);
  const eta = annoInizioStagione - annoNascita;

  if (eta === 18) return `Under 19 (${annataStr})`;
  if (eta === 17) return `Under 18 (${annataStr})`;
  if (eta === 16) return `Under 17 (${annataStr})`; // 2010 per la stagione 2026/2027
  if (eta === 15) return `Under 16 (${annataStr})`; // 2011 per la stagione 2026/2027
  if (eta === 14) return `Under 15 (${annataStr})`; // 2012
  if (eta === 13) return `Under 14 (${annataStr})`; // 2013
  if (eta <= 12) return `Attività di Base / Esordienti (${annataStr})`;
  return `Annata ${annataStr}`;
};

// Funzione per calcolare automaticamente la stagione calcistica corrente in base alla data
const getStagioneDinamicaCorrente = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Gennaio, 7 = Agosto, 8 = Settembre...
  
  if (month >= 7) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
};

// Genera una lista di stagioni attorno a quella corrente
const getListaStagioniDisponibili = () => {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth();
  const baseYear = currentMonth >= 7 ? year : year - 1;
  
  return [
    `${baseYear - 2}/${baseYear - 1}`,
    `${baseYear - 1}/${baseYear}`,
    `${baseYear}/${baseYear + 1}`,
    `${baseYear + 1}/${baseYear + 2}`,
    `${baseYear + 2}/${baseYear + 3}`
  ];
};

export default function App() {
  const [faseApp, setFaseApp] = useState('login'); // 'login' | 'admin' | 'distinta' | 'partita' | 'referto' | 'archivio'
   
  const [utenteConnesso, setUtenteConnesso] = useState(null);
  const [societaAttiva, setSocietaAttiva] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
   
  // UNICO dato salvato in localStorage: il nome utente esatto senza maiuscole forzate
  const [loginUser, setLoginUser] = useState(() => localStorage.getItem('inpanchina_username') || '');
  const [loginPassword, setLoginPassword] = useState('');
  
  // STATI DINAMICI STAGIONE E ANNATA (CON ESTRAZIONE SICURA DEL SOLO ANNO NUMERICO)
  const [stagioneSelezionata, setStagioneSelezionata] = useState(getStagioneDinamicaCorrente);
  const [annataSelezionata, setAnnataSelezionata] = useState(() => {
    const salvata = localStorage.getItem('inpanchina_annata') || '2010';
    const match = salvata.match(/\d{4}/);
    return match ? match[0] : '2010';
  });
  
  const [loginError, setLoginError] = useState('');

  const [partitaInfo, setPartitaInfo] = useState(null);
  const [rosa, setRosa] = useState([]);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
   
  // Stati Cronometro Sincronizzato Multi-Dispositivo
  const [tempoGara, setTempoGara] = useState(1);
  const [secondiGara, setSecondiGara] = useState(0);
  const [secondiBase, setSecondiBase] = useState(0);
  const [avviatoAlle, setAvviatoAlle] = useState(null);
  const [inEsecuzione, setInEsecuzione] = useState(false);
  const [recupero, setRecupero] = useState(0);
  const [minutoCorrente, setMinutoCorrente] = useState(1);
  const [golCasa, setGolCasa] = useState(0);
  const [golOspiti, setGolOspiti] = useState(0);

  const [eventi, setEventi] = useState([]);
  const [slotUsati, setSlotUsati] = useState(0);
  const [cambiEffettuati, setCambiEffettuati] = useState(0);

  const [modaleBloccoTempo, setModaleBloccoTempo] = useState(null);

  // CHIAVE COMPOSTA TRIPLICE GENERICA: Società + Campionato + Annata
  const campionatoPulito = (stagioneSelezionata || '').replace(/[^a-zA-Z0-9]/g, '_');
  const annataPulita = (annataSelezionata || '').replace(/[^a-zA-Z0-9]/g, '_');
  const partitaId = societaAttiva ? `${societaAttiva.id}_${campionatoPulito}_${annataPulita}_PARTITA_LIVE` : null;

  useEffect(() => {
    Object.keys(localStorage).forEach(key => {
      if (key !== 'inpanchina_username' && key !== 'inpanchina_annata') {
        localStorage.removeItem(key);
      }
    });
  }, []);

  const avviaSessioneSocieta = async (soc) => {
    setSalvataggioInCorso(true);
    const socFresca = (soc?.id ? await getSocietaById(soc.id) : null) || soc;
    setSocietaAttiva(socFresca);

    const campionatoPulito = (stagioneSelezionata || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulita = (annataSelezionata || '').replace(/[^a-zA-Z0-9]/g, '_');
    const idPartita = socFresca ? `${socFresca.id}_${campionatoPulito}_${annataPulita}_PARTITA_LIVE` : null;
     
    let rosaSalvataNelDb = await caricaRosaSocieta(socFresca.id, stagioneSelezionata, annataSelezionata);

    const campionatoPulitoStaff = (stagioneSelezionata || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulitaStaff = (annataSelezionata || '').replace(/[^a-zA-Z0-9]/g, '_');
    const chiaveStaff = `${campionatoPulitoStaff}_${annataPulitaStaff}`;

    const staffRaw = socFresca.staff_base || {};
    
    let staffBase = {};
    if (staffRaw[chiaveStaff] && typeof staffRaw[chiaveStaff] === 'object') {
      staffBase = staffRaw[chiaveStaff];
    } else {
      const isLegacyFlat = staffRaw.allenatore || staffRaw.dirigente || staffRaw.squadraCasa || staffRaw.dataPartita;
      if (isLegacyFlat && annataPulitaStaff === '2010') {
        staffBase = staffRaw;
      } else {
        staffBase = {};
      }
    }
    
    const allenatoreBase = (staffBase.allenatore || socFresca.allenatore_predefinito || '').toUpperCase();
    const allenatoreSecondaBase = (staffBase.allenatoreSeconda || socFresca.allenatore_seconda_predefinito || '').toUpperCase();
    const dirigenteBase = (staffBase.dirigente || socFresca.dirigente_predefinito || '').toUpperCase();
    const dirigenteUfficialiBase = (staffBase.dirigenteUfficiali || socFresca.dirigente_ufficiali_predefinito || '').toUpperCase();
    const assistenteArbitroBase = (staffBase.assistenteArbitro || socFresca.assistente_arbitro_predefinito || '').toUpperCase();
    const medicoSocialeBase = (staffBase.medicoSociale || '').toUpperCase();
    const massaggiatoreBase = (staffBase.massaggiatore || '').toUpperCase();
    const preparatoreAtleticoBase = (staffBase.preparatoreAtletico || '').toUpperCase();
    const preparatorePortieriBase = (staffBase.preparatorePortieri || '').toUpperCase();
    
    // FORZATURA SICURA: La squadra di casa DEVE ESSERE SEMPRE IL NOME UFFICIALE DELLA SOCIETÀ (mai l'ID tecnico)
    const nomeSocietaUfficiale = (socFresca.nome || '').toUpperCase();
    const squadraCasaBase = nomeSocietaUfficiale;
    const squadraOspiteBase = (staffBase.squadraOspite || '').toUpperCase();
    const isNostraCasaBase = staffBase.isNostraCasa ?? true;
    const dataPartitaBase = staffBase.dataPartita || new Date().toISOString().split('T')[0];

    const stato = await caricaStatoPartita(idPartita);
    setRosa(rosaSalvataNelDb || []);
    
    const partitaDB = stato?.partita;

    // 🚀 RICONOSCE SE LA DISTINTA È STATA CONFERMATA O IL LIVE È IN CORSO
    const isLiveInCorso = partitaDB && (
      partitaDB.in_esecuzione === true || 
      (partitaDB.secondi_gara !== undefined && partitaDB.secondi_gara > 0) || 
      partitaDB.tempo > 1 || 
      (stato.eventi && stato.eventi.length > 0) ||
      partitaDB.slot_usati > 0 ||
      partitaDB.cambi_effettuati > 0 ||
      partitaDB.gol_casa > 0 ||
      partitaDB.gol_ospite > 0 ||
      (partitaDB.squadra_ospite && partitaDB.squadra_ospite.trim() !== '')
    );

    if (isLiveInCorso) {
      // Controlliamo che il nome squadra casa non sia l'ID tecnico
      const dbCasa = partitaDB.squadra_casa;
      const nomeCasaValido = (dbCasa && dbCasa !== socFresca.id) ? dbCasa : nomeSocietaUfficiale;

      const pInfo = {
        squadraCasa: nomeCasaValido.toUpperCase(),
        squadraOspite: (partitaDB.squadra_ospite || squadraOspiteBase).toUpperCase(),
        allenatore: (partitaDB.allenatore || allenatoreBase).toUpperCase(),
        allenatoreSeconda: (partitaDB.allenatore_seconda || allenatoreSecondaBase).toUpperCase(),
        dirigente: (partitaDB.dirigente || dirigenteBase).toUpperCase(),
        dirigenteUfficiali: (partitaDB.dirigente_ufficiali || dirigenteUfficialiBase).toUpperCase(),
        assistenteArbitro: (partitaDB.assistente_arbitro || assistenteArbitroBase).toUpperCase(),
        medicoSociale: medicoSocialeBase,
        massaggiatore: massaggiatoreBase,
        preparatoreAtletico: preparatoreAtleticoBase,
        preparatorePortieri: preparatorePortieriBase,
        dataPartita: partitaDB.data_gara || dataPartitaBase,
        isNostraCasa: partitaDB.is_nostra_casa ?? isNostraCasaBase
      };

      setPartitaInfo(pInfo);
      setGolCasa(partitaDB.gol_casa || 0);
      setGolOspiti(partitaDB.gol_ospite || 0);
      setTempoGara(partitaDB.tempo || 1);
       
      const inEsec = partitaDB.in_esecuzione || false;
      const secGara = partitaDB.secondi_gara || 0;
      const avvAlle = partitaDB.avviato_alle || null;
       
      setInEsecuzione(inEsec);
      setAvviatoAlle(avvAlle);
      setSecondiBase(secGara);
       
      if (inEsec && avvAlle) {
        const trascorsi = Math.max(0, Math.floor((Date.now() - new Date(avvAlle).getTime()) / 1000));
        setSecondiGara(secGara + trascorsi);
      } else {
        setSecondiGara(secGara);
      }

      setRecupero(partitaDB.recupero || 0);
      setMinutoCorrente(partitaDB.minuto_corrente || 1);
      setSlotUsati(partitaDB.slot_usati || 0);
      setCambiEffettuati(partitaDB.cambi_effettuati || 0);
      setEventi(stato.eventi || []);

      setSalvataggioInCorso(false);
      setFaseApp('partita');
    } else {
      const pInfo = {
        squadraCasa: nomeSocietaUfficiale,
        squadraOspite: (staffBase.squadraOspite || '').toUpperCase(),
        allenatore: allenatoreBase,
        allenatoreSeconda: allenatoreSecondaBase,
        dirigente: dirigenteBase,
        dirigenteUfficiali: dirigenteUfficialiBase,
        assistenteArbitro: assistenteArbitroBase,
        medicoSociale: medicoSocialeBase,
        massaggiatore: massaggiatoreBase,
        preparatoreAtletico: preparatoreAtleticoBase,
        preparatorePortieri: preparatorePortieriBase,
        dataPartita: staffBase.dataPartita || dataPartitaBase,
        isNostraCasa: isNostraCasaBase
      };

      setPartitaInfo(pInfo);
      setGolCasa(0);
      setGolOspiti(0);
      setTempoGara(1);
      setSecondiGara(0);
      setSecondiBase(0);
      setAvviatoAlle(null);
      setInEsecuzione(false);
      setRecupero(0);
      setMinutoCorrente(1);
      setSlotUsati(0);
      setCambiEffettuati(0);
      setEventi([]);

      setSalvataggioInCorso(false);
      setFaseApp('distinta');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setSalvataggioInCorso(true);

    const utenteDigitato = loginUser.trim();
    const passwordDigitata = loginPassword.trim();

    localStorage.setItem('inpanchina_username', utenteDigitato);
    localStorage.setItem('inpanchina_annata', annataSelezionata.trim());

    const res = await loginSistema(utenteDigitato, passwordDigitata, stagioneSelezionata);
    setSalvataggioInCorso(false);

    if (res.success) {
      if (res.isAdmin) {
        setIsSuperAdmin(true);
        setUtenteConnesso(res.utente);
        setFaseApp('admin');
      } else {
        setIsSuperAdmin(false);
        setUtenteConnesso(res.utente);
        await avviaSessioneSocieta(res.societa);
      }
    } else {
      setLoginError(res.messaggio);
    }
  };

  const handleAdminEntraInSquadra = async (soc) => {
    await avviaSessioneSocieta(soc);
  };

  const syncStatoLive = async (datiExtra = {}) => {
    const adessoISO = inEsecuzione ? new Date().toISOString() : avviatoAlle;
    
    if (inEsecuzione) {
      setAvviatoAlle(adessoISO);
      setSecondiBase(secondiGara);
    }

    await syncStatoPartitaSuDb(partitaId, {
      golCasa,
      golOspiti,
      tempoGara,
      secondiGara,
      inEsecuzione,
      avviatoAlle: adessoISO,
      recupero,
      minutoCorrente,
      slotUsati,
      cambiEffettuati,
      ...datiExtra
    });
  };

  // REALTIME SYNCHRONIZATION MULTI-DISPOSITIVO (PARTITA + EVENTI + CARTELLINI)
  useEffect(() => {
    if (!partitaId) return;

    const channel = supabase
      .channel(`realtime-partita-${partitaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partite', filter: `id=eq.${partitaId}` }, async (payload) => {
        const p = payload.new;
        if (!p) return;

        setGolCasa(p.gol_casa || 0);
        setGolOspiti(p.gol_ospite || 0);
        setTempoGara(p.tempo || 1);
        setRecupero(p.recupero || 0);
        setMinutoCorrente(p.minuto_corrente || 1);
        setSlotUsati(p.slot_usati || 0);
        setCambiEffettuati(p.cambi_effettuati || 0);

        setInEsecuzione(p.in_esecuzione || false);
        setAvviatoAlle(p.avviato_alle || null);
        setSecondiBase(p.secondi_gara || 0);

        if (p.in_esecuzione && p.avviato_alle) {
          const trascorsi = Math.max(0, Math.floor((Date.now() - new Date(p.avviato_alle).getTime()) / 1000));
          setSecondiGara((p.secondi_gara || 0) + trascorsi);
        } else {
          setSecondiGara(p.secondi_gara || 0);
        }

        if (p.squadra_casa && p.squadra_ospite) {
          setPartitaInfo(prev => ({
            ...(prev || {}),
            squadraCasa: p.squadra_casa,
            squadraOspite: p.squadra_ospite,
            allenatore: p.allenatore || prev?.allenatore || '',
            dirigente: p.dirigente || prev?.dirigente || '',
            dataPartita: p.data_gara || prev?.dataPartita || '',
            isNostraCasa: p.is_nostra_casa ?? (prev?.isNostraCasa ?? true)
          }));

          setFaseApp(prevFase => (prevFase === 'distinta' ? 'partita' : prevFase));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventi' }, async (payload) => {
        // 🚀 FILTRIAMO L'EVENTO DIRETTAMENTE LATO CLIENT PER EVITARE BLOCCHI DI SUPABASE REALTIME
        const eventoArrivato = payload.new || payload.old;
        if (eventoArrivato && eventoArrivato.partita_id === partitaId) {
          const stato = await caricaStatoPartita(partitaId);
          if (stato && stato.eventi) {
            const eventiAggiornati = stato.eventi;
            setEventi(eventiAggiornati);

            // Ricalcolo automatico dei cartellini e della rosa
            setRosa(prevRosa => {
              const rosaAggiornata = prevRosa.map(g => {
                const ammonizioniNormaliRimaste = eventiAggiornati.filter(e => 
                  e.tipo === 'AMMONIZIONE' && (
                    e.giocatoreId === g.id || 
                    (e.dettagli && (e.dettagli.toUpperCase().includes(g.nome.toUpperCase()) || e.dettagli.includes(`#${g.numero} `)))
                  )
                ).length;

                const doppieAmmonizioniRimaste = eventiAggiornati.filter(e => 
                  e.tipo === 'ESPULSIONE' && e.dettagli?.toUpperCase().includes('DOPPIA AMMONIZIONE') && (
                    e.giocatoreId === g.id || 
                    (e.dettagli && (e.dettagli.toUpperCase().includes(g.nome.toUpperCase()) || e.dettagli.includes(`#${g.numero} `)))
                  )
                ).length;

                const espulsioniDiretteRimaste = eventiAggiornati.filter(e => 
                  e.tipo === 'ESPULSIONE' && !e.dettagli?.toUpperCase().includes('DOPPIA AMMONIZIONE') && (
                    e.giocatoreId === g.id || 
                    (e.dettagli && (e.dettagli.toUpperCase().includes(g.nome.toUpperCase()) || e.dettagli.includes(`#${g.numero} `)))
                  )
                ).length;

                const totaleGialliEffettivi = ammonizioniNormaliRimaste + (doppieAmmonizioniRimaste * 2);
                const ancoraEspulso = totaleGialliEffettivi >= 2 || espulsioniDiretteRimaste > 0;

                return {
                  ...g,
                  ammonizioni: totaleGialliEffettivi,
                  espulso: ancoraEspulso,
                  isTitolare: ancoraEspulso ? false : (g.isTitolare ?? true)
                };
              });

              if (societaAttiva?.id) {
                aggiornaGiocatoriCloud(partitaId, societaAttiva.id, rosaAggiornata, stagioneSelezionata, annataSelezionata);
              }

              return rosaAggiornata;
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partitaId, societaAttiva?.id, stagioneSelezionata, annataSelezionata]);
  
  const avviaTimer = () => {
    const adessoISO = new Date().toISOString();
    setInEsecuzione(true);
    setAvviatoAlle(adessoISO);
    setSecondiBase(secondiGara);

    syncStatoPartitaSuDb(partitaId, {
      golCasa,
      golOspiti,
      tempoGara,
      secondiGara,
      inEsecuzione: true,
      avviatoAlle: adessoISO,
      recupero,
      minutoCorrente,
      slotUsati,
      cambiEffettuati
    });
  };

  const mettiInPausaTimer = (secondiFinali = secondiGara) => {
    setInEsecuzione(false);
    setAvviatoAlle(null);
    setSecondiBase(secondiFinali);
    setSecondiGara(secondiFinali);

    syncStatoPartitaSuDb(partitaId, {
      golCasa,
      golOspiti,
      tempoGara,
      secondiGara: secondiFinali,
      inEsecuzione: false,
      avviatoAlle: null,
      recupero,
      minutoCorrente,
      slotUsati,
      cambiEffettuati
    });
  };

  const gestisciAvanzamentoTempo = (secondiDelta, nuovoTotale) => {
    const limiteMax = 45 * 60 + (recupero * 60);
    const secondiFinali = Math.min(limiteMax, nuovoTotale);

    setSecondiGara(secondiFinali);

    if (inEsecuzione) {
      const adessoISO = new Date().toISOString();
      setAvviatoAlle(adessoISO);
      setSecondiBase(secondiFinali);

      syncStatoPartitaSuDb(partitaId, {
        golCasa,
        golOspiti,
        tempoGara,
        secondiGara: secondiFinali,
        inEsecuzione: true,
        avviatoAlle: adessoISO,
        recupero,
        minutoCorrente,
        slotUsati,
        cambiEffettuati
      });
    } else {
      setSecondiBase(secondiFinali);
      syncStatoPartitaSuDb(partitaId, {
        golCasa,
        golOspiti,
        tempoGara,
        secondiGara: secondiFinali,
        inEsecuzione: false,
        avviatoAlle: null,
        recupero,
        minutoCorrente,
        slotUsati,
        cambiEffettuati
      });
    }
  };
  
  const cambiaFaseGara = (nuovoTempo) => {
    setModaleBloccoTempo(null);

    if (nuovoTempo === 2) {
      setInEsecuzione(false);
      setAvviatoAlle(null);
      setTempoGara(2);
      setSecondiGara(0);
      setSecondiBase(0);
      setRecupero(0);
      setMinutoCorrente(46);

      syncStatoPartitaSuDb(partitaId, {
        golCasa,
        golOspiti,
        tempoGara: 2,
        secondiGara: 0,
        inEsecuzione: false,
        avviatoAlle: null,
        recupero: 0,
        minutoCorrente: 46,
        slotUsati,
        cambiEffettuati
      });

      alert("Fine 1° Tempo! Il cronometro del 2° Tempo è azzerato a 00:00 e sincronizzato.");
    } else if (nuovoTempo === 'fine') {
      mettiInPausaTimer();
      setFaseApp('referto');
    }
  };

  const handleAggiornaRosaInDistinta = async (nuovaRosa) => {
    setRosa(nuovaRosa);
    if (societaAttiva?.id) {
      await salvaRosaBaseSocieta(
        societaAttiva.id, 
        nuovaRosa, 
        undefined, 
        stagioneSelezionata, 
        annataSelezionata
      );
    }
  };
  
  const handleConfermaDistinta = async ({ partitaInfo: pInfo, giocatori }) => {
    setSalvataggioInCorso(true);
    setPartitaInfo(pInfo);

    await salvaDistintaSuDb(societaAttiva.id, partitaId, pInfo, giocatori, stagioneSelezionata, annataSelezionata);
    await salvaBozzaPartitaSuDb(societaAttiva.id, partitaId, pInfo, stagioneSelezionata, annataSelezionata);

    setSalvataggioInCorso(false);
    setFaseApp('partita');

    // 🚀 PORTA SUBITO IL FOCUS IN CIMA ALLA PAGINA
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGolSegnato = async (isNostraSquadra) => {
    const laNostraSquadraGiocaInCasa = partitaInfo?.isNostraCasa ?? true;
    const golVaACasa = isNostraSquadra ? laNostraSquadraGiocaInCasa : !laNostraSquadraGiocaInCasa;

    const nuovoCasa = golVaACasa ? golCasa + 1 : golCasa;
    const nuovoOspiti = !golVaACasa ? golOspiti + 1 : golOspiti;

    setGolCasa(nuovoCasa);
    setGolOspiti(nuovoOspiti);

    await syncStatoLive({
      golCasa: nuovoCasa,
      golOspiti: nuovoOspiti
    });
  };

  const handleNuovoEvento = async (evento) => {
    setEventi(prev => [evento, ...prev]);
    await registraEventoCloud(partitaId, evento, stagioneSelezionata, annataSelezionata);
  };

  const handleAggiornaCambiSlot = async (nuoviCambi, nuoviSlot) => {
    setCambiEffettuati(nuoviCambi);
    setSlotUsati(nuoviSlot);

    await syncStatoLive({
      slotUsati: nuoviSlot,
      cambiEffettuati: nuoviCambi
    });
  };

  const eliminaEvento = async (id) => {
    const eventoDaEliminare = eventi.find(e => e.id === id);
    if (!eventoDaEliminare) return;

    const eventiRimasti = eventi.filter(e => e.id !== id);

    if (eventoDaEliminare.tipo === 'GOL') {
      const laNostraSquadraGiocaInCasa = partitaInfo?.isNostraCasa ?? true;
      const isGolNostro = eventoDaEliminare.squadra === 'NOSTRA' || (!eventoDaEliminare.squadra && !eventoDaEliminare.dettagli?.toLowerCase().includes('avversar'));
      const stornareCasa = isGolNostro ? laNostraSquadraGiocaInCasa : !laNostraSquadraGiocaInCasa;

      const nuovoCasa = stornareCasa ? Math.max(0, golCasa - 1) : golCasa;
      const nuovoOspiti = !stornareCasa ? Math.max(0, golOspiti - 1) : golOspiti;

      setGolCasa(nuovoCasa);
      setGolOspiti(nuovoOspiti);

      await syncStatoLive({
        golCasa: nuovoCasa,
        golOspiti: nuovoOspiti
      });
    }

    if (eventoDaEliminare.tipo === 'SOSTITUZIONE') {
      const nuoviCambi = Math.max(0, cambiEffettuati - 1);
      const isIntervallo = eventoDaEliminare.dettagli?.toLowerCase().includes('intervallo');
      const novosSlot = isIntervallo ? slotUsati : Math.max(0, slotUsati - 1);

      await handleAggiornaCambiSlot(nuoviCambi, isIntervallo ? slotUsati : novosSlot);

      let idEsce = eventoDaEliminare.esceId;
      let idEntra = eventoDaEliminare.entraId;

      if ((!idEsce || !idEntra) && eventoDaEliminare.dettagli) {
        const giocatoriCoinvolti = rosa.filter(g => eventoDaEliminare.dettagli.includes(`#${g.numero}`) || eventoDaEliminare.dettagli.includes(g.nome));
        if (giocatoriCoinvolti.length >= 2) {
          const idxEsce = eventoDaEliminare.dettagli.indexOf('Esce');
          const idxEntra = eventoDaEliminare.dettagli.indexOf('Entra');
           
          let candidatoEsce = null;
          let candidatoEntra = null;
          let minDistanzaEsce = 999;
          let minDistanzaEntra = 999;

          rosa.forEach(g => {
            const posNome = eventoDaEliminare.dettagli.indexOf(g.nome);
            if (posNome !== -1) {
              const distEsce = Math.abs(posNome - idxEsce);
              const distEntra = Math.abs(posNome - idxEntra);
              if (distEsce < minDistanzaEsce) {
                minDistanzaEsce = distEsce;
                candidatoEsce = g;
              }
              if (distEntra < minDistanzaEntra) {
                minDistanzaEntra = distEntra;
                candidatoEntra = g;
              }
            }
          });

          if (candidatoEsce) idEsce = candidatoEsce.id;
          if (candidatoEntra) idEntra = candidatoEntra.id;
        }
      }

      const rosaAggiornataPerCambio = rosa.map(g => {
        if (g.id === idEsce) return { ...g, isTitolare: true };
        if (g.id === idEntra) return { ...g, isTitolare: false };
        return g;
      });

      setRosa(rosaAggiornataPerCambio);
      await aggiornaGiocatoriCloud(partitaId, societaAttiva.id, rosaAggiornataPerCambio, stagioneSelezionata, annataSelezionata);
    }

    if (eventoDaEliminare.tipo === 'AMMONIZIONE' || eventoDaEliminare.tipo === 'ESPULSIONE') {
      const giocatoreCoinvolto = rosa.find(g => 
        eventoDaEliminare.giocatoreId === g.id ||
        (eventoDaEliminare.dettagli && (
          eventoDaEliminare.dettagli.toUpperCase().includes(g.nome.toUpperCase()) ||
          eventoDaEliminare.dettagli.includes(`#${g.numero} `)
        ))
      );

      if (giocatoreCoinvolto) {
        const rosaAggiornataPerCartellini = rosa.map(g => {
          if (g.id === giocatoreCoinvolto.id) {
            const ammonizioniNormaliRimaste = eventiRimasti.filter(e => 
              (e.tipo === 'AMMONIZIONE') && (
                e.giocatoreId === g.id || 
                (e.dettagli && (e.dettagli.toUpperCase().includes(g.nome.toUpperCase()) || e.dettagli.includes(`#${g.numero} `)))
              )
            ).length;

            const doppieAmmonizioniRimaste = eventiRimasti.filter(e => 
              (e.tipo === 'ESPULSIONE' && e.dettagli?.toUpperCase().includes('DOPPIA AMMONIZIONE')) && (
                e.giocatoreId === g.id || 
                (e.dettagli && (e.dettagli.toUpperCase().includes(g.nome.toUpperCase()) || e.dettagli.includes(`#${g.numero} `)))
              )
            ).length;

            const espulsioniDiretteRimaste = eventiRimasti.filter(e => 
              (e.tipo === 'ESPULSIONE' && !e.dettagli?.toUpperCase().includes('DOPPIA AMMONIZIONE')) && (
                e.giocatoreId === g.id || 
                (e.dettagli && (e.dettagli.toUpperCase().includes(g.nome.toUpperCase()) || e.dettagli.includes(`#${g.numero} `)))
              )
            ).length;

            const totaleGialliEffettivi = ammonizioniNormaliRimaste + (doppieAmmonizioniRimaste * 2);
            const ancoraEspulso = totaleGialliEffettivi >= 2 || espulsioniDiretteRimaste > 0;

            return {
              ...g,
              ammonizioni: totaleGialliEffettivi,
              espulso: ancoraEspulso,
              isTitolare: !ancoraEspulso ? true : g.isTitolare
            };
          }
          return g;
        });

        setRosa(rosaAggiornataPerCartellini);
        await aggiornaGiocatoriCloud(partitaId, societaAttiva.id, rosaAggiornataPerCartellini, stagioneSelezionata, annataSelezionata);
      }
    }
      
    await eliminaEventoCloud(id);
    setEventi(eventiRimasti);
  };
    
  const handleAggiornaRosa = async (nuovaRosa) => {
    setRosa(nuovaRosa);
    await aggiornaGiocatoriCloud(partitaId, societaAttiva.id, nuovaRosa, stagioneSelezionata, annataSelezionata);
  };

  const handleTerminaLiveEResetta = async (giocatoriConMinuti) => {
    setSalvataggioInCorso(true);

    const giocatoriDaArchiviare = (giocatoriConMinuti && giocatoriConMinuti.length > 0) 
      ? giocatoriConMinuti 
      : rosa;

    const res = await archiviaPartitaEResettaLive(
      societaAttiva.id,
      partitaId,
      partitaInfo,
      { golCasa, golOspiti },
      eventi,
      giocatoriDaArchiviare,
      stagioneSelezionata,
      annataSelezionata
    );

    setSalvataggioInCorso(false);

    if (res.success) {
      alert("Partita archiviata con successo nello storico con tutti i minuti giocati! Live azzerato per la prossima gara.");

      setGolCasa(0);
      setGolOspiti(0);
      setTempoGara(1);
      setSecondiGara(0);
      setSecondiBase(0);
      setAvviatoAlle(null);
      setInEsecuzione(false);
      setRecupero(0);
      setMinutoCorrente(1);
      setSlotUsati(0);
      setCambiEffettuati(0);
      setEventi([]);

      setRosa(prev => prev.map(g => ({ ...g, ammonizioni: 0, espulso: false })));

      setPartitaInfo(prev => ({
        ...prev,
        squadraCasa: societaAttiva?.nome || '',
        squadraOspite: '',
        dataPartita: new Date().toISOString().split('T')[0],
        isNostraCasa: true
      }));

      setFaseApp('distinta');
    } else {
      alert("Errore durante l'archiviazione della partita.");
    }
  };

  const disconnetti = () => {
    setUtenteConnesso(null);
    setSocietaAttiva(null);
    setIsSuperAdmin(false);
    setLoginPassword('');
    setPartitaInfo(null);
    setRosa([]);
    setEventi([]);
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

      {faseApp === 'login' && (
        <div className="max-w-md mx-auto space-y-6 pt-10">
          <div className="text-center space-y-2">
            <div className="inline-flex p-1.5 rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/50 mb-2">
              <img 
                src="/app-icon.png" 
                alt="InPanchina Logo" 
                className="w-20 h-20 rounded-2xl object-cover shadow-inner" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">InPanchina</h1>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm mt-1 outline-none focus:border-emerald-500 uppercase font-bold cursor-pointer"
                required
              >
                {getListaStagioniDisponibili().map((stagione) => {
                  return (
                    <option key={stagione} value={stagione} className="bg-slate-900 text-white">
                      {stagione}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase flex justify-between items-center">
                <span>Annata Squadra</span>
                <span className="text-emerald-400 lowercase font-mono tracking-normal">{getCategoriaLND(stagioneSelezionata, annataSelezionata)}</span>
              </label>
              <select
                value={annataSelezionata}
                onChange={(e) => setAnnataSelezionata(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm mt-1 outline-none focus:border-emerald-500 uppercase font-bold cursor-pointer"
                required
              >
                {(() => {
                  const annoBase = parseInt(stagioneSelezionata.split('/')[0], 10);
                  const annateComuni = [
                    annoBase - 18,
                    annoBase - 17,
                    annoBase - 16,
                    annoBase - 15,
                    annoBase - 14,
                    annoBase - 13,
                    annoBase - 12,
                    annoBase - 11,
                    annoBase - 10
                  ];
                  return annateComuni.map(anno => (
                    <option key={anno} value={String(anno)} className="bg-slate-900 text-white">
                      {getCategoriaLND(stagioneSelezionata, String(anno))}
                    </option>
                  ));
                })()}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="Nome utente"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm mt-1 outline-none focus:border-emerald-500 font-medium normal-case"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm mt-1 outline-none focus:border-emerald-500 font-mono normal-case"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition text-sm shadow-lg shadow-emerald-950 uppercase cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> Accedi
            </button>
          </form>
        </div>
      )}

      {faseApp === 'admin' && (
        <AdminPanel
          onEsci={disconnetti}
          onSelezionaSquadraDaAdmin={handleAdminEntraInSquadra}
          stagioneCorrente={getStagioneDinamicaCorrente()}
          listaStagioni={getListaStagioniDisponibili()}
        />
      )}

      {faseApp === 'distinta' && (
        <div className="space-y-4">
          <div className="max-w-4xl mx-auto flex flex-wrap justify-between items-center bg-slate-900 border border-slate-800 p-3.5 rounded-xl gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              {societaAttiva?.logo_url && (
                <img src={societaAttiva.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 bg-slate-900" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white uppercase">{societaAttiva?.nome}</span>
                  <span className="bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow">
                    {getCategoriaLND(stagioneSelezionata, annataSelezionata)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 uppercase mt-0.5">
                  <MapPin className="w-3 h-3 text-emerald-400" /> {societaAttiva?.indirizzo_campo || 'Campo non specificato'} • {stagioneSelezionata}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setFaseApp('archivio')}
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Visualizza tutti i referti passati"
              >
                <Archive className="w-3.5 h-3.5" /> Archivio Referti
              </button>

              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                <UserCircle2 className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block leading-none">
                    {isSuperAdmin ? 'SuperAdmin' : 'Utente Connesso'}
                  </span>
                  <span className="text-xs font-bold text-white font-mono leading-tight normal-case">
                    {utenteConnesso?.username || loginUser}
                  </span>
                </div>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => setFaseApp('admin')}
                  className="text-xs text-blue-400 hover:underline uppercase font-semibold cursor-pointer"
                >
                  Admin
                </button>
              )}
              <button
                onClick={disconnetti}
                className="text-xs text-rose-400 hover:underline uppercase font-semibold cursor-pointer"
              >
                Esci
              </button>
            </div>
          </div>

          <Distinta
            onConfermaDistinta={handleConfermaDistinta}
            onAggiornaRosa={handleAggiornaRosaInDistinta}
            societa={societaAttiva}
            partitaIniziale={partitaInfo}
            rosaIniziale={rosa}
            campionato={stagioneSelezionata}  
            annata={annataSelezionata}        
          />
        </div>
      )}

      {faseApp === 'partita' && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            {(!inEsecuzione && secondiGara === 0 && eventi.length === 0) ? (
              <button
                onClick={() => setFaseApp('distinta')}
                className="text-xs uppercase font-bold text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Distinta
              </button>
            ) : <div />}
             
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow">
                {getCategoriaLND(stagioneSelezionata, annataSelezionata)} ({stagioneSelezionata})
              </span>

              <button
                type="button"
                onClick={() => setFaseApp('archivio')}
                className="bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Vedi referti archiviati"
              >
                <Archive className="w-3.5 h-3.5" /> Archivio
              </button>

              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 uppercase">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" /> Live
              </span>

              <button
                onClick={() => setFaseApp('referto')}
                className="px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 uppercase transition cursor-pointer bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700"
              >
                <FileText className="w-3.5 h-3.5" /> Referto
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between text-center relative">
            <div className="flex-1 min-w-0 px-1">
              <h3 className="font-bold text-xs sm:text-sm md:text-base text-slate-200 uppercase break-words leading-tight line-clamp-2 min-h-[2rem] flex items-center justify-center">
                {partitaInfo?.squadraCasa || 'CASA'}
              </h3>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-1">{golCasa}</div>
            </div>

            <div className="px-2 flex flex-col items-center justify-center">
              <span className="text-slate-500 font-black text-xs sm:text-sm tracking-widest">VS</span>
            </div>

            <div className="flex-1 min-w-0 px-1">
              <h3 className="font-bold text-xs sm:text-sm md:text-base text-slate-200 uppercase break-words leading-tight line-clamp-2 min-h-[2rem] flex items-center justify-center">
                {partitaInfo?.squadraOspite || 'OSPITE'}
              </h3>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-1">{golOspiti}</div>
            </div>
          </div>

          <Cronometro
            tempo={tempoGara}
            secondi={secondiGara}
            setSecondi={setSecondiGara}
            inEsecuzione={inEsecuzione}
            avviatoAlle={avviatoAlle}
            secondiBase={secondiBase}
            onAvvia={avviaTimer}
            onPausa={mettiInPausaTimer}
            onAvanzaTempo={gestisciAvanzamentoTempo}
            onFinePrimoTempo={() => cambiaFaseGara(2)}
            onFinePartita={() => cambiaFaseGara('fine')}
            recupero={recupero}
            setRecupero={setRecupero}
            onTick={(min) => setMinutoCorrente(min)}
            onTriggerScadenzaTempo={null}
          />

          <GestioneEventi
            giocatori={rosa}
            setGiocatori={handleAggiornaRosa}
            eventi={eventi}
            setEventi={setEventi}
            onNuovoEvento={handleNuovoEvento}
            minutoCorrente={minutoCorrente}
            tempoGara={tempoGara}
            secondiGara={secondiGara}
            slotUsati={slotUsati}
            setSlotUsati={setSlotUsati}
            cambiEffettuati={cambiEffettuati}
            setCambiEffettuati={setCambiEffettuati}
            onAggiornaCambiSlot={handleAggiornaCambiSlot}
            onGolSegnato={handleGolSegnato}
            inEsecuzione={inEsecuzione}
          />

          <FeedEventi eventi={eventi} onEliminaEvento={eliminaEvento} />

          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleTerminaLiveEResetta()}
              className="w-full py-3 rounded-xl border border-rose-900/40 bg-rose-950/20 hover:bg-rose-950/50 text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Termina Live e Archivia per Prossima Gara
            </button>
          </div>
        </div>
      )}

      {faseApp === 'referto' && (
        <RefertoGara
          partitaInfo={partitaInfo}
          societaNome={societaAttiva?.nome}
          golCasa={golCasa}
          golOspiti={golOspiti}
          eventi={eventi}
          giocatori={rosa}
          minutoCorrente={minutoCorrente}
          tempoGara={tempoGara}
          campionato={stagioneSelezionata}
          annata={annataSelezionata}
          onChiudi={() => setFaseApp('partita')}
          onTerminaEResetta={handleTerminaLiveEResetta}
        />
      )}

      {faseApp === 'archivio' && (
        <ArchivioReferti
          societa={societaAttiva}
          campionato={stagioneSelezionata}
          annata={annataSelezionata}
          onTornaIndietro={() => setFaseApp(partitaInfo ? 'distinta' : 'distinta')}
        />
      )}

      {modaleBloccoTempo && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-[99999] select-none">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-rose-950">
            <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 animate-pulse">
              <AlertOctagon className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold font-mono text-rose-400 bg-rose-950/60 border border-rose-500/40 px-3 py-1 rounded-full uppercase inline-flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> 
                {modaleBloccoTempo === 'primo_tempo' ? 'Duplice Fischio' : 'Triplice Fischio Finale'}
              </span>

              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                {modaleBloccoTempo === 'primo_tempo' ? 'Fine 1° Tempo!' : 'Partita Terminata!'}
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed uppercase font-medium">
                {modaleBloccoTempo === 'primo_tempo' ? (
                  <>Il tempo regolamentare della prima frazione è scaduto. Passa al 2° tempo per azzerare il cronometro a 00:00 o aggiungi eventuale recupero.</>
                ) : (
                  <>
                    Il tempo regolamentare è concluso. Per salvare e validare ufficialmente il match devi accedere al <strong className="text-white">Referto Finale</strong>, altrimenti la sessione live non verrà archiviata!
                  </>
                )}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => cambiaFaseGara(modaleBloccoTempo === 'primo_tempo' ? 2 : 'fine')}
                className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-rose-950 transition active:scale-95 cursor-pointer"
              >
                {modaleBloccoTempo === 'primo_tempo' ? 'Azzera e Passa al 2° Tempo' : 'Procedi al Referto Ufficiale (Obbligatorio)'}
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setRecupero(prev => prev + 1);
                  setModaleBloccoTempo(null);
                }}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs uppercase transition cursor-pointer"
              >
                + Aggiungi 1 Minuto di Recupero Extra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
