import { supabase } from '../supabaseClient';

let utenteSessioneAttiva = '';
let societaNomeSessioneAttiva = '';

function getUsernameAttivo(usernameEsplicito) {
  if (usernameEsplicito && usernameEsplicito.trim()) return usernameEsplicito.trim();
  if (utenteSessioneAttiva) return utenteSessioneAttiva;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('inpanchina_username') || 'N/D';
  }
  return 'N/D';
}

export async function registraLog({ societaId = null, societaNome = '', username = '', azione = '', dettagli = '' }) {
  try {
    const userFinale = getUsernameAttivo(username);
    let nomeSocFinale = societaNome || '';

    if (!nomeSocFinale && societaId) {
      const { data: soc } = await supabase
        .from('societa')
        .select('nome')
        .eq('id', societaId)
        .maybeSingle();
      if (soc?.nome) nomeSocFinale = soc.nome;
    }

    if (!nomeSocFinale) {
      nomeSocFinale = societaNomeSessioneAttiva || '';
    }

    await supabase.from('log_attivita').insert([{
      societa_id: societaId || null,
      societa_nome: nomeSocFinale,
      username: userFinale,
      azione: azione || 'EVENTO',
      dettagli: dettagli || '',
      created_at: new Date().toISOString()
    }]);
  } catch (err) {
    // Non blocchiamo mai il flusso dell'app se il log fallisce
    console.warn('Avviso registraLog:', err);
  }
}

