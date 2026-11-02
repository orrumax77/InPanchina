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

// Sincronizza lo stato in tempo reale della partita
export async function syncStatoPartitaSuDb(partitaId, dati) {
  await supabase.from('partite').update({
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
  }).eq('id', partitaId);
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
