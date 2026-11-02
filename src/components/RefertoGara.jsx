import React, { useState } from 'react';
import { FileText, Copy, Share2, Check, ArrowLeft } from 'lucide-react';

export default function RefertoGara({ partitaInfo, societaNome, golCasa, golOspiti, eventi, giocatori, onChiudi }) {
  const [copiato, setCopiato] = useState(false);

  const golEventi = eventi.filter(e => e.tipo === 'GOL');
  const ammoniti = giocatori.filter(g => g.ammonizioni > 0 && !g.espulso);
  const espulsi = giocatori.filter(g => g.espulso);
  const sostituzioni = eventi.filter(e => e.tipo === 'SOSTITUZIONE');

  const generaTestoReferto = () => {
    let t = `📋 *REFERTO GARA - InPanchina*\n`;
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

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
          {testoReferto}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
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
            onClick={handleWhatsApp}
            className="p-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950 uppercase"
          >
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
