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

// Carica l'intera rosa salvata per la società (persistente)
export async function caricaRosaSocieta(societaId) {
  try {
    const { data, error } = await supabase
      .from('giocatori')
      .select('*')
      .eq('societa_id', societaId)
      .order('numero', { ascending: true });

    if (error) {
      console.error('Errore caricaRosaSocieta:', error);
      return [];
    }

    return (data || []).map(g => ({
      id: g.id.replace(`${societaId}_`, ''),
      numero: String(g.numero),
      nome: (g.nome || '').toUpperCase(),
      ruolo: g.ruolo || '',
      isTitolare: g.is_titolare,
      isCapitano: g.is_capitano,
      isVice: g.is_vice,
      ammonizioni: g.ammonizioni || 0,
      espulso: g.espulso || false
    }));
  } catch (err) {
    console.error('Errore caricaRosaSocieta:', err);
    return [];
  }
}

// 1. INSERIMENTO DIRETTO GIOCATORE SU SUPABASE
export async function dbAggiungiGiocatore(societaId, giocatore) {
  try {
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

    const { error } = await supabase.from('giocatori').upsert(riga);
    if (error) console.error('Errore dbAggiungiGiocatore:', error);
  } catch (err) {
    console.error('Errore dbAggiungiGiocatore:', err);
  }
}

// 2. MODIFICA DIRETTA GIOCATORE SU SUPABASE
export async function dbModificaGiocatore(societaId, giocatore) {
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
  } catch (err) {
    console.error('Errore dbModificaGiocatore:', err);
  }
}

// 3. CANCELLAZIONE DIRETTA GIOCATORE SU SUPABASE
export async function dbEliminaGiocatore(societaId, giocatoreId) {
  try {
    const { error } = await supabase
      .from('giocatori')
      .delete()
      .eq('id', `${societaId}_${giocatoreId}`);

    if (error) console.error('Errore dbEliminaGiocatore:', error);
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
      allenatore: partitaInfo.allenatore,
      dirigente: partitaInfo.dirigente,
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
      dirigente: partitaInfo.dirigente || '',
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

export async function syncStatoPartitaSuDb(partitaId, dati) {
  const updateData = {
    gol_casa: dati.golCasa,
    gol_ospite: dati.golOspiti,
    tempo: dati.tempoGara,
    secondi_gara: dati.secondiGara,
    in_esecuzione: dati.inEsecuzione,
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

    if (staff !== undefined) {
      payload.staff_base = staff;
      if (staff.allenatore !== undefined) payload.allenatore_predefinito = staff.allenatore;
      if (staff.dirigente !== undefined) payload.dirigente_predefinito = staff.dirigente;
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

// ARCHIVIAZIONE SICURA: GLI EVENTI NON VENGONO MAI CANCELLATI MA RIASSEGNATI ALLO STORICO
export async function archiviaPartitaEResettaLive(societaId, livePartitaId, partitaInfo, datiGara, eventi, giocatori) {
  try {
    const storicoId = `STORICO_${societaId}_${Date.now()}`;

    // 1. Inserisce la partita nello storico ufficiale
    await supabase.from('partite').insert([{
      id: storicoId,
      societa_id: societaId,
      squadra_casa: partitaInfo.squadraCasa,
      squadra_ospite: partitaInfo.squadraOspite,
      allenatore: partitaInfo.allenatore,
      dirigente: partitaInfo.dirigente,
      gol_casa: datiGara.golCasa,
      gol_ospite: datiGara.golOspiti,
      data_gara: partitaInfo.dataPartita || new Date().toISOString().split('T')[0],
      stato: 'completata',
      referto_eventi: eventi,
      referto_giocatori: giocatori,
      terminata_il: new Date().toISOString()
    }]);

    // 2. NESSUNA CANCELLAZIONE: riassegna tutti gli eventi registrati al record storico permanente
    const { error: errUpdateEventi } = await supabase
      .from('eventi')
      .update({ partita_id: storicoId })
      .eq('partita_id', livePartitaId);

    if (errUpdateEventi) {
      console.warn("Attenzione durante il trasferimento eventi allo storico:", errUpdateEventi);
    }

    // 3. Resetta solo lo stato del tabellone live per la prossima partita
    await supabase.from('partite').update({
      squadra_ospite: '',
      gol_casa: 0,
      gol_ospite: 0,
      tempo: 1,
      secondi_gara: 0,
      in_esecuzione: false,
      recupero: 0,
      minuto_corrente: 1,
      slot_usati: 0,
      cambi_effettuati: 0,
      stato: 'bozza',
      data_gara: new Date().toISOString().split('T')[0],
      updated_at: new Date()
    }).eq('id', livePartitaId);

    // 4. Resetta le ammonizioni temporanee della rosa mantenendo tutti i giocatori
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

// Carica lo storico referti
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

// Eliminazione facoltativa manuale di un referto storico con i suoi eventi collegati
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

// --- GESTIONE LOGIN & SUPERADMIN ---

export async function loginSistema(username, password) {
  const u = username.trim();
  const p = password.trim();

  if (u.toLowerCase() === 'admin' && p === 'admin2026') {
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
      messaggio: 'Periodo di prova di 30 giorni scaduto. Contatta l\'amministratore.'
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
    staff_base: {}
  }).select().single();

  if (error) throw error;
  return data;
}

export async function adminCreaUtente({ societaId, username, password, ruolo, stagione }) {
  const { data, error } = await supabase.from('utenti_panchina').insert([{
    id: `${societaId}_${username.trim()}`,
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
