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

export async function creaSocieta(id, nome) {
  const { data, error } = await supabase
    .from('societa')
    .insert([{ id, nome }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Carica lo stato completo della partita dal database
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

// Salva distinta iniziale
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
      ruolo: g.ruolo,
      is_titolare: g.isTitolare,
      is_capitano: g.isCapitano,
      is_vice: g.isVice,
      ammonizioni: 0,
      espulso: false
    }));

    await supabase.from('giocatori').upsert(righeGiocatori);
    return { success: true };
  } catch (error) {
    console.error('Errore salvataggio distinta:', error);
    return { success: false, error };
  }
}

// Sincronizza lo stato di gioco e il timestamp di avvio
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

// Inserisce un evento live sul cloud
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

// Elimina un evento live
export async function eliminaEventoCloud(eventoId) {
  await supabase.from('eventi').delete().eq('id', eventoId);
}

// Aggiorna lo stato dei giocatori (per sostituzioni e cartellini)
export async function aggiornaGiocatoriCloud(partitaId, societaId, giocatori) {
  const righe = giocatori.map(g => ({
    id: `${partitaId}_${g.id}`,
    partita_id: partitaId,
    societa_id: societaId,
    numero: g.numero,
    nome: g.nome,
    ruolo: g.ruolo,
    is_titolare: g.isTitolare,
    is_capitano: g.isCapitano,
    is_vice: g.isVice,
    ammonizioni: g.ammonizioni || 0,
    espulso: g.espulso || false
  }));
  await supabase.from('giocatori').upsert(righe);
}

// --- FUNZIONI SUPERADMIN & AUTENTICAZIONE ---

// Creazione completa di una nuova squadra con trial 30 giorni
export async function adminCreaSquadra({ codice, nome, indirizzoCampo, logoUrl }) {
  const societaId = codice.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const dataScadenza = new Date();
  dataScadenza.setDate(dataScadenza.getDate() + 30); // 30 giorni di prova

  const { data, error } = await supabase.from('societa').upsert({
    id: societaId,
    codice_societa: codice.toUpperCase(),
    nome: nome,
    indirizzo_campo: indirizzoCampo || '',
    logo_url: logoUrl || '',
    data_scadenza_prova: dataScadenza.toISOString(),
    attiva: true
  }).select().single();

  if (error) throw error;
  return data;
}

// Creazione utente da parte dell'Admin
export async function adminCreaUtente({ societaId, username, password, ruolo, stagione }) {
  const { data, error } = await supabase.from('utenti_panchina').insert([{
    id: `${societaId}_${username.toLowerCase()}`,
    societa_id: societaId,
    username: username.trim(),
    password_chiaro: password.trim(),
    ruolo: ruolo || 'dirigente',
    stagione: stagione || '2026/2027'
  }]).select().single();

  if (error) throw error;
  return data;
}

// Recupera tutti gli utenti di una società per l'Admin
export async function adminGetUtentiSocieta(societaId) {
  const { data, error } = await supabase
    .from('utenti_panchina')
    .select('*')
    .eq('societa_id', societaId);
  return data || [];
}

// Login per i dirigenti sul campo
export async function loginDirigente(username, password) {
  // 1. Cerca l'utente
  const { data: utente, error: errUtente } = await supabase
    .from('utenti_panchina')
    .select('*, societa(*)')
    .eq('username', username.trim())
    .eq('password_chiaro', password.trim())
    .single();

  if (errUtente || !utente) {
    return { success: false, messaggio: 'Username o password non corretti.' };
  }

  // 2. Verifica se la prova di 30 giorni è ancora attiva
  const dataScadenza = new Date(utente.societa.data_scadenza_prova);
  const oggi = new Date();

  if (!utente.societa.attiva || oggi > dataScadenza) {
    return { 
      success: false, 
      messaggio: 'Il periodo di prova di 30 giorni per questa società è scaduto. Contatta l\'amministratore.' 
    };
  }

  return { success: true, utente, societa: utente.societa };
}
