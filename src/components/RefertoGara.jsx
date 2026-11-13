import React, { useState } from 'react';
import { FileText, Copy, Share2, Check, ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';

export default function RefertoGara({ 
  partitaInfo, 
  societaNome, 
  golCasa, 
  golOspiti, 
  eventi, 
  giocatori, 
  minutoCorrente,
  tempoGara,
  campionato,
  annata,
  onChiudi, 
  onTerminaEResetta 
}) {
  const [copiato, setCopiato] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  // 1. Analisi precisa degli eventi per ogni giocatore
  const eventiPerGiocatore = {};
  (eventi || []).forEach(e => {
    const dett = (e.dettagli || '').toUpperCase();
    (giocatori || []).forEach(g => {
      const matchId = e.giocatoreId === g.id || e.esceId === g.id || e.entraId === g.id;
      const matchNum = g.numero && (dett.includes(`#${g.numero} `) || dett.includes(` #${g.numero}`) || dett.includes(`#${g.numero}-`));
      
      if (matchId || matchNum) {
        if (!eventiPerGiocatore[g.id]) {
          eventiPerGiocatore[g.id] = { haGol: false, haAmm: false, haEsp: false, haCambioEsce: false, haCambioEntra: false };
        }
        if (e.tipo === 'GOL') eventiPerGiocatore[g.id].haGol = true;
        if (e.tipo === 'AMMONIZIONE') eventiPerGiocatore[g.id].haAmm = true;
        if (e.tipo === 'ESPULSIONE') eventiPerGiocatore[g.id].haEsp = true;
        if (e.tipo === 'SOSTITUZIONE') {
          if (e.esceId === g.id || (e.esceId === null && dett.includes(`ESCE #${g.numero}`))) {
            eventiPerGiocatore[g.id].haCambioEsce = true;
          }
          if (e.entraId === g.id || (e.entraId === null && dett.includes(`ENTRA #${g.numero}`))) {
            eventiPerGiocatore[g.id].haCambioEntra = true;
          }
        }
      }
    });
  });

  // 2. Mappatura e ordinamento matematico rigoroso in due blocchi separati per numero di maglia
  const rosaConMinuti = (giocatori || []).map(g => {
    const minutiVal = g.minuti !== undefined && g.minuti !== null ? Number(g.minuti) : 0;
    const evs = eventiPerGiocatore[g.id] || { haGol: false, haAmm: false, haEsp: false, haCambioEsce: false, haCambioEntra: false };
    
    const isEspulsoFinale = g.espulso || evs.haEsp;
    const haGiocato = minutiVal > 0 || isEspulsoFinale || evs.haCambioEntra;

    return {
      ...g,
      minuti: minutiVal,
      haGol: evs.haGol,
      haAmm: evs.haAmm || g.ammonizioni > 0,
      haEsp: isEspulsoFinale,
      haCambioEsce: evs.haCambioEsce,
      haCambioEntra: evs.haCambioEntra,
      haGiocato
    };
  }).sort((a, b) => {
    // BLOCCO 1: Chi ha giocato/è entrato/è espulso va SEMPRE sopra
    if (a.haGiocato && !b.haGiocato) return -1;
    if (!a.haGiocato && b.haGiocato) return 1;

    // BLOCCO 2: Ordinamento rigoroso per numero di maglia crescente all'interno di ciascun gruppo
    return parseInt(a.numero, 10) - parseInt(b.numero, 10);
  });

  const golEventi = (eventi || []).filter(e => e.tipo === 'GOL');
  const ammoniti = (giocatori || []).filter(g => g.ammonizioni > 0 && !g.espulso);
  const espulsi = (giocatori || []).filter(g => g.espulso);
  const sostituzioni = (eventi || []).filter(e => e.tipo === 'SOSTITUZIONE');

  const generaTestoReferto = () => {
    let t = `📋 *REFERTO GARA*\n`;
    t += `📅 *Data:* ${partitaInfo?.dataPartita ? partitaInfo.dataPartita.split('-').reverse().join('/') : ''}\n`;
    if (campionato) t += `🏆 *Campionato:* ${campionato}\n`;
    if (annata) t += `👤 *Annata:* ${annata}\n`;
    t += `\n`;
    t += `⚽ *${(partitaInfo?.squadraCasa || 'CASA').toUpperCase()} ${golCasa} - ${golOspiti} ${(partitaInfo?.squadraOspite || 'OSPITI').toUpperCase()}*\n\n`;

    t += `👔 *STAFF TECNICO & DIRIGENZIALE UFFICIALE:*\n`;
    if (partitaInfo?.allenatore) t += `• Allenatore: ${partitaInfo.allenatore.toUpperCase()}\n`;
    if (partitaInfo?.allenatoreSeconda) t += `• Allenatore in Seconda: ${partitaInfo.allenatoreSeconda.toUpperCase()}\n`;
    if (partitaInfo?.dirigente) t += `• Dirigente Accompagnatore Ufficiale della Squadra: ${partitaInfo.dirigente.toUpperCase()}\n`;
    if (partitaInfo?.dirigenteUfficiali) t += `• Dirigente Addetto Ufficiali di Gara: ${partitaInfo.dirigenteUfficiali.toUpperCase()}\n`;
    if (partitaInfo?.assistenteArbitro) t += `• Assistente all'Arbitro: ${partitaInfo.assistenteArbitro.toUpperCase()}\n`;
    if (partitaInfo?.medicoSociale) t += `• Medico Sociale: ${partitaInfo.medicoSociale.toUpperCase()}\n`;
    if (partitaInfo?.massaggiatore) t += `• Massaggiatore: ${partitaInfo.massaggiatore.toUpperCase()}\n`;
    if (partitaInfo?.preparatoreAtletico) t += `• Preparatore Atletico: ${partitaInfo.preparatoreAtletico.toUpperCase()}\n`;
    if (partitaInfo?.preparatorePortieri) t += `• Preparatore dei Portieri: ${partitaInfo.preparatorePortieri.toUpperCase()}\n`;
    t += `\n`;

    if (golEventi.length > 0) {
      t += `⚽ *MARCATURE:*\n`;
      golEventi.forEach(g => {
        t += `• ${g.minuto}' ${g.dettagli.toUpperCase()}\n`;
      });
      t += `\n`;
    }

    if (ammoniti.length > 0) {
      t += `🟨 *AMMONITI:*\n`;
      ammoniti.forEach(g => {
        t += `• #${g.numero} ${g.nome.toUpperCase()} (${g.ammonizioni} amm.)\n`;
      });
      t += `\n`;
    }

    if (espulsi.length > 0) {
      t += `🟥 *ESPULSI:*\n`;
      espulsi.forEach(g => {
        t += `• #${g.numero} ${g.nome.toUpperCase()}\n`;
      });
      t += `\n`;
    }

    if (sostituzioni.length > 0) {
      t += `🔄 *SOSTITUZIONI:*\n`;
      sostituzioni.forEach(s => {
        t += `• ${s.minuto}' ${s.dettagli.toUpperCase()}\n`;
      });
      t += `\n`;
    }

    t += `⏱️ *MINUTAGGIO & PAGELLE ROSA:*\n`;
    rosaConMinuti.forEach(g => {
      const fascia = g.isCapitano ? ' (C)' : g.isVice ? ' (VC)' : '';
      
      let icone = '';
      if (g.haGol) icone += ' ⚽';
      if (g.haAmm) icone += ' 🟨';
      
      // Regola ferrea: se è espulso, niente icona del cambio!
      if (g.haEsp) {
        icone += ' 🟥';
      } else {
        if (g.haCambioEsce || g.haCambioEntra) icone += ' 🔄';
      }

      t += `• #${g.numero} ${g.nome.toUpperCase()}${fascia}${icone}: ${g.minuti}'${g.minuti === 0 && !g.haCambioEntra ? ' (PANCHINA)' : ''}\n`;
    });

    return t;
  };

  const testoReferto = generaTestoReferto();

  const handleCopia = () => {
    navigator.clipboard.writeText(testoReferto);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2500);
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(testoReferto)}`;
    window.open(url, '_blank');
  };

  const handleTerminaConferma = async () => {
    const conferma = window.confirm(
      "Vuoi terminare definitivamente la partita e archiviarla con il minutaggio e lo staff nello storico?\n\nIl live verrà azzerato e preparato per la prossima gara (la rosa e lo staff rimarranno salvati)."
    );
    if (!conferma) return;

    setSalvataggioInCorso(true);
    if (onTerminaEResetta) {
      await onTerminaEResetta(rosaConMinuti);
    }
    setSalvataggioInCorso(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          onClick={onChiudi}
          className="text-xs uppercase font-bold text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Torna al Live
        </button>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 uppercase">
          Referto Ufficiale
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <h2 className="text-lg font-bold flex items-center gap-2 text-white uppercase">
          <FileText className="w-5 h-5 text-emerald-400" /> Referto Completo di Gara
        </h2>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
          {testoReferto}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCopia}
            className="p-3.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-2 transition border border-slate-700 uppercase"
          >
            {copiato ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> Copiato!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copia Testo
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="p-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950 uppercase"
          >
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleTerminaConferma}
            disabled={salvataggioInCorso}
            className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2 transition shadow-xl shadow-rose-950 cursor-pointer"
          >
            {salvataggioInCorso ? (
              <CheckCircle2 className="w-5 h-5 animate-spin" />
            ) : (
              <RotateCcw className="w-5 h-5" />
            )}
            Termina Live e Archivia per Prossima Partita
          </button>
          <p className="text-[11px] text-slate-500 text-center mt-2 uppercase">
            Salva il referto nello storico e azzera il punteggio/eventi per la prossima domenica.
          </p>
        </div>
      </div>
    </div>
  );
}