export async function adminGetLogAttivita(limite = 100) {
  try {
    const { data, error } = await supabase
      .from('log_attivita')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) {
      console.error('Errore adminGetLogAttivita:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Errore adminGetLogAttivita:', err);
    return [];
  }
}

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

    const { data: soc, error: errSoc } = await supabase
      .from('societa')
      .select('rosa_base')
      .eq('id', societaId)
      .maybeSingle();

    if (!errSoc && soc?.rosa_base) {
      const rosaBaseAnnata = soc.rosa_base[chiave] || [];

      if (Array.isArray(rosaBaseAnnata) && rosaBaseAnnata.length > 0) {
        const idsVisti = new Set();
        return rosaBaseAnnata.map((g, index) => {
          let rawId = g.id !== undefined && g.id !== null && String(g.id).trim() !== '' && String(g.id) !== 'undefined' && String(g.id) !== 'null'
            ? String(g.id).trim()
            : `player_${index}_${g.numero || index}`;
          if (idsVisti.has(rawId)) {
            rawId = `${rawId}_${index}`;
          }
          idsVisti.add(rawId);

          return {
            id: rawId,
            numero: String(g.numero),
            nome: (g.nome || '').toUpperCase(),
            ruolo: g.ruolo || '',
            isConvocato: g.isConvocato ?? (index < 20),
            isTitolare: g.isTitolare ?? g.is_titolare ?? false,
            isCapitano: g.isCapitano ?? g.is_capitano ?? false,
            isVice: g.isVice ?? g.is_vice ?? false,
            ammonizioni: g.ammonizioni || 0,
            espulso: g.espulso || false,
            minuti: g.minuti !== undefined ? g.minuti : 0
          };
        });
      }
    }

    const { data: gList, error: errG } = await supabase
      .from('giocatori')
      .select('*')
      .eq('societa_id', societaId)
      .eq('campionato', campionato)
      .eq('annata', annataPulita);

    if (!errG && gList && gList.length > 0) {
      const idsVisti = new Set();
      return gList.map((g, index) => {
        let rawId = String(g.id || '')
          .replace(`${societaId}_${campionatoPulito}_${annataPulita}_`, '')
          .replace(`${societaId}_`, '')
          .trim();
        if (!rawId || rawId === 'undefined' || rawId === 'null') {
          rawId = `player_${index}_${g.numero || index}`;
        }
        if (idsVisti.has(rawId)) {
          rawId = `${rawId}_${index}`;
        }
        idsVisti.add(rawId);

        return {
          id: rawId,
          numero: String(g.numero),
          nome: (g.nome || '').toUpperCase(),
          ruolo: g.ruolo || '',
          isConvocato: g.isConvocato ?? (index < 20),
          isTitolare: g.is_titolare ?? false,
          isCapitano: g.is_capitano ?? false,
          isVice: g.is_vice ?? false,
          ammonizioni: g.ammonizioni || 0,
          espulso: g.espulso || false,
          minuti: g.minuti !== undefined ? g.minuti : 0
        };
      });
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
      espulso: false,
      minuti: 0
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
      espulso: giocatore.espulso || false,
      minuti: giocatore.minuti !== undefined ? Number(giocatore.minuti) : 0
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
    const idRiga = `${societaId}_${campionatoPulito}_${annataPulita}_${giocatoreId}`;

    const { data: gEsistente } = await supabase
      .from('giocatori')
      .select('nome, numero')
      .eq('id', idRiga)
      .maybeSingle();

    await supabase
      .from('giocatori')
      .delete()
      .eq('id', idRiga);

    await registraLog({
      societaId,
      azione: 'ELIMINAZIONE_GIOCATORE',
      dettagli: `Eliminato giocatore ${gEsistente ? `#${gEsistente.numero} ${gEsistente.nome}` : `ID ${giocatoreId}`} (${campionato} - Annata ${annata})`
    });
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
      espulso: g.espulso || false,
      minuti: g.minuti !== undefined ? Number(g.minuti) : 0
    }));

    await supabase.from('giocatori').upsert(righeGiocatori);

    await registraLog({
      societaId,
      azione: 'AVVIO_PARTITA_LIVE',
      dettagli: `Avviata live: ${partitaInfo.squadraCasa} vs ${partitaInfo.squadraOspite} (${campionato} - Annata ${annata})`
    });

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
          allenatore: partitaInfo.allenatore ?? '',
          allenatore_seconda: partitaInfo.allenatoreSeconda ?? '',
          dirigente: partitaInfo.dirigente ?? '',
          dirigente_ufficiali: partitaInfo.dirigenteUfficiali ?? '',
          assistente_arbitro: partitaInfo.assistenteArbitro ?? '',
          medico_sociale: partitaInfo.medicoSociale ?? '',
          massaggiatore: partitaInfo.massaggiatore ?? '',
          preparatore_atletico: partitaInfo.preparatoreAtletico ?? '',
          preparatore_portieri: partitaInfo.preparatorePortieri ?? '',
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
  if (!partitaId || !dati) return;

  const payload = {
    gol_casa: dati.golCasa ?? 0,
    gol_ospite: dati.golOspiti ?? 0,
    tempo: dati.tempoGara ?? 1,
    secondi_gara: dati.secondiGara ?? 0,
    in_esecuzione: Boolean(dati.inEsecuzione),
    avviato_alle: dati.avviatoAlle !== undefined ? dati.avviatoAlle : null,
    recupero: dati.recupero ?? 0,
    minuto_corrente: dati.minutoCorrente ?? 1,
    slot_usati: dati.slotUsati ?? 0,
    cambi_effettuati: dati.cambiEffettuati ?? 0,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('partite')
    .update(payload)
    .eq('id', partitaId);

  if (error) {
    console.error('Errore syncStatoPartitaSuDb:', error);
  }
}
  const updateConRecuperi = { ...baseUpdate };
  if (dati.recuperoPrimoTempo !== undefined) {
    updateConRecuperi.recupero_primo_tempo = Number(dati.recuperoPrimoTempo) || 0;
  }
  if (dati.recuperoSecondoTempo !== undefined) {
    updateConRecuperi.recupero_secondo_tempo = Number(dati.recuperoSecondoTempo) || 0;
  }

  const { error } = await supabase.from('partite').update(updateConRecuperi).eq('id', partitaId);
  if (error) {
    await supabase.from('partite').update(baseUpdate).eq('id', partitaId);
  }
}

