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

    const { data: giocatori } = await supabase
      .from('giocatori')
      .select('*')
      .eq('partita_id', partitaId);

    const { data: eventi } = await supabase
      .from('eventi')
      .select('*')
      .eq('partita_id', partitaId)
      .order('created_at', { ascending: false });

    return { partita, giocatori: giocatori || [], eventi: eventi || [] };
  } catch (error) {
    console.error('Errore caricamento partita:', error);
    return null;
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
      id: `${partitaId}_${g.id}`,
      partita_id: partitaId,
      societa_id: societaId,
      numero: g.numero,
      nome: g.nome,
      ruolo: g.ruolo || '',
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

  if (dati.timerAvviatoIl !== undefined) {
    updateData.timer_avviato_il = dati.timerAvviatoIl;
  }

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
    id: `${partitaId}_${g.id}`,
    partita_id: partitaId,
    societa_id: societaId,
    numero: g.numero,
    nome: g.nome,
    ruolo: g.ruolo || '',
    is_titolare: g.isTitolare,
    is_capitano: g.isCapitano,
    is_vice: g.isVice,
    ammonizioni: g.ammonizioni || 0,
    espulso: g.espulso || false
  }));
  await supabase.from('giocatori').upsert(righe);
}

// --- GESTIONE LOGIN & SUPERADMIN ---

export async function loginSistema(username, password) {
  const u = username.trim();
  const p = password.trim();

  // 1. SuperAdmin Globale: entra sempre e ovunque
  if (u.toLowerCase() === 'admin' && p === 'admin2026') {
    return {
      success: true,
      isAdmin: true,
      utente: { username: 'admin', ruolo: 'superadmin' }
    };
  }

  // 2. Utente Dirigente associato alla Squadra
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

  // Verifica Scadenza Prova 30 giorni
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
    attiva: true
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
