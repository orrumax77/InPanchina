import { supabase } from '../supabaseClient';

// Recupera l'elenco delle società registrate
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

// Registra una nuova società
export async function creaSocieta(id, nome) {
  const { data, error } = await supabase
    .from('societa')
    .insert([{ id, nome }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Salva o aggiorna la distinta legandola alla società
export async function salvaDistintaSuDb(societaId, partitaId, partitaInfo, giocatori) {
  try {
    // 1. Salva partita con il riferimento alla società
    const { error: errPartita } = await supabase.from('partite').upsert({
      id: partitaId,
      societa_id: societaId,
      squadra_casa: partitaInfo.squadraCasa,
      squadra_ospite: partitaInfo.squadraOspite,
      allenatore: partitaInfo.allenatore,
      dirigente: partitaInfo.dirigente,
      updated_at: new Date()
    });

    if (errPartita) throw errPartita;

    // 2. Salva giocatori associandoli alla società e alla partita
    const righeGiocatori = giocatori.map((g) => ({
      id: `${societaId}_${g.id}`,
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

    const { error: errGiocatori } = await supabase
      .from('giocatori')
      .upsert(righeGiocatori);

    if (errGiocatori) throw errGiocatori;

    return { success: true };
  } catch (error) {
    console.error('Errore salvataggio distinta:', error);
    return { success: false, error };
  }
}