export async function registraEventoCloud(partitaId, evento, campionato, annata) {
  if (!campionato || !annata || !evento) return;

  const dettagliConRecupero =
    evento.minutoLabel &&
    evento.minuto !== undefined &&
    evento.minutoLabel !== `${evento.minuto}'` &&
    !String(evento.dettagli || '').includes(evento.minutoLabel)
      ? `${evento.dettagli || ''} [${evento.minutoLabel}]`.trim()
      : evento.dettagli || '';

  const rigaEvento = {
    id: evento.id,
    partita_id: partitaId,
    campionato: campionato,
    annata: annata,
    minuto: evento.minuto,
    tempo: evento.tempo,
    tipo: evento.tipo,
    dettagli: dettagliConRecupero,
    giocatoreId: evento.giocatoreId || null,
    esceId: evento.esceId || null,
    entraId: evento.entraId || null
  };

  const { error } = await supabase.from('eventi').insert([rigaEvento]);

  if (error) {
    console.error('Errore registraEventoCloud:', error);
    return;
  }

  if (partitaId) {
    await supabase
      .from('partite')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', partitaId);
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
    espulso: g.espulso || false,
    minuti: g.minuti !== undefined ? Number(g.minuti) : 0
  }));

  await supabase.from('giocatori').upsert(righe);

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

// ⏱️ Funzione Definitiva con Correzione Blindata per il Portiere (#1)
export function calcolaMinutiGiocatore(giocatore, eventiPartita, durataTotalePartita) {
  const idG = String(giocatore.id || '').trim();
  const numG = String(giocatore.numero || '').trim();
  const nomeG = (giocatore.nome || '').toUpperCase().trim();

  // Ordiniamo gli eventi in ordine cronologico crescente
  const eventiCronologici = [...(eventiPartita || [])].sort((a, b) => (a.minuto || 0) - (b.minuto || 0));

  let haSubitoIngresso = false;
  
  // 🛡️ CORRETTORE BLINDATO: Partiamo dallo stato reale salvato nel database (isTitolare / is_titolare)
  let eraCertamenteTitolare = giocatore.isTitolare === true || giocatore.is_titolare === true;

  for (const ev of eventiCronologici) {
    const entraId = String(ev.entraId || '').trim();
    const esceId = String(ev.esceId || '').trim();
    const giocatoreIdEv = String(ev.giocatoreId || ev.giocatore_id || '').trim();
    const tipo = (ev.tipo || '').toUpperCase();
    const dett = (ev.dettagli || '').toUpperCase();

    const eMioEntrata = Boolean(idG && entraId && entraId === idG);
    const eMioUscitaOEventi = Boolean(idG && ((esceId && esceId === idG) || (giocatoreIdEv && giocatoreIdEv === idG)));
    const matchNumero = Boolean(numG && new RegExp(`#${numG}\\b`, 'i').test(dett));
    const matchNomeSenzaNum = Boolean(nomeG && !dett.includes('#') && dett.includes(nomeG));
    const eMioTesto = matchNumero || matchNomeSenzaNum;

    if (eMioEntrata || (entraId === '' && tipo === 'SOSTITUZIONE' && ((numG && new RegExp(`ENTRA\\s*#${numG}\\b`, 'i').test(dett)) || (matchNomeSenzaNum && dett.includes('ENTRA'))))) {
      haSubitoIngresso = true;
    }
    if (eMioUscitaOEventi || (esceId === '' && giocatoreIdEv === '' && (tipo === 'SOSTITUZIONE' ? ((numG && new RegExp(`ESCE\\s*#${numG}\\b`, 'i').test(dett)) || (matchNomeSenzaNum && dett.includes('ESCE'))) : eMioTesto))) {
      if (!haSubitoIngresso) {
        eraCertamenteTitolare = true;
      }
    }
  }

  let inCampo = haSubitoIngresso ? false : eraCertamenteTitolare;
  if (haSubitoIngresso) {
    inCampo = false;
  }

  let minutoInizioSpezzone = inCampo ? 0 : null;
  let minutiAccumulati = 0;

  for (const ev of eventiCronologici) {
    const minEv = Number(ev.minuto || 0);
    const tipo = (ev.tipo || '').toUpperCase();
    
    const esceId = String(ev.esceId || '').trim();
    const entraId = String(ev.entraId || '').trim();
    const giocatoreIdEv = String(ev.giocatoreId || ev.giocatore_id || '').trim();
    const dett = (ev.dettagli || '').toUpperCase();

    const eMioIdEntrata = Boolean(idG && entraId && entraId === idG);
    const eMioIdUscita = Boolean(idG && esceId && esceId === idG);
    const eMioIdEvento = Boolean(idG && giocatoreIdEv && giocatoreIdEv === idG);
    const matchNumero = Boolean(numG && new RegExp(`#${numG}\\b`, 'i').test(dett));
    const matchNomeSenzaNum = Boolean(nomeG && !dett.includes('#') && dett.includes(nomeG));
    const eMioTesto = matchNumero || matchNomeSenzaNum;

    // A. ENTRATA IN CAMPO
    if (tipo === 'SOSTITUZIONE' && (eMioIdEntrata || (entraId === '' && ((numG && new RegExp(`ENTRA\\s*#${numG}\\b`, 'i').test(dett)) || (matchNomeSenzaNum && dett.includes('ENTRA')))))) {
      if (!inCampo) {
        inCampo = true;
        minutoInizioSpezzone = minEv;
      }
      continue;
    }

    // B. USCITA DAL CAMPO (Cambio)
    if (tipo === 'SOSTITUZIONE' && (eMioIdUscita || (esceId === '' && ((numG && new RegExp(`ESCE\\s*#${numG}\\b`, 'i').test(dett)) || (matchNomeSenzaNum && dett.includes('ESCE'))))) && inCampo) {
      if (minutoInizioSpezzone !== null) {
        minutiAccumulati += Math.max(0, minEv - minutoInizioSpezzone);
      }
      inCampo = false;
      minutoInizioSpezzone = null;
      continue;
    }

    // C. ESPULSIONE
    if (tipo === 'ESPULSIONE' && (eMioIdEvento || (!giocatoreIdEv && eMioTesto)) && inCampo) {
      if (minutoInizioSpezzone !== null) {
        minutiAccumulati += Math.max(0, minEv - minutoInizioSpezzone);
      }
      inCampo = false;
      minutoInizioSpezzone = null;
      break; 
    }
  }

  if (inCampo && minutoInizioSpezzone !== null) {
    minutiAccumulati += Math.max(0, durataTotalePartita - minutoInizioSpezzone);
  }

  return Math.min(durataTotalePartita, Math.max(0, minutiAccumulati));
}

