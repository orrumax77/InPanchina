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
  try {
    const { data: partita } = await supabase
      .from('partite')
      .select('*')
      .eq('id', partitaId)
      .single();

    const { data: eventi } = await supabase
      .from('eventi')
      .select('*')
      .eq('partita_id', partitaId)
      .order('created_at', { ascending: false });

    return { partita, eventi: eventi || [] };
  } catch (error) {
    console.error('Errore caricamento partita:', error);
    return null;
  }
}

export async function caricaRosaSocieta(societaId) {
  if (!societaId) return [];
  try {
    // 1. Legge prima direttamente dalla tabella societa il campo rosa_base (il più affidabile e immediato)
    const { data: soc, error: errSoc } = await supabase
      .from('societa')
      .select('rosa_base')
      .eq('id', societaId)
      .maybeSingle();

    if (!errSoc && soc?.rosa_base && Array.isArray(soc.rosa_base) && soc.rosa_base.length > 0) {
      return soc.rosa_base.map(g => ({
        id: String(g.id),
        numero: String(g.numero),
        nome: (g.nome || '').toUpperCase(),
        ruolo: g.ruolo || '',
        isTitolare: g.isTitolare ?? g.is_titolare ?? false,
        isCapitano: g.isCapitano ?? g.is_capitano ?? false,
        isVice: g.isVice ?? g.is_vice ?? false,
        ammonizioni: g.ammonizioni || 0,
        espulso: g.espulso || false
      }));
    }

    // 2. Se vuoto, cerca nella tabella giocatori
    const { data: gList, error: errG } = await supabase
      .from('giocatori')
      .select('*')
      .eq('societa_id', societaId)
      .order('numero', { ascending: true });

    if (!errG && gList && gList.length > 0) {
      return gList.map(g => ({
        id: g.id.replace(`${societaId}_`, ''),
        numero: String(g.numero),
        nome: (g.nome || '').toUpperCase(),
        ruolo: g.ruolo || '',
        isTitolare: g.is_titolare,
        isCapitano: g.isCapitano ?? g.is_capitano,
        isVice: g.isVice ?? g.is_vice,
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

export async function dbAggiungiGiocatore(societaId, giocatore) {
  if (!societaId || !giocatore) return;
  try {
    // 1. Assicura che la partita live esista prima di inserire nella tabella giocatori
    await supabase.from('partite').upsert({
      id: `${societaId}_PARTITA_LIVE`,
      societa_id: societaId,
      squadra_casa: societaId,
      stato: 'bozza'
    }, { onConflict: 'id' });

    // 2. Inserisce nella tabella giocatori
    const riga = {
      id: `${societaId}_${giocatore.id}`,
      societa_id: societaId,
      partita_id: `${societaId}_PARTITA_LIVE`,
      numero: giocatore.numero,
      nome: giocatore.nome.trim().toUpperCase(),
      ruolo: '',
      is_titolare: giocatore.isTitolare ?? false,
      is_capitano: giocatore.isCapitano ?? false,
      is_vice: giocatore.isVice ?? false,
      ammonizioni: 0,
      espulso: false
    };

    const { error: errG } = await supabase.from('giocatori').upsert(riga);
    if (errG) console.error('Errore inserimento riga giocatore:', errG);

    // 3. Aggiorna contemporaneamente anche il JSON rosa_base sulla tabella societa
    const { data: soc } = await supabase
      .from('societa')
      .select('rosa_base')
      .eq('id', societaId)
      .single();

    const rosaAttuale = Array.isArray(soc?.rosa_base) ? soc.rosa_base : [];
    const nuovaRosa = [
      ...rosaAttuale.filter(x => String(x.id) !== String(giocatore.id)),
      {
        id: String(giocatore.id),
        numero: String(giocatore.numero),
        nome: giocatore.nome.trim().toUpperCase(),
        ruolo: '',
        isTitolare: giocatore.isTitolare ?? false,
        isCapitano: giocatore.isCapitano ?? false,
        isVice: giocatore.isVice ?? false,
        ammonizioni: 0,
        espulso: false
      }
    ];

    await supabase
      .from('societa')
      .update({ rosa_base: nuovaRosa, updated_at: new Date() })
      .eq('id', societaId);
  } catch (err) {
    console.error('Errore dbAggiungiGiocatore:', err);
  }
}

export async function dbModificaGiocatore(societaId, giocatore) {
  if (!societaId || !giocatore) return;
  try {
    const payload = {
      numero: giocatore.numero,
      nome: giocatore.nome.trim().toUpperCase(),
      is_titolare: giocatore.isTitolare,
      is_capitano: giocatore.isCapitano,
      is_vice: giocatore.isVice
    };

    const { error } = await supabase
      .from('giocatori')
      .update(payload)
      .eq('id', `${societaId}_${giocatore.id}`);

    if (error) console.error('Errore dbModificaGiocatore:', error);

    // Aggiorna anche rosa_base nella tabella societa
    const { data: soc } = await supabase
      .from('societa')
      .select('rosa_base')
      .eq('id', societaId)
      .single();

    if (soc?.rosa_base && Array.isArray(soc.rosa_base)) {
      const nuovaRosa = soc.rosa_base.map(g => {
        if (String(g.id) === String(giocatore.id)) {
          return {
            ...g,
            numero: String(giocatore.numero),
            nome: giocatore.nome.trim().toUpperCase(),
            isTitolare: giocatore.isTitolare,
            isCapitano: giocatore.isCapitano,
            isVice: giocatore.isVice
          };
        }
        return g;
      });

      await supabase
        .from('societa')
        .update({ rosa_base: nuovaRosa, updated_at: new Date() })
        .eq('id', societaId);
    }
  } catch (err) {
    console.error('Errore dbModificaGiocatore:', err);
  }
}

export async function dbEliminaGiocatore(societaId, giocatoreId) {
  if (!societaId || !giocatoreId) return;
  try {
    const { error } = await supabase
      .from('giocatori')
      .delete()
      .eq('id', `${societaId}_${giocatoreId}`);

    if (error) console.error('Errore dbEliminaGiocatore:', error);

    // Rimuove anche da rosa_base nella tabella societa
    const { data: soc } = await supabase
      .from('societa')
      .select('rosa_base')
      .eq('id', societaId)
      .single();

    if (soc?.rosa_base && Array.isArray(soc.rosa_base)) {
      const nuovaRosa = soc.rosa_base.filter(g => String(g.id) !== String(giocatoreId));
      await supabase
        .from('societa')
        .update({ rosa_base: nuovaRosa, updated_at: new Date() })
        .eq('id', societaId);
    }
  } catch (err) {
    console.error('Errore dbEliminaGiocatore:', err);
  }
}

export async function salvaDistintaSuDb(societaId, partitaId, partitaInfo, giocatori) {
  try {
    await supabase.from('partite').upsert({
      id: partitaId,
      societa_id: societaId,
      squadra_casa: partitaInfo.squadraCasa,
      squadra_ospite: partitaInfo.squadraOspite,
      allenatore: partitaInfo.allenatore || '',
      allenatore_seconda: partitaInfo.allenatoreSeconda || '',
      dirigente: partitaInfo.dirigente || '',
      dirigente_ufficiali: partitaInfo.dirigenteUfficiali || '',
      assistente_arbitro: partitaInfo.assistenteArbitro || '',
      data_gara: partitaInfo.dataPartita || new Date().toISOString().split('T')[0],
      is_nostra_casa: partitaInfo.isNostraCasa ?? true,
      stato: 'in-corso',
      updated_at: new Date()
    });

    const righeGiocatori = giocatori.map((g) => ({
      id: `${societaId}_${g.id}`,
      partita_id: partitaId,
      societa_id: societaId,
      numero: g.numero,
      nome: g.nome,
      ruolo: '',
      is_titolare: g.isTitolare,
      is_capitano: g.isCapitano,
      is_vice: g.isVice,
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

export async function salvaBozzaPartitaSuDb(societaId, partitaId, partitaInfo) {
  try {
    const { data, error } = await supabase.from('partite').upsert({
      id: partitaId,
      societa_id: societaId,
      squadra_casa: partitaInfo.squadraCasa || '',
      squadra_ospite: partitaInfo.squadraOspite || '',
      allenatore: partitaInfo.allenatore || '',
      allenatore_seconda: partitaInfo.allenatoreSeconda || '',
      dirigente: partitaInfo.dirigente || '',
      dirigente_ufficiali: partitaInfo.dirigenteUfficiali || '',
      assistente_arbitro: partitaInfo.assistenteArbitro || '',
      data_gara: partitaInfo.dataPartita || new Date().toISOString().split('T')[0],
      is_nostra_casa: partitaInfo.isNostraCasa ?? true,
      updated_at: new Date()
    }).select().single();

    if (error) console.error('Errore salvaBozzaPartitaSuDb:', error);
    return data;
  } catch (err) {
    console.error('Errore salvaBozzaPartitaSuDb:', err);
    return null;
  }
}

// SINCRONIZZAZIONE REALTIME CON TIMESTAMP ASSOLUTO
export async function syncStatoPartitaSuDb(partitaId, dati) {
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
    updated_at: new Date()
  };

  await supabase.from('partite').update(updateData).eq('id', partitaId);
}

export async function registraEventoCloud(partitaId, evento) {
  await supabase.from('eventi').insert([{
    id: evento.id,
    partita_id: partitaId,
    minuto: evento.minuto,
    tempo: evento.tempo,
    tipo: evento.tipo,
    dettagli: evento.dettagli
  }]);
}

export async function eliminaEventoCloud(eventoId) {
  await supabase.from('eventi').delete().eq('id', eventoId);
}

export async function aggiornaGiocatoriCloud(partitaId, societaId, giocatori) {
  const righe = giocatori.map(g => ({
    id: `${societaId}_${g.id}`,
    partita_id: partitaId,
    societa_id: societaId,
    numero: g.numero,
    nome: g.nome,
    ruolo: '',
    is_titolare: g.isTitolare,
    is_capitano: g.isCapitano,
    is_vice: g.isVice,
    ammonizioni: g.ammonizioni || 0,
    espulso: g.espulso || false
  }));
  await supabase.from('giocatori').upsert(righe);
}

export async function salvaRosaBaseSocieta(societaId, giocatori, staff) {
  try {
    const payload = { updated_at: new Date() };

    if (giocatori !== undefined) {
      payload.rosa_base = giocatori;
    }

    if (staff !== undefined) {
      payload.staff_base = staff;
      if (staff.allenatore !== undefined) payload.allenatore_predefinito = staff.allenatore;
      if (staff.allenatoreSeconda !== undefined) payload.allenatore_seconda_predefinito = staff.allenatoreSeconda;
      if (staff.dirigente !== undefined) payload.dirigente_predefinito = staff.dirigente;
      if (staff.dirigenteUfficiali !== undefined) payload.dirigente_ufficiali_predefinito = staff.dirigenteUfficiali;
      if (staff.assistenteArbitro !== undefined) payload.assistente_arbitro_predefinito = staff.assistenteArbitro;
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

export async function archiviaPartitaEResettaLive(societaId, livePartitaId, partitaInfo, datiGara, eventi, giocatori) {
  try {
    const storicoId = `STORICO_${societaId}_${Date.now()}`;

    await supabase.from('partite').insert([{
      id: storicoId,
      societa_id: societaId,
      squadra_casa: partitaInfo.squadraCasa,
      squadra_ospite: partitaInfo.squadraOspite,
      allenatore: partitaInfo.allenatore || '',
      allenatore_seconda: partitaInfo.allenatoreSeconda || '',
      dirigente: partitaInfo.dirigente || '',
      dirigente_ufficiali: partitaInfo.dirigenteUfficiali || '',
      assistente_arbitro: partitaInfo.assistenteArbitro || '',
      gol_casa: datiGara.golCasa,
      gol_ospite: datiGara.golOspiti,
      data_gara: partitaInfo.dataPartita || new Date().toISOString().split('T')[0],
      stato: 'completata',
      referto_eventi: eventi,
      referto_giocatori: giocatori,
      terminata_il: new Date().toISOString()
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
      updated_at: new Date()
    }).eq('id', livePartitaId);

    const resetGiocatori = giocatori.map(g => ({
      ...g,
      ammonizioni: 0,
      espulso: false
    }));
    await aggiornaGiocatoriCloud(livePartitaId, societaId, resetGiocatori);

    return { success: true, storicoId };
  } catch (err) {
    console.error('Errore archiviaPartitaEResettaLive:', err);
    return { success: false, error: err };
  }
}

export async function caricaStoricoReferti(societaId) {
  try {
    const { data, error } = await supabase
      .from('partite')
      .select('*')
      .eq('societa_id', societaId)
      .eq('stato', 'completata')
      .order('terminata_il', { ascending: false });

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

export async function loginSistema(username, password) {
  const u = username.trim();
  const p = password.trim();

  if (u === 'admin' && p === 'admin2026') {
    return {
      success: true,
      isAdmin: true,
      utente: { username: 'admin', ruolo: 'superadmin' }
    };
  }

  const { data: utente, error } = await supabase
    .from('utenti_panchina')
    .select('*, societa(*)')
    .eq('username', u)
    .eq('password_chiaro', p)
    .single();

  if (error || !utente) {
    return { success: false, messaggio: 'Credenziali non valide.' };
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

  // 1. Inserisce la società inizializzando rosa_base vuota
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

  // 2. Crea subito la riga LIVE in partite per garantire l'integrità referenziale dei giocatori
  await supabase.from('partite').upsert({
    id: `${societaId}_PARTITA_LIVE`,
    societa_id: societaId,
    squadra_casa: nome.trim().toUpperCase(),
    squadra_ospite: '',
    stato: 'bozza',
    tempo: 1,
    secondi_gara: 0,
    in_esecuzione: false,
    avviato_alle: null,
    recupero: 0,
    minuto_corrente: 1,
    slot_usati: 0,
    cambi_effettuati: 0,
    data_gara: new Date().toISOString().split('T')[0],
    updated_at: new Date()
  });

  return data;
}

export async function adminCreaUtente({ societaId, username, password, ruolo, stagione }) {
  const { data, error } = await supabase.from('utenti_panchina').insert([{
    id: `${societaId}_usr_${Date.now()}`,
    societa_id: societaId,
    username: username.trim(),
    password_chiaro: password.trim(),
    ruolo: ruolo || 'dirigente',
    stagione: stagione || '2026/2027'
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
