import { supabase } from '../supabaseClient';

export async function salvaDistintaSuDb(partitaId, partitaInfo, giocatori) {
  try {
    // 1. Salva o aggiorna la partita
    const { error: errPartita } = await supabase.from('partite').upsert({
      id: partitaId,
      squadra_casa: partitaInfo.squadraCasa,
      squadra_ospite: partitaInfo.squadraOspite,
      allenatore: partitaInfo.allenatore,
      dirigente: partitaInfo.dirigente,
      updated_at: new Date()
    });

    if (errPartita) throw errPartita;

    // 2. Prepara i giocatori
    const righeGiocatori = giocatori.map((g) => ({
      id: `${partitaId}_${g.id}`,
      partita_id: partitaId,
      numero: g.numero,
      nome: g.nome,
      ruolo: g.ruolo,
      is_titolare: g.isTitolare,
      is_capitano: g.isCapitano,
      is_vice: g.isVice,
      ammonizioni: 0,
      espulso: false
    }));

    // 3. Salva i giocatori nel database
    const { error: errGiocatori } = await supabase
      .from('giocatori')
      .upsert(righeGiocatori);

    if (errGiocatori) throw errGiocatori;

    return { success: true };
  } catch (error) {
    console.error('Errore durante il salvataggio su Supabase:', error);
    return { success: false, error };
  }
}