// ⏱️ Calcola dinamicamente la durata regolamentare in base a Campionato e Annata
export const getDurataPartita = (stagione, annataStr) => {
  if (!annataStr || isNaN(annataStr)) {
    return { durataTotale: 90, durataTempo: 45 };
  }
  const annoNascita = parseInt(annataStr, 10);
  const annoInizioStagione = parseInt(String(stagione || '').split('/')[0], 10) || new Date().getFullYear();
  const eta = annoInizioStagione - annoNascita;

  if (eta <= 14) {
    return { durataTotale: 70, durataTempo: 35 };
  } else if (eta === 15) {
    return { durataTotale: 80, durataTempo: 40 };
  } else {
    return { durataTotale: 90, durataTempo: 45 };
  }
};

export async function archiviaPartitaEResettaLive(societaId, livePartitaId, partitaInfo, datiGara, eventi, giocatori, campionato, annata) {
  if (!campionato || !annata) return { success: false, error: 'Mancano campionato o annata' };
  try {
    const storicoId = `STORICO_${societaId}_${Date.now()}`;

    const { durataTotale } = getDurataPartita(campionato, annata);
    const rec1T = Number(datiGara?.recuperoPrimoTempo || 0);
    const rec2T = Number(datiGara?.recuperoSecondoTempo || 0);

    let durataTotalePartita = durataTotale + rec1T + rec2T;
    if (eventi && eventi.length > 0) {
      const ultimoMinutoEvento = Math.max(...eventi.map(e => Number(e.minuto) || 0));
      if (ultimoMinutoEvento > durataTotalePartita) {
        durataTotalePartita = ultimoMinutoEvento;
      }
    }
    if (datiGara?.minutoCorrente && Number(datiGara.minutoCorrente) > durataTotalePartita) {
      durataTotalePartita = Number(datiGara.minutoCorrente);
    }

    const giocatoriDaArchiviare = giocatori.map(g => {
      const minutiReali = calcolaMinutiGiocatore(g, eventi, durataTotalePartita);
      const eraTitolare = g.isTitolare === true || g.is_titolare === true;

      return {
        ...g,
        minuti: minutiReali,
        isTitolare: eraTitolare,
        is_titolare: eraTitolare
      };
    });

    const rigaStoricoBase = {
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
      referto_giocatori: giocatoriDaArchiviare,
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
    };

    const { error: errStorico } = await supabase.from('partite').insert([{
      ...rigaStoricoBase,
      recupero_primo_tempo: rec1T,
      recupero_secondo_tempo: rec2T
    }]);

    if (errStorico) {
      await supabase.from('partite').insert([rigaStoricoBase]);
    }

    await supabase
      .from('eventi')
      .update({ partita_id: storicoId })
      .eq('partita_id', livePartitaId);

    const { data: socCorrente } = await supabase
      .from('societa')
      .select('nome, staff_base, rosa_base')
      .eq('id', societaId)
      .maybeSingle();

    const nomeNostraSocieta = (
      socCorrente?.nome ||
      (partitaInfo.isNostraCasa === false ? partitaInfo.squadraOspite : partitaInfo.squadraCasa) ||
      ''
    ).toUpperCase();

    const resetPartitaBase = {
      squadra_casa: nomeNostraSocieta,
      squadra_ospite: '',
      is_nostra_casa: true,
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
    };

    const { error: errReset } = await supabase.from('partite').update({
      ...resetPartitaBase,
      recupero_primo_tempo: 0,
      recupero_secondo_tempo: 0
    }).eq('id', livePartitaId);

    if (errReset) {
      await supabase.from('partite').update(resetPartitaBase).eq('id', livePartitaId);
    }

    const campionatoPulito = (campionato || '').replace(/[^a-zA-Z0-9]/g, '_');
    const annataPulita = (annata || '').replace(/[^a-zA-Z0-9]/g, '_');
    const chiave = `${campionatoPulito}_${annataPulita}`;

    if (socCorrente?.staff_base && typeof socCorrente.staff_base === 'object') {
      let staffMap = { ...socCorrente.staff_base };
      if (staffMap[chiave]) {
        staffMap[chiave] = {
          ...staffMap[chiave],
          squadraCasa: nomeNostraSocieta,
          squadraOspite: '',
          isNostraCasa: true
        };
      }
      await supabase.from('societa').update({ staff_base: staffMap }).eq('id', societaId);
    }

    let rosaCompleta = [];
    if (socCorrente?.rosa_base && socCorrente.rosa_base[chiave]) {
      rosaCompleta = socCorrente.rosa_base[chiave];
    }

    const listaDaSalvare = (rosaCompleta.length > 0 ? rosaCompleta : giocatori).map((g, index) => ({
      ...g,
      ammonizioni: 0,
      espulso: false,
      isConvocato: g.isConvocato ?? (index < 20),
      minuti: 0
    }));

    await aggiornaGiocatoriCloud(livePartitaId, societaId, listaDaSalvare, campionato, annata);
    await salvaRosaBaseSocieta(societaId, listaDaSalvare, undefined, campionato, annata);

    await registraLog({
      societaId,
      societaNome: nomeNostraSocieta,
      azione: 'ARCHIVIAZIONE_PARTITA',
      dettagli: `Archiviata gara: ${partitaInfo.squadraCasa} ${datiGara.golCasa ?? 0} - ${datiGara.golOspiti ?? 0} ${partitaInfo.squadraOspite} (${campionato} - Annata ${annata})`
    });

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
    const { data: partitaDaEliminare } = await supabase
      .from('partite')
      .select('societa_id, squadra_casa, squadra_ospite, gol_casa, gol_ospite, data_gara, campionato, annata')
      .eq('id', refertoId)
      .maybeSingle();

    await supabase.from('eventi').delete().eq('partita_id', refertoId);
    const { error } = await supabase.from('partite').delete().eq('id', refertoId);
    if (error) throw error;

    await registraLog({
      societaId: partitaDaEliminare?.societa_id || null,
      azione: 'ELIMINAZIONE_REFERTO',
      dettagli: partitaDaEliminare
        ? `Eliminato referto: ${partitaDaEliminare.squadra_casa} ${partitaDaEliminare.gol_casa ?? 0}-${partitaDaEliminare.gol_ospite ?? 0} ${partitaDaEliminare.squadra_ospite} del ${partitaDaEliminare.data_gara} (${partitaDaEliminare.campionato || ''} ${partitaDaEliminare.annata || ''})`
        : `Eliminato referto storico ID: ${refertoId}`
    });

    return true;
  } catch (err) {
    console.error('Errore eliminaRefertoStorico:', err);
    return false;
  }
}

