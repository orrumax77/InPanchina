import React, { useState } from 'react';
import { FileText, Copy, Share2, Check, ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';

export default function RefertoGara({ partitaInfo, societaNome, golCasa, golOspiti, eventi, giocatori, onChiudi, onTerminaEResetta }) {
  const [copiato, setCopiato] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  const golEventi = eventi.filter(e => e.tipo === 'GOL');
  const ammoniti = giocatori.filter(g => g.ammonizioni > 0 && !g.espulso);
  const espulsi = giocatori.filter(g => g.espulso);
  const sostituzioni = eventi.filter(e => e.tipo === 'SOSTITUZIONE');

  const generaTestoReferto = () => {
    let t = `📋 *REFERTO GARA - InPanchina*\n`;
    t += `📅 *Data:* ${partitaInfo?.dataPartita ? partitaInfo.dataPartita.split('-').reverse().join('/') : ''}\n`;
    t += `🏆 *${(societaNome || '').toUpperCase()}*\n`;
    t += `⚽ *${(partitaInfo?.squadraCasa || 'CASA').toUpperCase()} ${golCasa} - ${golOspiti} ${(partitaInfo?.squadraOspite || 'OSPITI').toUpperCase()}*\n\n`;

    t += `👤 *STAFF TECNICO:*\n`;
    t += `• Mister: ${(partitaInfo?.allenatore || '-').toUpperCase()}\n`;
    t += `• Dirigente: ${(partitaInfo?.dirigente || '-').toUpperCase()}\n\n`;

    if (golEventi.length > 0) {
      t += `⚽ *RETI:*\n`;
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
    }

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
      "Vuoi terminare definitivamente la partita e archiviarla nello storico?\n\nIl live verrà azzerato e preparato per la prossima gara (la rosa rimarrà intatta)."
    );
    if (!conferma) return;

    setSalvataggioInCorso(true);
    if (onTerminaEResetta) {
      await onTerminaEResetta();
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
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
          Referto Ufficiale
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <h2 className="text-lg font-bold flex items-center gap-2 text-white uppercase">
          <FileText className="w-5 h-5 text-emerald-400" /> Riepilogo Referto Gara
        </h2>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
          {testoReferto}
        </div>

        {/* Tasti Copia e WhatsApp */}
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

        {/* TASTO TERMINA LIVE E ARCHIVIA */}
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
