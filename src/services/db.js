import { supabase } from '../supabaseClient';

export async function getSocieta() {
  const { data, error } = await supabase
    .from('societa')
    .select('*')
    .order('nome', { ascending: true });
  if (error) {
    console.error('Errore getSocieta:', error);
    return [];
  }
  return data || [];
}

export async function caricaStatoPartita(partitaId) {
  if (!partitaId) return { partita: null, eventi: [], giocatori: [] };
  try {
    const { data: partita } = await supabase
      .from('partite')
      .select('*')
      .eq('id', partitaId)
      .maybeSingle();

    const { data: eventi } = await supabase
      .from('eventi')
      .select('*')
      .eq('partita_id', partitaId)
      .order('created_at', { ascending: false });

    // 🚀 Scarica anche lo stato live aggiornato dei giocatori
    const { data: giocatori } = await supabase
      .from('giocatori')
      .select('*')
      .eq('partita_id', partitaId);

    return { 
      partita: partita || null, 
      eventi: eventi || [], 
      giocatori: giocatori || [] 
    };
  } catch (error) {
    console.error('Errore caricamento partita:', error);
    return null;
  }
}

export async function caricaRosaSocieta(societaId, campionato, annata) {
  if (!societaId || !campionato || !annata) return [];
  try {
    const campionatoPulito = (campionato || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulita = (annata || '').trim();
    const chiave = `${campionatoPulito}_${annataPulita.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // 1. LA FONTE PRINCIPALE E COMPLETA È LA MAPPA ROSA_BASE NELLA TABELLA SOCIETA
    const { data: soc, error: errSoc } = await supabase
      .from('societa')
      .select('rosa_base')
      .eq('id', societaId)
      .maybeSingle();

    if (!errSoc && soc?.rosa_base) {
      const rosaBaseAnnata = soc.rosa_base[chiave] || [];

      if (Array.isArray(rosaBaseAnnata) && rosaBaseAnnata.length > 0) {
        return rosaBaseAnnata.map((g, index) => ({
          id: String(g.id),
          numero: String(g.numero),
          nome: (g.nome || '').toUpperCase(),
          ruolo: g.ruolo || '',
          isConvocato: g.isConvocato ?? (index < 20),
          isTitolare: g.isTitolare ?? g.is_titolare ?? false,
          isCapitano: g.isCapitano ?? g.is_capitano ?? false,
          isVice: g.isVice ?? g.is_vice ?? false,
          ammonizioni: g.ammonizioni || 0,
          espulso: g.espulso || false
        }));
      }
    }

    // 2. FALLBACK SULLA TABELLA GIOCATORI SOLO SE ROSA_BASE È VUOTA
    const { data: gList, error: errG } = await supabase
      .from('giocatori')
      .select('*')
      .eq('societa_id', societaId)
      .eq('campionato', campionato)
      .eq('annata', annataPulita)
      .order('numero', { ascending: true });

    if (!errG && gList && gList.length > 0) {
      return gList.map((g, index) => ({
        id: String(g.id).replace(`${societaId}_${campionatoPulito}_${annataPulita}_`, '').replace(`${societaId}_`, ''),
        numero: String(g.numero),
        nome: (g.nome || '').toUpperCase(),
        ruolo: g.ruolo || '',
        isConvocato: g.isConvocato ?? (index < 20),
        isTitolare: g.is_titolare ?? false,
        isCapitano: g.is_capitano ?? false,
        isVice: g.is_vice ?? false,
        ammonizioni: g.ammonizioni || 0,
        espulso: g.espulso || false
      }));
    }

    return [];
  } catch (err) {
    console.error('Errore caricaRosaSocieta:', err);
    return [];
  }
}

export async function dbAggiungiGiocatore(societaId, giocatore, campionato, annata, partitaIdLive) {
  if (!societaId || !giocatore || !campionato || !annata) return;
  try {
    const campionatoPulito = (campionato || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulita = (annata || '').replace(/[^a-zA-Z0-9]/g, '_');
    const pId = partitaIdLive || `${societaId}_${campionatoPulito}_${annataPulita}_PARTITA_LIVE`;

    await supabase.from('partite').upsert({
      id: pId,
      societa_id: societaId,
      squadra_casa: societaId,
      campionato: campionato,
      annata: annata,
      stato: 'bozza',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    const riga = {
      id: `${societaId}_${campionatoPulito}_${annataPulita}_${giocatore.id}`,
      societa_id: societaId,
      partita_id: pId,
      campionato: campionato,
      annata: annata,
      numero: giocatore.numero,
      nome: giocatore.nome.trim().toUpperCase(),
      ruolo: '',
      is_titolare: giocatore.isTitolare ?? false,
      is_capitano: giocatore.isCapitano ?? false,
      is_vice: giocatore.isVice ?? false,
      ammonizioni: 0,
      espulso: false
    };

    await supabase.from('giocatori').upsert(riga);
  } catch (err) {
    console.error('Errore dbAggiungiGiocatore:', err);
  }
}

export async function dbModificaGiocatore(societaId, giocatore, campionato, annata) {
  if (!societaId || !giocatore || !campionato || !annata) return;
  try {
    const campionatoPulito = (campionato || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulita = (annata || '').replace(/[^a-zA-Z0-9]/g, '_');
    const idCompleto = `${societaId}_${campionatoPulito}_${annataPulita}_${giocatore.id}`;

    const payload = {
      id: idCompleto,
      societa_id: societaId,
      campionato: campionato,
      annata: annata,
      numero: giocatore.numero,
      nome: (giocatore.nome || '').trim().toUpperCase(),
      ruolo: giocatore.ruolo || '',
      is_titolare: giocatore.isTitolare ?? false,
      is_capitano: giocatore.isCapitano ?? false,
      is_vice: giocatore.isVice ?? false,
      ammonizioni: giocatore.ammonizioni || 0,
      espulso: giocatore.espulso || false
    };

    const { error } = await supabase
      .from('giocatori')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Errore dbModificaGiocatore upsert:', error);
    }
  } catch (err) {
    console.error('Errore dbModificaGiocatore:', err);
  }
}

export async function dbEliminaGiocatore(societaId, giocatoreId, campionato, annata) {
  if (!societaId || !giocatoreId || !campionato || !annata) return;
  try {
    const campionatoPulito = (campionato || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulita = (annata || '').replace(/[^a-zA-Z0-9]/g, '_');

    await supabase
      .from('giocatori')
      .delete()
      .eq('id', `${societaId}_${campionatoPulito}_${annataPulita}_${giocatoreId}`);
  } catch (err) {
    console.error('Errore dbEliminaGiocatore:', err);
  }
}

export async function salvaDistintaSuDb(societaId, partitaId, partitaInfo, giocatori, campionato, annata) {
  if (!campionato || !annata) return { success: false, error: 'Mancano campionato o annata' };
  try {
    const campionatoPulito = (campionato || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulita = (annata || '').replace(/[^a-zA-Z0-9]/g, '_');

    await supabase.from('partite').upsert({
      id: partitaId,
      societa_id: societaId,
      squadra_casa: partitaInfo.squadraCasa,
      squadra_ospite: partitaInfo.squadraOspite,
      data_gara: partitaInfo.dataPartita || new Date().toISOString().split('T')[0],
      is_nostra_casa: partitaInfo.isNostraCasa ?? true,
      campionato: campionato,
      annata: annata,
      stato: 'in-corso',
      updated_at: new Date().toISOString()
    });

    const righeGiocatori = giocatori.map((g) => ({
      id: `${societaId}_${campionatoPulito}_${annataPulita}_${g.id}`,
      partita_id: partitaId,
      societa_id: societaId,
      campionato: campionato,
      annata: annata,
      numero: g.numero,
      nome: g.nome,
      ruolo: g.ruolo || '',
      is_titolare: g.isTitolare ?? false,
      is_capitano: g.isCapitano ?? false,
      is_vice: g.isVice ?? false,
      ammonizioni: g.ammonizioni || 0,
      espulso: g.espulso || false
    }));

    await supabase.from('giocatori').upsert(righeGiocatori);
    return { success: true };
  } catch (error) {
    console.error('Errore salvataggio distinta:', error);
    return { success: false, error };
  }
}

export async function salvaBozzaPartitaSuDb(societaId, partitaId, partitaInfo, campionato, annata) {
  if (!societaId || !campionato || !annata) return null;
  try {
    const campionatoPulito = (campionato || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulita = (annata || '').replace(/[^a-zA-Z0-9]/g, '_');
    const chiave = `${campionatoPulito}_${annataPulita}`;

    const { data: soc } = await supabase
      .from('societa')
      .select('staff_base')
      .eq('id', societaId)
      .maybeSingle();

    let staffMap = {};
    const dbStaff = soc?.staff_base;

    if (dbStaff && typeof dbStaff === 'object' && !Array.isArray(dbStaff)) {
      if (dbStaff.allenatore !== undefined || dbStaff.dirigente !== undefined || dbStaff.squadraCasa !== undefined) {
        staffMap[chiave] = { ...dbStaff };
      } else {
        staffMap = { ...dbStaff };
      }
    }

    const staffEsistentePerAnnata = staffMap[chiave] || {};

    staffMap[chiave] = {
      ...staffEsistentePerAnnata,
      squadraCasa: partitaInfo.squadraCasa || '',
      squadraOspite: partitaInfo.squadraOspite || '',
      dataPartita: partitaInfo.dataPartita || '',
      isNostraCasa: partitaInfo.isNostraCasa ?? true,
      allenatore: partitaInfo.allenatore || '',
      allenatoreSeconda: partitaInfo.allenatoreSeconda || '',
      dirigente: partitaInfo.dirigente || '',
      dirigenteUfficiali: partitaInfo.dirigenteUfficiali || '',
      assistenteArbitro: partitaInfo.assistenteArbitro || '',
      medicoSociale: partitaInfo.medicoSociale || '',
      massaggiatore: partitaInfo.massaggiatore || '',
      preparatoreAtletico: partitaInfo.preparatoreAtletico || '',
      preparatorePortieri: partitaInfo.preparatorePortieri || ''
    };

    const { error: errSoc } = await supabase
      .from('societa')
      .update({ staff_base: staffMap })
      .eq('id', societaId);

    if (errSoc) {
      console.error('Errore salvataggio staff in societa:', errSoc);
    }

    if (partitaId) {
      try {
        await supabase.from('partite').upsert({
          id: partitaId,
          societa_id: societaId,
          squadra_casa: partitaInfo.squadraCasa || '',
          squadra_ospite: partitaInfo.squadraOspite || '',
          data_gara: partitaInfo.dataPartita || new Date().toISOString().split('T')[0],
          is_nostra_casa: partitaInfo.isNostraCasa ?? true,
          campionato: campionato,
          annata: annata,
          stato: 'bozza',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (errP) {
        console.warn('Avviso bozza partita:', errP);
      }
    }

    return true;
  } catch (err) {
    console.error('Errore salvaBozzaPartitaSuDb:', err);
    return null;
  }
}

export async function salvaBozzaKeepalive(societaId, partitaInfo, campionato, annata) {
  if (!societaId || !partitaInfo || !campionato || !annata) return;
  try {
    await salvaBozzaPartitaSuDb(societaId, null, partitaInfo, campionato, annata);
  } catch (err) {
    console.warn('Keepalive flush non riuscito:', err);
  }
}

export async function syncStatoPartitaSuDb(partitaId, dati) {
  if (!partitaId) return;
  const updateData = {
    gol_casa: dati.golCasa,
    gol_ospite: dati.golOspiti,
    tempo: dati.tempoGara,
    secondi_gara: dati.secondiGara,
    in_esecuzione: dati.inEsecuzione,
    avviato_alle: dati.avviatoAlle !== undefined ? dati.avviatoAlle : null,
    recupero: dati.recupero,
    minuto_corrente: dati.minutoCorrente,
    slot_usati: dati.slotUsati,
    cambi_effettuati: dati.cambiEffettuati,
    updated_at: new Date().toISOString()
  };

  await supabase.from('partite').update(updateData).eq('id', partitaId);
}

export async function registraEventoCloud(partitaId, evento, campionato, annata) {
  if (!campionato || !annata) return;
  await supabase.from('eventi').insert([{
    id: evento.id,
    partita_id: partitaId,
    campionato: campionato,
    annata: annata,
    minuto: evento.minuto,
    tempo: evento.tempo,
    tipo: evento.tipo,
    dettagli: evento.dettagli
  }]);

  if (partitaId) {
    await supabase.from('partite').update({ updated_at: new Date().toISOString() }).eq('id', partitaId);
  }
}

export async function eliminaEventoCloud(eventoId, partitaId) {
  await supabase.from('eventi').delete().eq('id', eventoId);

  if (partitaId) {
    await supabase.from('partite').update({ updated_at: new Date().toISOString() }).eq('id', partitaId);
  }
}

export async function aggiornaGiocatoriCloud(partitaId, societaId, giocatori, campionato, annata) {
  if (!campionato || !annata) return;
  const campionatoPulito = (campionato || '').replace(/[^a-zA-Z0-9]/g, '_');
  const annataPulita = (annata || '').replace(/[^a-zA-Z0-9]/g, '_');

  const righe = giocatori.map(g => ({
    id: `${societaId}_${campionatoPulito}_${annataPulita}_${g.id}`,
    partita_id: partitaId,
    societa_id: societaId,
    campionato: campionato,
    annata: annata,
    numero: g.numero,
    nome: g.nome,
    ruolo: g.ruolo || '',
    is_titolare: g.isTitolare ?? false,
    is_capitano: g.isCapitano ?? false,
    is_vice: g.isVice ?? false,
    ammonizioni: g.ammonizioni || 0,
    espulso: g.espulso || false
  }));

  await supabase.from('giocatori').upsert(righe);

  // 🚀 Forza anche l'aggiornamento del timestamp partita per sincronizzare i cambi rosa in tempo reale
  if (partitaId) {
    await supabase.from('partite').update({ updated_at: new Date().toISOString() }).eq('id', partitaId);
  }
}

export async function salvaRosaBaseSocieta(societaId, giocatori, staff, campionato, annata) {
  if (!campionato || !annata) return null;
  try {
    const campionatoPulito = (campionato || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulita = (annata || '').replace(/[^a-zA-Z0-9]/g, '_');
    const chiave = `${campionatoPulito}_${annataPulita}`;

    const { data: socCorrente } = await supabase
      .from('societa')
      .select('rosa_base, staff_base')
      .eq('id', societaId)
      .single();

    const rosaMap = (socCorrente?.rosa_base && typeof socCorrente.rosa_base === 'object' && !Array.isArray(socCorrente.rosa_base))
      ? { ...socCorrente.rosa_base }
      : {};

    let staffMap = {};
    const dbStaff = socCorrente?.staff_base;
    
    if (dbStaff && typeof dbStaff === 'object' && !Array.isArray(dbStaff)) {
      if (dbStaff.allenatore !== undefined || dbStaff.dirigente !== undefined || dbStaff.squadraCasa !== undefined) {
        staffMap[chiave] = { ...dbStaff };
      } else {
        staffMap = { ...dbStaff };
      }
    }

    const payload = {};

    if (giocatori !== undefined) {
      rosaMap[chiave] = giocatori;
      payload.rosa_base = rosaMap;
    }

    if (staff !== undefined) {
      if (!staffMap[chiave]) {
        staffMap[chiave] = {};
      }
      staffMap[chiave] = {
        ...staffMap[chiave],
        ...staff
      };
      payload.staff_base = staffMap;
    }

    const { data, error } = await supabase
      .from('societa')
      .update(payload)
      .eq('id', societaId)
      .select()
      .single();

    if (error) console.error('Errore salvaRosaBaseSocieta:', error);
    return data;
  } catch (error) {
    console.error('Errore salvaRosaBaseSocieta:', error);
    return null;
  }
}

export async function getSocietaById(societaId) {
  const { data, error } = await supabase
    .from('societa')
    .select('*')
    .eq('id', societaId)
    .single();
  if (error) return null;
  return data;
}

export async function archiviaPartitaEResettaLive(societaId, livePartitaId, partitaInfo, datiGara, eventi, giocatori, campionato, annata) {
  if (!campionato || !annata) return { success: false, error: 'Mancano campionato o annata' };
  try {
    const storicoId = `STORICO_${societaId}_${Date.now()}`;

    // 1. Determiniamo la durata totale della partita (90' o eventuale recupero dagli eventi)
    let durataTotalePartita = 90;
    if (eventi && eventi.length > 0) {
      const ultimoMinutoEvento = Math.max(...eventi.map(e => e.minuto || 0));
      if (ultimoMinutoEvento > 90) {
        durataTotalePartita = ultimoMinutoEvento;
      }
    }

    // 🚀 2. CALCOLO MATEMATICO PRECISO DEI MINUTI DI OGNI GIOCATORE PRIMA DI ARCHIVIARE
    const giocatoriConMinutiCorretti = giocatori.map((g, index) => {
      const numG = String(g.numero || '').trim();
      const idG = g.id;
      const nomeG = (g.nome || '').toUpperCase().trim();

      const matchGiocatore = (ev) => {
        if (!ev) return false;
        if (ev.giocatoreId === idG || ev.esceId === idG || ev.entraId === idG || ev.giocatore_id === idG) return true;
        const det = (ev.dettagli || '').toUpperCase();
        if (nomeG && det.includes(nomeG)) return true;
        if (numG) {
          if (det.includes(`#${numG}`) || det.includes(` #${numG}`) || det.includes(` # ${numG}`) || det.includes(`-${numG}`)) return true;
        }
        return false;
      };

      const eventoEspulsione = eventi.find(e => e.tipo === 'ESPULSIONE' && matchGiocatore(e));
      const eEspulso = !!eventoEspulsione || g.espulso;

      let minutoUscita = null;
      let minutoEntrata = null;

      eventi.forEach(e => {
        const tipo = (e.tipo || '').toUpperCase();
        if (tipo.includes('SOSTITUZIONE') || tipo.includes('CAMBIO')) {
          const minEv = e.minuto || 0;
          const det = (e.dettagli || '').toUpperCase();
          const eUscito = e.esceId === idG || det.includes(`ESCE #${numG}`) || (nomeG && det.includes(`ESCE ${nomeG}`));
          const eEntrato = e.entraId === idG || det.includes(`ENTRA #${numG}`) || (nomeG && det.includes(`ENTRA ${nomeG}`));

          if (eUscito) minutoUscita = minEv;
          if (eEntrato) minutoEntrata = minEv;
        }
      });

      const eTitolare = !!g.isTitolare || index < 11;
      let minutiCalcolati = 0;

      if (eTitolare) {
        let tempoFine = durataTotalePartita;
        if (minutoUscita !== null) tempoFine = Math.min(tempoFine, minutoUscita);
        if (eEspulso && eventoEspulsione?.minuto !== undefined) tempoFine = Math.min(tempoFine, eventoEspulsione.minuto);
        minutiCalcolati = Math.max(0, tempoFine);
      } else {
        if (minutoEntrata !== null) {
          let tempoInizio = minutoEntrata;
          let tempoFine = durataTotalePartita;
          if (minutoUscita !== null && minutoUscita > tempoInizio) tempoFine = Math.min(tempoFine, minutoUscita);
          if (eEspulso && eventoEspulsione?.minuto !== undefined && eventoEspulsione.minuto > tempoInizio) tempoFine = Math.min(tempoFine, eventoEspulsione.minuto);
          minutiCalcolati = Math.max(0, tempoFine - tempoInizio);
        } else {
          minutiCalcolati = 0;
        }
      }

      return {
        ...g,
        minuti: minutiCalcolati
      };
    });

    await supabase.from('partite').insert([{
      id: storicoId,
      societa_id: societaId,
      squadra_casa: partitaInfo.squadraCasa,
      squadra_ospite: partitaInfo.squadraOspite,
      gol_casa: datiGara.golCasa,
      gol_ospite: datiGara.golOspiti,
      data_gara: partitaInfo.dataPartita || new Date().toISOString().split('T')[0],
      campionato: campionato,
      annata: annata,
      stato: 'completata',
      referto_eventi: eventi,
      referto_giocatori: giocatoriConMinutiCorretti,
      terminata_il: new Date().toISOString(),
      allenatore: partitaInfo.allenatore || '',
      allenatore_seconda: partitaInfo.allenatoreSeconda || '',
      dirigente: partitaInfo.dirigente || '',
      dirigente_ufficiali: partitaInfo.dirigenteUfficiali || '',
      assistente_arbitro: partitaInfo.assistenteArbitro || '',
      medico_sociale: partitaInfo.medicoSociale || '',
      massaggiatore: partitaInfo.massaggiatore || '',
      preparatore_atletico: partitaInfo.preparatoreAtletico || '',
      preparatore_portieri: partitaInfo.preparatorePortieri || ''
    }]);

    await supabase
      .from('eventi')
      .update({ partita_id: storicoId })
      .eq('partita_id', livePartitaId);

    await supabase.from('partite').update({
      squadra_ospite: '',
      gol_casa: 0,
      gol_ospite: 0,
      tempo: 1,
      secondi_gara: 0,
      in_esecuzione: false,
      avviato_alle: null,
      recupero: 0,
      minuto_corrente: 1,
      slot_usati: 0,
      cambi_effettuati: 0,
      stato: 'bozza',
      data_gara: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    }).eq('id', livePartitaId);

    const { data: socCorrente } = await supabase
      .from('societa')
      .select('staff_base')
      .eq('id', societaId)
      .maybeSingle();

    const campionatoPulito = (campionato || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulita = (annata || '').replace(/[^a-zA-Z0-9]/g, '_');
    const chiave = `${campionatoPulito}_${annataPulita}`;

    if (socCorrente?.staff_base && typeof socCorrente.staff_base === 'object') {
      let staffMap = { ...socCorrente.staff_base };
      if (staffMap[chiave]) {
        staffMap[chiave].squadraOspite = ''; 
      }
      await supabase.from('societa').update({ staff_base: staffMap }).eq('id', societaId);
    }

    const { data: socData } = await supabase
      .from('societa')
      .select('rosa_base')
      .eq('id', societaId)
      .maybeSingle();

    let rosaCompleta = [];
    if (socData?.rosa_base && socData.rosa_base[chiave]) {
      rosaCompleta = socData.rosa_base[chiave];
    }

    const listaDaSalvare = (rosaCompleta.length > 0 ? rosaCompleta : giocatori).map(g => ({
      ...g,
      ammonizioni: 0,
      espulso: false,
      isConvocato: true
    }));

    await aggiornaGiocatoriCloud(livePartitaId, societaId, listaDaSalvare, campionato, annata);
    await salvaRosaBaseSocieta(societaId, listaDaSalvare, undefined, campionato, annata);

    return { success: true, storicoId };
  } catch (err) {
    console.error('Errore archiviaPartitaEResettaLive:', err);
    return { success: false, error: err };
  }
}
export async function caricaStoricoReferti(societaId, campionato, annata) {
  try {
    let query = supabase
      .from('partite')
      .select('*')
      .eq('societa_id', societaId)
      .eq('stato', 'completata');

    if (campionato) query = query.eq('campionato', campionato);
    if (annata) query = query.eq('annata', annata);

    const { data, error } = await query.order('terminata_il', { ascending: false });

    if (error) {
      console.error('Errore caricaStoricoReferti:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Errore caricaStoricoReferti:', err);
    return [];
  }
}

export async function eliminaRefertoStorico(refertoId) {
  try {
    await supabase.from('eventi').delete().eq('partita_id', refertoId);
    const { error } = await supabase.from('partite').delete().eq('id', refertoId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Errore eliminaRefertoStorico:', err);
    return false;
  }
}

export async function loginSistema(username, password, campionatoSelezionato) {
  const u = username.trim();
  const p = password.trim();
  const campionatoScelto = (campionatoSelezionato || '').trim();

  if (u === 'admin' && p === 'admin2026') {
    return {
      success: true,
      isAdmin: true,
      utente: { username: 'admin', ruolo: 'superadmin' }
    };
  }

  let query = supabase
    .from('utenti_panchina')
    .select('*, societa(*)')
    .eq('username', u)
    .eq('password_chiaro', p);

  if (campionatoScelto) {
    query = query.eq('campionato', campionatoScelto);
  }

  const { data: utente, error } = await query.maybeSingle();

  if (error || !utente) {
    return { 
      success: false, 
      messaggio: 'Credenziali non valide o non abilitate per il campionato selezionato.' 
    };
  }

  if (!utente.societa) {
    return { success: false, messaggio: 'Nessuna società associata a questo profilo.' };
  }

  const scadenza = new Date(utente.societa.data_scadenza_prova);
  if (!utente.societa.attiva || new Date() > scadenza) {
    return {
      success: false,
      messaggio: "Periodo di prova di 30 giorni scaduto. Contatta l'amministratore."
    };
  }

  return {
    success: true,
    isAdmin: false,
    utente,
    societa: utente.societa
  };
}

export const loginDirigente = loginSistema;

export async function adminCreaSquadra({ codice, nome, indirizzoCampo, logoUrl }) {
  const societaId = codice.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const dataScadenza = new Date();
  dataScadenza.setDate(dataScadenza.getDate() + 30);

  const { data, error } = await supabase.from('societa').upsert({
    id: societaId,
    codice_societa: codice.trim().toUpperCase(),
    nome: nome.trim().toUpperCase(),
    indirizzo_campo: (indirizzoCampo || '').trim().toUpperCase(),
    logo_url: logoUrl || '',
    data_scadenza_prova: dataScadenza.toISOString(),
    attiva: true,
    staff_base: {},
    rosa_base: []
  }).select().single();

  if (error) throw error;

  return data;
}

export async function adminCreaUtente({ societaId, username, password, ruolo, stagione }) {
  const { data, error } = await supabase.from('utenti_panchina').insert([{
    id: `${societaId}_usr_${Date.now()}`,
    societa_id: societaId,
    username: username.trim(),
    password_chiaro: password.trim(),
    ruolo: ruolo || 'dirigente',
    stagione: stagione || ''
  }]).select().single();

  if (error) throw error;
  return data;
}

export async function adminGetUtentiSocieta(societaId) {
  const { data, error } = await supabase
    .from('utenti_panchina')
    .select('*')
    .eq('societa_id', societaId);
  return data || [];
}

export async function adminAggiornaStatoSocieta(societaId, { attiva, dataScadenza }) {
  const updateData = {};
  if (attiva !== undefined) updateData.attiva = attiva;
  if (dataScadenza !== undefined) updateData.data_scadenza_prova = dataScadenza;

  const { data, error } = await supabase
    .from('societa')
    .update(updateData)
    .eq('id', societaId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function adminEliminaSocietaCompleta(societaId) {
  await supabase.from('eventi').delete().in(
    'partita_id',
    (await supabase.from('partite').select('id').eq('societa_id', societaId)).data?.map(p => p.id) || []
  );
  await supabase.from('giocatori').delete().eq('societa_id', societaId);
  await supabase.from('partite').delete().eq('societa_id', societaId);
  await supabase.from('utenti_panchina').delete().eq('societa_id', societaId);
  
  const { error } = await supabase.from('societa').delete().eq('id', societaId);
  if (error) throw error;
  return { success: true };
}

export async function adminEliminaUtente(utenteId) {
  const { error } = await supabase.from('utenti_panchina').delete().eq('id', utenteId);
  if (error) throw error;
  return { success: true };
}

export async function adminModificaPasswordUtente(utenteId, nuovaPassword) {
  const { error } = await supabase
    .from('utenti_panchina')
    .update({ password_chiaro: nuovaPassword.trim() })
    .eq('id', utenteId);
  if (error) throw error;
  return { success: true };
}