export async function loginSistema(username, password, campionatoSelezionato, annataSelezionata) {
  const u = username.trim();
  const p = password.trim();
  const campionatoScelto = (campionatoSelezionato || '').trim();
  const annataScel = (annataSelezionata || '').trim();

  const { data: utentiTrovati, error } = await supabase
    .from('utenti_panchina')
    .select('*, societa(*)')
    .eq('username', u)
    .eq('password_chiaro', p);

  const utenteAdminDb = (utentiTrovati || []).find(
    (usr) => (usr.ruolo || '').toLowerCase() === 'superadmin'
  );
  if (utenteAdminDb) {
    utenteSessioneAttiva = u;
    societaNomeSessioneAttiva = 'SUPERADMIN';
    await registraLog({
      societaId: null,
      societaNome: 'SUPERADMIN',
      username: u,
      azione: 'LOGIN_SUPERADMIN_OK',
      dettagli: `Accesso effettuato al pannello SuperAdmin`
    });
    return {
      success: true,
      isAdmin: true,
      utente: utenteAdminDb
    };
  }

  const utente = (utentiTrovati || []).find((usr) => {
    const campUtente = (usr.campionato || usr.stagione || '').trim();
    if (!campionatoScelto || !campUtente) return true;
    return campUtente === campionatoScelto;
  });

  if (error || !utente) {
    await registraLog({
      societaId: null,
      societaNome: '',
      username: u,
      azione: 'LOGIN_FALLITO',
      dettagli: `Tentativo fallito per utente "${u}" (Campionato: ${campionatoScelto || 'N/D'})`
    });
    return { 
      success: false, 
      messaggio: 'Credenziali non valide o non abilitate per il campionato selezionato.' 
    };
  }

  if (!utente.societa) {
    await registraLog({
      societaId: utente.societa_id || null,
      username: u,
      azione: 'LOGIN_FALLITO',
      dettagli: `Nessuna società associata all'utente "${u}"`
    });
    return { success: false, messaggio: 'Nessuna società associata a questo profilo.' };
  }

  const scadenza = new Date(utente.societa.data_scadenza_prova);
  if (!utente.societa.attiva || new Date() > scadenza) {
    await registraLog({
      societaId: utente.societa.id,
      societaNome: utente.societa.nome,
      username: u,
      azione: 'LOGIN_BLOCCATO_SCADENZA',
      dettagli: `Accesso negato per licenza scaduta o disattivata (${utente.societa.nome})`
    });
    return {
      success: false,
      messaggio: "Periodo di prova di 30 giorni scaduto. Contatta l'amministratore."
    };
  }

  utenteSessioneAttiva = u;
  societaNomeSessioneAttiva = utente.societa.nome || '';

  await registraLog({
    societaId: utente.societa.id,
    societaNome: utente.societa.nome,
    username: u,
    azione: 'LOGIN_OK',
    dettagli: `Accesso dirigente effettuato (${campionatoScelto || utente.campionato || utente.stagione || 'N/D'} • Annata ${annataScel || 'N/D'})`
  });

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
    rosa_base: {}
  }).select().single();

  if (error) throw error;

  await registraLog({
    societaId: data.id,
    societaNome: data.nome,
    azione: 'ADMIN_CREA_SOCIETA',
    dettagli: `Creata società "${data.nome}" (Codice: ${data.codice_societa})`
  });

  return data;
}

