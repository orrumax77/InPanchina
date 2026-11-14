import React, { useState, useEffect } from 'react';
import { caricaStoricoReferti, eliminaRefertoStorico } from '../services/db';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Archive, Calendar, Share2, Copy, Check, Trash2, ChevronDown, ChevronUp, Trophy, Clock, Star, X, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function ArchivioReferti({ societa, campionato, annata, onTornaIndietro }) {
  const [partiteStorico, setPartiteStorico] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [partitaApertaId, setPartitaApertaId] = useState(null);
  const [copiatoId, setCopiatoId] = useState(null);
  const [eventiDbDettaglio, setEventiDbDettaglio] = useState({});

  // Stati per la gestione della modale voti a posteriori
  const [partitaInVotazione, setPartitaInVotazione] = useState(null);
  const [votiTemp, setVotiTemp] = useState({});

  // Stati per la gestione della modale modulo di gioco a posteriori
  const [partitaInModulo, setPartitaInModulo] = useState(null);
  const [moduloTemp, setModuloTemp] = useState('4-3-3');

  const moduliDisponibili = [
    '4-3-3',
    '4-2-3-1',
    '4-4-2',
    '3-5-2',
    '3-4-3',
    '4-3-1-2',
    '5-3-2',
    '5-4-1'
  ];

  const ricaricaStorico = async () => {
    if (!societa?.id) return;
    setCaricamento(true);
    const lista = await caricaStoricoReferti(societa.id);
    setPartiteStorico(lista);
    setCaricamento(false);
  };

  useEffect(() => {
    ricaricaStorico();

    // 🚀 ASCOLTO REALTIME SULLA TABELLA PARTITE PER AGGIORNARE L'ARCHIVIO SU TUTTI I DISPOSITIVI
    const channel = supabase
      .channel('archivio-referti-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Intercetta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'partite',
          filter: `societa_id=eq.${societa?.id}`
        },
        () => {
          ricaricaStorico();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [societa?.id]);

  const toggleDettaglio = async (id) => {
    const nuovoStato = partitaApertaId === id ? null : id;
    setPartitaApertaId(nuovoStato);

    if (nuovoStato && !eventiDbDettaglio[id]) {
      const { data } = await supabase
        .from('eventi')
        .select('*')
        .eq('partita_id', id)
        .order('minuto', { ascending: true });

      if (data && data.length > 0) {
        setEventiDbDettaglio(prev => ({ ...prev, [id]: data }));
      }
    }
  };

  const formattaOra = (dataIso) => {
    if (!dataIso) return '';
    const d = new Date(dataIso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const generaTestoReferto = (p) => {
    const dataFormatted = p.data_gara ? p.data_gara.split('-').reverse().join('/') : '';
    const nomeSocietaTesto = societa?.nome ? societa.nome.toUpperCase() : 'REFERTO GARA';
    let t = `📋 🛡️ *${nomeSocietaTesto}* 🛡️\n`;
    t += `📋 *REFERTO GARA*\n`;
    t += `📅 *Data:* ${dataFormatted}\n`;
    if (campionato) t += `🏆 *Campionato:* ${campionato}\n`;
    if (annata) t += `👤 *Annata:* ${annata}\n`;
    t += `\n`;
    t += `⚽ *${(p.squadra_casa || 'CASA').toUpperCase()} ${p.gol_casa} - ${p.gol_ospite} ${(p.squadra_ospite || 'OSPITE').toUpperCase()}*\n`;
    
    if (p.modulo_gioco) {
      t += `📋 *Modulo:* ${p.modulo_gioco}\n`;
    }
    t += `\n`;

    t += `👔 *STAFF TECNICO & DIRIGENZIALE UFFICIALE:*\n`;
    if (p.allenatore) t += `• Allenatore: ${p.allenatore.toUpperCase()}\n`;
    if (p.allenatore_seconda) t += `• Allenatore in Seconda: ${p.allenatore_seconda.toUpperCase()}\n`;
    if (p.dirigente) t += `• Dirigente Accompagnatore Ufficiale della Squadra: ${p.dirigente.toUpperCase()}\n`;
    if (p.dirigente_ufficiali) t += `• Dirigente Addetto Ufficiali di Gara: ${p.dirigente_ufficiali.toUpperCase()}\n`;
    if (p.assistente_arbitro) t += `• Assistente all'Arbitro: ${p.assistente_arbitro.toUpperCase()}\n`;
    if (p.medico_sociale) t += `• Medico Sociale: ${p.medico_sociale.toUpperCase()}\n`;
    if (p.massaggiatore) t += `• Massaggiatore: ${p.massaggiatore.toUpperCase()}\n`;
    if (p.preparatore_atletico) t += `• Preparatore Atletico: ${p.preparatore_atletico.toUpperCase()}\n`;
    if (p.preparatore_portieri) t += `• Preparatore dei Portieri: ${p.preparatore_portieri.toUpperCase()}\n`;
    t += `\n`;

    const eventi = eventiDbDettaglio[p.id] || p.referto_eventi || [];
    const reti = eventi.filter(e => e.tipo === 'GOL');
    const cambi = eventi.filter(e => e.tipo === 'SOSTITUZIONE');
    const ammonizioniEventi = eventi.filter(e => e.tipo === 'AMMONIZIONE');
    const espulsioniEventi = eventi.filter(e => e.tipo === 'ESPULSIONE');

    if (reti.length > 0) {
      t += `⚽ *MARCATURE:*\n`;
      reti.forEach(r => { t += `• ⚽ ${r.minuto}' ${r.dettagli.toUpperCase()}\n`; });
      t += `\n`;
    }

    if (ammonizioniEventi.length > 0) {
      t += `🟨 *AMMONITI:*\n`;
      ammonizioniEventi.forEach(a => {
        t += `• 🟨 ${a.minuto}' #${a.giocatoreNumero || ''} ${(a.giocatoreNome || a.dettagli).toUpperCase()}\n`;
      });
      t += `\n`;
    }

    if (espulsioniEventi.length > 0) {
      t += `🟥 *ESPULSI:*\n`;
      espulsioniEventi.forEach(e => {
        const isDoppiaAmmonizione = e.dettagli?.toUpperCase().includes('DOPPIA AMMONIZIONE');
        const iconaEspulsione = isDoppiaAmmonizione ? '🟨🟨🟥' : '🟥';
        t += `• ${iconaEspulsione} ${e.minuto}' #${e.giocatoreNumero || ''} ${(e.giocatoreNome || e.dettagli).toUpperCase()}\n`;
      });
      t += `\n`;
    }

    if (cambi.length > 0) {
      t += `🔄 *SOSTITUZIONI:*\n`;
      cambi.forEach(c => { t += `• 🔄 ${c.minuto}' ${c.dettagli.toUpperCase()}\n`; });
      t += `\n`;
    }

    const rosa = p.referto_giocatori || [];
    if (rosa.length > 0) {
      t += `⏱️ *MINUTAGGIO & PAGELLE ROSA:*\n`;

      rosa.forEach(g => {
        const fascia = g.isCapitano ? ' Ⓒ' : g.isVice ? ' 🅥' : '';
        
        let iconeGiocatore = '';
        const numG = String(g.numero || '').trim();
        const idG = g.id;
        const nomeG = (g.nome || '').toUpperCase().trim();

        const matchGiocatore = (ev) => {
          if (!ev) return false;
          if (ev.giocatoreId === idG || ev.esceId === idG || ev.entraId === idG || ev.giocatore_id === idG) return true;
          
          const det = (ev.dettagli || '').toUpperCase();
          if (nomeG && det.includes(nomeG)) return true;
          
          if (numG) {
            if (
              det.includes(`#${numG}`) || 
              det.includes(` #${numG}`) || 
              det.includes(`-#${numG}`) || 
              det.includes(`(${numG})`) ||
              det.includes(`[${numG}]`)
            ) {
              return true;
            }
          }
          return false;
        };

        const haSegnato = reti.some(r => matchGiocatore(r));
        const eAmmonito = ammonizioniEventi.some(a => matchGiocatore(a));
        const eventoEspulsione = espulsioniEventi.find(e => matchGiocatore(e));
        const eEspulso = !!eventoEspulsione || g.espulso;
        const haSubitoCambio = cambi.some(c => matchGiocatore(c));

        if (haSegnato) iconeGiocatore += ' ⚽';
        if (eAmmonito) iconeGiocatore += ' 🟨';
        if (eEspulso) {
          const isDoppia = (eventoEspulsione?.dettagli || '').toUpperCase().includes('DOPPIA AMMONIZIONE') || g.ammonizioni >= 2;
          iconeGiocatore += isDoppia ? ' 🟨🟨🟥' : ' 🟥';
        }
        if (haSubitoCambio) iconeGiocatore += ' 🔄';

        const minutiValore = g.minuti !== undefined && g.minuti !== null ? g.minuti : 0;
        const minStr = `${minutiValore}'`;

        let statoStr = '';
        if (minutiValore === 0 && !g.isTitolare) {
          statoStr = ' (PANCHINA)';
        } else if (g.stato) {
          statoStr = ` (${g.stato})`;
        }

        const votoStr = g.voto && g.voto !== 'S.V.' ? ` ⭐ Voto: *${g.voto}*` : g.voto === 'S.V.' ? ` ⭐ Voto: *S.V.*` : '';
        
        t += `• #${g.numero} ${g.nome.toUpperCase()}${fascia}${iconeGiocatore}: ${minStr}${statoStr}${votoStr}\n`;
      });
    }
    return t;
  };
  
  const handleCopia = (p) => {
    const testo = generaTestoReferto(p);
    navigator.clipboard.writeText(testo);
    setCopiatoId(p.id);
    setTimeout(() => setCopiatoId(null), 2000);
  };

  const handleWhatsApp = (p) => {
    const testo = generaTestoReferto(p);
    const url = `https://wa.me/?text=${encodeURIComponent(testo)}`;
    window.open(url, '_blank');
  };

  // 📄 GENERAZIONE E DOWNLOAD DEL VERO E PROPRIO PDF NATIVO CON LOGO E NOME SOCIETÀ
  const handleScaricaPDF = async (p) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // 1. Logo della società in alto al centro (se presente)
    const logoUrl = societa?.logo_url;
    if (logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = logoUrl;
        });

        const logoSize = 22;
        const logoX = (pageWidth - logoSize) / 2;
        doc.addImage(img, 'JPEG', logoX, yPos, logoSize, logoSize);
        yPos += logoSize + 6;
      } catch (err) {
        console.warn("Impossibile caricare il logo per il PDF:", err);
      }
    }

    // 2. Nome della società in alto al centro sotto il logo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    const nomeSoc = societa?.nome ? societa.nome.toUpperCase() : 'SOCIETÀ SPORTIVA';
    doc.text(nomeSoc, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Sottotitolo
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("REFERTO UFFICIALE DI GARA", pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Linea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // 3. Testo pulito del referto
    const testoGrezzo = generaTestoReferto(p);
    const testoPulito = testoGrezzo
      .replace(/[*_#]/g, '')
      .replace(/📋|📅|🏆|👤|⚽|👔|🟨|🟥|🔄|⏱️|⭐/g, '');

    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);

    const linee = doc.splitTextToSize(testoPulito, pageWidth - (margin * 2));
    
    linee.forEach((linea) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(linea, margin, yPos);
      yPos += 5;
    });

    // 4. Download nativo del PDF
    const dataGara = p.data_gara || 'partita';
    doc.save(`Referto_${dataGara}_${p.squadra_ospite || 'gara'}.pdf`);
  };

  const handleElimina = async (p) => {
    const conferma = window.confirm(`Vuoi cancellare definitivamente il referto del ${p.data_gara} contro ${p.squadra_ospite}?`);
    if (!conferma) return;

    await eliminaRefertoStorico(p.id);
    await ricaricaStorico();
  };

  const apriModaleVoti = (p) => {
    setPartitaInVotazione(p);
    const iniziali = {};
    (p.referto_giocatori || []).forEach(g => {
      iniziali[g.id] = g.voto !== undefined && g.voto !== '' ? g.voto : '6';
    });
    setVotiTemp(iniziali);
  };

  const salvaVotiStorico = async () => {
    if (!partitaInVotazione) return;

    const rosaAggiornata = (partitaInVotazione.referto_giocatori || []).map(g => ({
      ...g,
      voto: votiTemp[g.id] !== undefined ? votiTemp[g.id] : ''
    }));

    const idPulito = String(partitaInVotazione.id).split(':')[0];

    const { error } = await supabase
      .from('partite')
      .update({ referto_giocatori: rosaAggiornata })
      .eq('id', idPulito);

    if (error) {
      alert("Errore durante il salvataggio dei voti: " + error.message);
      return;
    }

    setPartitaInVotazione(null);
    await ricaricaStorico();
  };

  const apriModaleModulo = (p) => {
    setPartitaInModulo(p);
    setModuloTemp(p.modulo_gioco || '4-3-3');
  };

  const salvaModuloStorico = async () => {
    if (!partitaInModulo) return;

    const idPulito = String(partitaInModulo.id).split(':')[0];

    const { error } = await supabase
      .from('partite')
      .update({ modulo_gioco: moduloTemp })
      .eq('id', idPulito);

    if (error) {
      alert("Errore durante il salvataggio del modulo: " + error.message);
      return;
    }

    setPartitaInModulo(null);
    await ricaricaStorico();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          onClick={onTornaIndietro}
          className="text-xs uppercase font-bold text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Torna Indietro
        </button>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase flex items-center gap-1.5">
          <Archive className="w-3.5 h-3.5" /> Storico Gare
        </span>

      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase">Archivio Referti Ufficiali</h2>
            <p className="text-xs text-slate-400 uppercase">{societa?.nome} • Tutte le gare concluse</p>
          </div>
        </div>
      </div>

      {caricamento ? (
        <div className="text-center py-12 text-slate-500 text-sm font-semibold uppercase animate-pulse">
          Caricamento storico in corso...
        </div>
      ) : partiteStorico.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs uppercase p-6 space-y-1">
          <Archive className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <p className="font-bold">Nessuna partita archiviata al momento.</p>
          <p className="text-[11px]">Quando finisci una partita, premi "Termina Live e Archivia" per conservarla qui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partiteStorico.map((p) => {
            const aperta = partitaApertaId === p.id;
            const dataFormatted = p.data_gara ? p.data_gara.split('-').reverse().join('/') : '';
            const oraSalvataggio = formattaOra(p.terminata_il || p.created_at);

            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition">
                <div 
                  onClick={() => toggleDettaglio(p.id)}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/50 select-none"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {dataFormatted}
                      {oraSalvataggio && (
                        <span className="text-slate-500 font-normal ml-1 flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-slate-500" /> {oraSalvataggio}
                        </span>
                      )}
                    </span>
                    <span className="text-xs uppercase font-bold text-slate-200">
                      {p.squadra_casa} vs {p.squadra_ospite}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-950 border border-slate-700 text-white font-mono font-black text-base rounded-xl">
                      {p.gol_casa} - {p.gol_ospite}
                    </span>
                    {aperta ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {aperta && (
                  <div className="border-t border-slate-800 p-4 bg-slate-950 space-y-4">
                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {generaTestoReferto(p)}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleElimina(p)}
                        className="p-2.5 rounded-xl text-rose-400 hover:text-white bg-slate-900 hover:bg-rose-950/40 border border-rose-900/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Elimina
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => apriModaleModulo(p)}
                          className="px-3.5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition border border-indigo-500/40 cursor-pointer"
                        >
                          <Trophy className="w-4 h-4" /> {p.modulo_gioco ? `Modulo (${p.modulo_gioco})` : 'Assegna Modulo'}
                        </button>

                        <button
                          type="button"
                          onClick={() => apriModaleVoti(p)}
                          className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition border border-amber-500/40 cursor-pointer"
                        >
                          <Star className="w-4 h-4 fill-amber-400" /> Voti Pagelle
                        </button>

                        <button
                          type="button"
                          onClick={() => handleScaricaPDF(p)}
                          className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-950 cursor-pointer"
                        >
                          <FileText className="w-4 h-4" /> Scarica PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopia(p)}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                        >
                          {copiatoId === p.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          {copiatoId === p.id ? 'Copiato!' : 'Copia'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleWhatsApp(p)}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950 cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" /> Condividi
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modale Assegnazione Modulo di Gioco a Posteriori */}
      {partitaInModulo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-slate-100 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold uppercase text-white">Modulo di Gioco</h3>
              </div>
              <button
                type="button"
                onClick={() => setPartitaInModulo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 uppercase">
              Partita del {partitaInModulo.data_gara} vs {partitaInModulo.squadra_ospite}
            </p>

            <div className="grid grid-cols-2 gap-2 py-2">
              {moduliDisponibili.map((mod) => {
                const isSelezionato = moduloTemp === mod;
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setModuloTemp(mod)}
                    className={`py-3 rounded-xl font-mono font-bold text-sm transition cursor-pointer border ${
                      isSelezionato
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg scale-105'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {mod}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setPartitaInModulo(null)}
                className="w-1/2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={salvaModuloStorico}
                className="w-1/2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase transition cursor-pointer shadow-lg shadow-emerald-950 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Salva Modulo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Assegnazione Voti con Slider Numerico */}
      {partitaInVotazione && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h3 className="text-base font-bold uppercase text-white">Assegna Voti Pagelle</h3>
              </div>
              <button
                type="button"
                onClick={() => setPartitaInVotazione(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 uppercase">
              Partita del {partitaInVotazione.data_gara} vs {partitaInVotazione.squadra_ospite}
            </p>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {(partitaInVotazione.referto_giocatori || []).map((g) => {
                const votoCorrente = votiTemp[g.id] ?? '6';
                const isSV = votoCorrente === 'S.V.';
                const valoreNum = isSV ? 6 : parseFloat(votoCorrente) || 6;

                return (
                  <div key={g.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400 font-mono flex-shrink-0">
                          {g.numero}
                        </span>
                        <span className="font-bold text-white text-xs uppercase truncate">
                          {g.nome}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setVotiTemp(prev => ({ ...prev, [g.id]: isSV ? '6' : 'S.V.' }))}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer border ${
                            isSV 
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow' 
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          S.V.
                        </button>
                        <span className={`w-12 text-center font-mono font-black text-sm px-2 py-0.5 rounded-lg border ${
                          isSV ? 'bg-slate-900 text-slate-500 border-slate-800' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {votoCorrente}
                        </span>
                      </div>
                    </div>

                    {!isSV && (
                      <div className="space-y-1 pt-1">
                        <input
                          type="range"
                          min="5"
                          max="10"
                          step="0.5"
                          value={valoreNum}
                          onChange={(e) => setVotiTemp(prev => ({ ...prev, [g.id]: e.target.value }))}
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
                          <span>5</span>
                          <span>6</span>
                          <span>7</span>
                          <span>8</span>
                          <span>9</span>
                          <span>10</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setPartitaInVotazione(null)}
                className="w-1/2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={salvaVotiStorico}
                className="w-1/2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase transition cursor-pointer shadow-lg shadow-emerald-950 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Salva Voti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
