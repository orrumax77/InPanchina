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

export default function App() {
  const [faseApp, setFaseApp] = useState('login'); // 'login' | 'admin' | 'distinta' | 'partita' | 'referto' | 'archivio'
   
  const [utenteConnesso, setUtenteConnesso] = useState(null);
  const [societaAttiva, setSocietaAttiva] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
   
  // UNICO dato salvato in localStorage: il nome utente esatto senza maiuscole forzate
  const [loginUser, setLoginUser] = useState(() => localStorage.getItem('inpanchina_username') || '');
  const [loginPassword, setLoginPassword] = useState('');
  
  // STATI PER CAMPIONATO E ANNATA
  const [stagioneSelezionata, setStagioneSelezionata] = useState('2026/2027');
  const [annataSelezionata, setAnnataSelezionata] = useState('2010'); // <-- NUOVO: Annata della squadra
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

  // CHIAVE COMPOSTA TRIPLICE: Società + Campionato + Annata
  const campionatoPulito = (stagioneSelezionata || '2026_2027').replace(/[^a-zA-Z0-9]/g, '_');
  const annataPulita = (annataSelezionata || 'Generica').replace(/[^a-zA-Z0-9]/g, '_');
  const partitaId = societaAttiva ? `${societaAttiva.id}_${campionatoPulito}_${annataPulita}_PARTITA_LIVE` : null;

  useEffect(() => {
    Object.keys(localStorage).forEach(key => {
      if (key !== 'inpanchina_username') {
        localStorage.removeItem(key);
      }
    });
  }, []);

  const avviaSessioneSocieta = async (soc) => {
    setSalvataggioInCorso(true);
    // FORZA SEMPRE LA LETTURA FRESCA DAL DB
    const socFresca = (soc?.id ? await getSocietaById(soc.id) : null) || soc;
    setSocietaAttiva(socFresca);

    const idPartita = partitaId;
     
    // Carichiamo la rosa filtrata per società, campionato e annata
    let rosaSalvataNelDb = await caricaRosaSocieta(socFresca.id, stagioneSelezionata, annataSelezionata);

    if ((!rosaSalvataNelDb || rosaSalvataNelDb.length === 0) && socFresca.rosa_base && socFresca.rosa_base.length > 0) {
      rosaSalvataNelDb = socFresca.rosa_base.map(g => ({
        ...g,
        nome: (g.nome || '').toUpperCase()
      }));
    }

    const staffBase = socFresca.staff_base || {};
     
    const allenatoreBase = (staffBase.allenatore || socFresca.allenatore_predefinito || '').toUpperCase();
    const allenatoreSecondaBase = (staffBase.allenatoreSeconda || socFresca.allenatore_seconda_predefinito || '').toUpperCase();
    const dirigenteBase = (staffBase.dirigente || socFresca.dirigente_predefinito || '').toUpperCase();
    const dirigenteUfficialiBase = (staffBase.dirigenteUfficiali || socFresca.dirigente_ufficiali_predefinito || '').toUpperCase();
    const assistenteArbitroBase = (staffBase.assistenteArbitro || socFresca.assistente_arbitro_predefinito || '').toUpperCase();
    const medicoSocialeBase = (staffBase.medicoSociale || '').toUpperCase();
    const massaggiatoreBase = (staffBase.massaggiatore || '').toUpperCase();
    const preparatoreAtleticoBase = (staffBase.preparatoreAtletico || '').toUpperCase();
    const preparatorePortieriBase = (staffBase.preparatorePortieri || '').toUpperCase();
    const squadraCasaBase = (staffBase.squadraCasa || socFresca.nome || '').toUpperCase();
    const squadraOspiteBase = (staffBase.squadraOspite || '').toUpperCase();
    const isNostraCasaBase = staffBase.isNostraCasa ?? true;
    const dataPartitaBase = staffBase.dataPartita || new Date().toISOString().split('T')[0];

    const stato = await caricaStatoPartita(idPartita);
    setRosa(rosaSalvataNelDb || []);

    const partitaDB = stato?.partita;

    // CONTROLLO LIVE ESTESO (Funziona anche in pausa, durante l'intervallo e con eventi registrati)
    const isLiveInCorso = partitaDB && (
      partitaDB.in_esecuzione === true || 
      (partitaDB.secondi_gara !== undefined && partitaDB.secondi_gara > 0) || 
      partitaDB.tempo > 1 || 
      (stato.eventi && stato.eventi.length > 0) ||
      partitaDB.slot_usati > 0 ||
      partitaDB.cambi_effettuati > 0 ||
      partitaDB.gol_casa > 0 ||
      partitaDB.gol_ospite > 0
    );

    if (isLiveInCorso) {
      const pInfo = {
        squadraCasa: (partitaDB.squadra_casa || squadraCasaBase).toUpperCase(),
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
      setFaseApp('partita'); // <-- ACCESSO DIRETTO AL LIVE (ANCHE IN INTERVALLO O PAUSA)
    } else {
      const pInfo = {
        squadraCasa: (staffBase.squadraCasa || partitaDB?.squadra_casa || socFresca.nome || '').toUpperCase(),
        squadraOspite: (staffBase.squadraOspite || partitaDB?.squadra_ospite || '').toUpperCase(),
        allenatore: allenatoreBase,
        allenatoreSeconda: allenatoreSecondaBase,
        dirigente: dirigenteBase,
        dirigenteUfficiali: dirigenteUfficialiBase,
        assistenteArbitro: assistenteArbitroBase,
        medicoSociale: medicoSocialeBase,
        massaggiatore: massaggiatoreBase,
        preparatoreAtletico: preparatoreAtleticoBase,
        preparatorePortieri: preparatorePortieriBase,
        dataPartita: staffBase.dataPartita || partitaDB?.data_gara || dataPartitaBase,
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

    const res = await loginSistema(utenteDigitato, passwordDigitata);
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

  // REALTIME SYNCHRONIZATION MULTI-DISPOSITIVO (Eventi, Partita e ricalcolo automatico cartellini della rosa)
  useEffect(() => {
    if (!partitaId) return;

    const channel = supabase
      .channel(`realtime-partita-${partitaId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partite', filter: `id=eq.${partitaId}` }, (payload) => {
        const p = payload.new;
        setGolCasa(p.gol_casa);
        setGolOspiti(p.gol_ospite);
        setTempoGara(p.tempo);
        setRecupero(p.recupero);
        setMinutoCorrente(p.minuto_corrente);
        setSlotUsati(p.slot_usati);
        setCambiEffettuati(p.cambi_effettuati);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventi', filter: `partita_id=eq.${partitaId}` }, async () => {
        const stato = await caricaStatoPartita(partitaId);
        if (stato && stato.eventi) {
          const eventiAggiornati = stato.eventi;
          setEventi(eventiAggiornati);

          // RICALCOLO AUTOMATICO DEI CARTELLINI E DELLA ROSA IN TEMPO REALE SUL SECONDO DISPOSITIVO
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

            // Salviamo lo stato aggiornato anche nel cloud per mantenere coerenti i dispositivi
            if (societaAttiva?.id) {
              aggiornaGiocatoriCloud(partitaId, societaAttiva.id, rosaAggiornata, stagioneSelezionata, annataSelezionata);
            }

            return rosaAggiornata;
          });
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

  const handleConfermaDistinta = async ({ partitaInfo: pInfo, giocatori }) => {
    setSalvataggioInCorso(true);
    setPartitaInfo(pInfo);
    setRosa(giocatori);

    await salvaDistintaSuDb(societaAttiva.id, partitaId, pInfo, giocatori, stagioneSelezionata, annataSelezionata);

    await salvaRosaBaseSocieta(societaAttiva.id, giocatori, {
      squadraCasa: pInfo.squadraCasa,
      squadraOspite: pInfo.squadraOspite,
      dataPartita: pInfo.dataPartita,
      isNostraCasa: pInfo.isNostraCasa,
      allenatore: pInfo.allenatore,
      allenatoreSeconda: pInfo.allenatoreSeconda,
      dirigente: pInfo.dirigente,
      dirigenteUfficiali: pInfo.dirigenteUfficiali,
      assistenteArbitro: pInfo.assistenteArbitro,
      medicoSociale: pInfo.medicoSociale,
      massaggiatore: pInfo.massaggiatore,
      preparatoreAtletico: pInfo.preparatoreAtletico,
      preparatorePortieri: pInfo.preparatorePortieri
    });

    setSalvataggioInCorso(false);
    setFaseApp('partita');
  };

  const handleGolSegnato = async (isNostraSquadra) => {
    const laNostraSquadraGiocaInCasa = partitaInfo?.isNostraCasa ?? true;
    const golVaACasa = isNostraSquadra ? laNostraSquadraGiocaInCasa : !laNostraSquadraGiocaInCasa;

    const nuovoCasa = golVaACasa ? golCasa + 1 : golCasa;
    const nuovoOspiti = !golVaACasa ? golOspiti + 1 : golOspiti;

    setGolCasa(nuovoCasa);
    setGolOspiti(nuovoOspiti);

    // Manteniamo integri slotUsati e cambiEffettuati anche quando si segna un gol
    await syncStatoPartitaSuDb(partitaId, {
      golCasa: nuovoCasa,
      golOspiti: nuovoOspiti,
      tempoGara,
      secondiGara,
      inEsecuzione,
      avviatoAlle,
      recupero,
      minutoCorrente,
      slotUsati,
      cambiEffettuati
    });
  };

  const handleNuovoEvento = async (evento) => {
    setEventi(prev => [evento, ...prev]);
    await registraEventoCloud(partitaId, evento);
  };

  // Funzione dedicata per aggiornare e salvare all'istante sul DB cambi e slot usati
  const handleAggiornaCambiSlot = async (nuoviCambi, nuoviSlot) => {
    setCambiEffettuati(nuoviCambi);
    setSlotUsati(nuoviSlot);

    await syncStatoPartitaSuDb(partitaId, {
      golCasa,
      golOspiti,
      tempoGara,
      secondiGara,
      inEsecuzione,
      avviatoAlle,
      recupero,
      minutoCorrente,
      slotUsati: nuoviSlot,
      cambiEffettuati: nuoviCambi
    });
  };

  // ELIMINAZIONE EVENTO CON ROLLBACK PERFETTO E RICONOSCIMENTO INTELLIGENTE DI CAMBI E CARTELLINI
  const eliminaEvento = async (id) => {
    const eventoDaEliminare = eventi.find(e => e.id === id);
    if (!eventoDaEliminare) return;

    // Creiamo subito l'elenco degli eventi rimasti escludendo quello da eliminare
    const eventiRimasti = eventi.filter(e => e.id !== id);

    // 1. ROLLBACK GOL (Preserva slot e cambi)
    if (eventoDaEliminare.tipo === 'GOL') {
      const laNostraSquadraGiocaInCasa = partitaInfo?.isNostraCasa ?? true;
      const isGolNostro = eventoDaEliminare.squadra === 'NOSTRA' || (!eventoDaEliminare.squadra && !eventoDaEliminare.dettagli?.toLowerCase().includes('avversar'));
      const stornareCasa = isGolNostro ? laNostraSquadraGiocaInCasa : !laNostraSquadraGiocaInCasa;

      const nuovoCasa = stornareCasa ? Math.max(0, golCasa - 1) : golCasa;
      const nuovoOspiti = !stornareCasa ? Math.max(0, golOspiti - 1) : golOspiti;

      setGolCasa(nuovoCasa);
      setGolOspiti(nuovoOspiti);

      await syncStatoPartitaSuDb(partitaId, {
        golCasa: nuovoCasa,
        golOspiti: nuovoOspiti,
        tempoGara,
        secondiGara,
        inEsecuzione,
        avviatoAlle,
        recupero,
        minutoCorrente,
        slotUsati,
        cambiEffettuati
      });
    }

    // 2. ROLLBACK CAMBIO / SOSTITUZIONE (Aggiornamento istantaneo anche sul DB)
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

      // Ripristiniamo la titolarità: chi era uscito torna titolare (isTitolare: true), chi era entrato torna in panchina (isTitolare: false)
      const rosaAggiornataPerCambio = rosa.map(g => {
        if (g.id === idEsce) return { ...g, isTitolare: true };
        if (g.id === idEntra) return { ...g, isTitolare: false };
        return g;
      });

      setRosa(rosaAggiornataPerCambio);
      await aggiornaGiocatoriCloud(partitaId, societaAttiva.id, rosaAggiornataPerCambio, stagioneSelezionata, annataSelezionata);
    }

    // 3. ROLLBACK CARTELLINI CON GESTIONE INTELLIGENTE DI GIALLI E RIPRISTINO TITOLARITÀ
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
            // 1. Contiamo quanti singoli cartellini gialli (AMMONIZIONE) sono rimasti
            const ammonizioniNormaliRimaste = eventiRimasti.filter(e => 
              (e.tipo === 'AMMONIZIONE') && (
                e.giocatoreId === g.id || 
                (e.dettagli && (e.dettagli.toUpperCase().includes(g.nome.toUpperCase()) || e.dettagli.includes(`#${g.numero} `)))
              )
            ).length;

            // 2. Contiamo se ci sono eventi registrati come doppia ammonizione rimasti nel feed
            const doppieAmmonizioniRimaste = eventiRimasti.filter(e => 
              (e.tipo === 'ESPULSIONE' && e.dettagli?.toUpperCase().includes('DOPPIA AMMONIZIONE')) && (
                e.giocatoreId === g.id || 
                (e.dettagli && (e.dettagli.toUpperCase().includes(g.nome.toUpperCase()) || e.dettagli.includes(`#${g.numero} `)))
              )
            ).length;

            // 3. Contiamo se ci sono espulsioni dirette (rosse pure) rimaste
            const espulsioniDiretteRimaste = eventiRimasti.filter(e => 
              (e.tipo === 'ESPULSIONE' && !e.dettagli?.toUpperCase().includes('DOPPIA AMMONIZIONE')) && (
                e.giocatoreId === g.id || 
                (e.dettagli && (e.dettagli.toUpperCase().includes(g.nome.toUpperCase()) || e.dettagli.includes(`#${g.numero} `)))
              )
            ).length;

            // Il totale dei gialli reali accumulati è la somma delle ammonizioni normali + 2 per ogni doppia ammonizione rimasta
            const totaleGialliEffettivi = ammonizioniNormaliRimaste + (doppieAmmonizioniRimaste * 2);

            // Il giocatore è ancora espulso solo se ha accumulato 2 o più gialli oppure se ha un rosso diretto
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
     
    // 4. Rimozione definitiva dell'evento dalla cronologia e dal cloud
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

  // Disattivato il controllo automatico intrusivo: la partita si chiude SOLO se l'utente preme esplicitamente sul Referto.
  const isFinePartitaRaggiunta = false;

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

      {/* 1. LOGIN CON SELEZIONE CAMPIONATO E ANNATA */}
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm mt-1 outline-none uppercase font-bold"
              >
                <option value="2026/2027">Stagione 2026 / 2027</option>
                <option value="2027/2028">Stagione 2027 / 2028</option>
              </select>
            </div>

            {/* NUOVO CAMPO: ANNATA */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase">Annata Squadra (es. 2010, 2011, Under 15)</label>
              <input
                type="text"
                placeholder="Es. 2010"
                value={annataSelezionata}
                onChange={(e) => setAnnataSelezionata(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm mt-1 outline-none focus:border-emerald-500 uppercase font-bold"
                required
              />
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

      {/* 2. ADMIN */}
      {faseApp === 'admin' && (
        <AdminPanel
          onEsci={disconnetti}
          onSelezionaSquadraDaAdmin={handleAdminEntraInSquadra}
        />
      )}

      {/* 3. DISTINTA */}
      {faseApp === 'distinta' && (
        <div className="space-y-4">
          <div className="max-w-4xl mx-auto flex flex-wrap justify-between items-center bg-slate-900 border border-slate-800 p-3.5 rounded-xl gap-3">
            <div className="flex items-center gap-3">
              {societaAttiva?.logo_url && (
                <img src={societaAttiva.logo_url} alt="Logo" className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-900" />
              )}
              <div>
                <span className="text-sm font-bold text-white block uppercase">{societaAttiva?.nome} (Annata {annataSelezionata})</span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 uppercase">
                  <MapPin className="w-3 h-3 text-emerald-400" /> {societaAttiva?.indirizzo_campo || 'Campo non specificato'} - {stagioneSelezionata}
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
            societa={societaAttiva}
            partitaIniziale={partitaInfo}
            rosaIniziale={rosa}
          />
        </div>
      )}

      {/* 4. LIVE MATCH */}
      {faseApp === 'partita' && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              onClick={() => setFaseApp('distinta')}
              className="text-xs uppercase font-bold text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Distinta
            </button>
             
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                Annata {annataSelezionata} ({stagioneSelezionata})
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
            <div className="flex-1">
              <h3 className="font-bold text-sm md:text-base text-slate-200 truncate uppercase">{partitaInfo?.squadraCasa || 'CASA'}</h3>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">{golCasa}</div>
            </div>

            <div className="px-3 flex flex-col items-center">
              <span className="text-slate-500 font-black text-sm tracking-widest">VS</span>
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-sm md:text-base text-slate-200 truncate uppercase">{partitaInfo?.squadraOspite || 'OSPITE'}</h3>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">{golOspiti}</div>
            </div>
          </div>

          {/* CRONOMETRO MULTI-DEVICE SINCRONIZZATO CON AVANZAMENTO SENZA STOP */}
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

          {/* GESTIONE EVENTI CON REGOLE 5 CAMBI, 3 SLOT ED INTERVALLO */}
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

      {/* 5. REFERTO FINALE */}
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
          onChiudi={() => setFaseApp('partita')}
          onTerminaEResetta={handleTerminaLiveEResetta}
        />
      )}

      {/* 6. ARCHIVIO REFERTI STORICI */}
      {faseApp === 'archivio' && (
        <ArchivioReferti
          societa={societaAttiva}
          campionato={stagioneSelezionata}
          annata={annataSelezionata}
          onTornaIndietro={() => setFaseApp(partitaInfo ? 'distinta' : 'distinta')}
        />
      )}

      {/* MODALE DI BLOCCO A FINE TEMPO */}
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