export async function adminCreaUtente({ societaId, username, password, ruolo, campionato, stagione }) {
  const valoreStagione = (campionato || stagione || '').trim();
  const baseRow = {
    id: `${societaId}_usr_${Date.now()}`,
    societa_id: societaId,
    username: username.trim(),
    password_chiaro: password.trim(),
    ruolo: ruolo || 'dirigente',
    stagione: valoreStagione
  };

  let { data, error } = await supabase
    .from('utenti_panchina')
    .insert([{ ...baseRow, campionato: valoreStagione }])
    .select()
    .single();

  if (error) {
    const retry = await supabase
      .from('utenti_panchina')
      .insert([baseRow])
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;

  await registraLog({
    societaId,
    azione: 'ADMIN_CREA_UTENTE',
    dettagli: `Creato utente "${username.trim()}" per società ID "${societaId}" (Campionato: ${valoreStagione || 'N/D'})`
  });

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

  await registraLog({
    societaId: data.id,
    societaNome: data.nome,
    azione: 'ADMIN_STATO_SOCIETA',
    dettagli: `Aggiornato stato società "${data.nome}": Attiva=${data.attiva}, Scadenza=${new Date(data.data_scadenza_prova).toLocaleDateString('it-IT')}`
  });

  return data;
}

export async function adminEliminaSocietaCompleta(societaId) {
  const { data: soc } = await supabase.from('societa').select('nome').eq('id', societaId).maybeSingle();

  await supabase.from('eventi').delete().in(
    'partita_id',
    (await supabase.from('partite').select('id').eq('societa_id', societaId)).data?.map(p => p.id) || []
  );
  await supabase.from('giocatori').delete().eq('societa_id', societaId);
  await supabase.from('partite').delete().eq('societa_id', societaId);
  await supabase.from('utenti_panchina').delete().eq('societa_id', societaId);
   
  const { error } = await supabase.from('societa').delete().eq('id', societaId);
  if (error) throw error;

  await registraLog({
    societaId,
    societaNome: soc?.nome || societaId,
    azione: 'ADMIN_ELIMINA_SOCIETA',
    dettagli: `Eliminata intera società "${soc?.nome || societaId}" e tutti i dati collegati`
  });

  return { success: true };
}

export async function adminEliminaUtente(utenteId) {
  const { data: usr } = await supabase.from('utenti_panchina').select('username, societa_id').eq('id', utenteId).maybeSingle();
  const { error } = await supabase.from('utenti_panchina').delete().eq('id', utenteId);
  if (error) throw error;

  await registraLog({
    societaId: usr?.societa_id || null,
    azione: 'ADMIN_ELIMINA_UTENTE',
    dettagli: `Eliminato utente "${usr?.username || utenteId}"`
  });

  return { success: true };
}

export async function adminModificaPasswordUtente(utenteId, nuovaPassword) {
  const { data: usr } = await supabase.from('utenti_panchina').select('username, societa_id').eq('id', utenteId).maybeSingle();
  const { error } = await supabase
    .from('utenti_panchina')
    .update({ password_chiaro: nuovaPassword.trim() })
    .eq('id', utenteId);
  if (error) throw error;

  await registraLog({
    societaId: usr?.societa_id || null,
    azione: 'ADMIN_MODIFICA_PASSWORD',
    dettagli: `Modificata password per l'utente "${usr?.username || utenteId}"`
  });

  return { success: true };
}

export async function salvaStaffBaseSocieta(societaId, staffBaseObj) {
  try {
    const { error } = await supabase
      .from('societa')
      .update({ staff_base: staffBaseObj })
      .eq('id', societaId);

    if (error) {
      console.error("Errore salvataggio staff base:", error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error("Errore imprevisto in salvaStaffBaseSocieta:", err);
    return { success: false, error: err };
  }
}
