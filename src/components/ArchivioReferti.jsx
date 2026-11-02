import React, { useState, useEffect } from 'react';
import { caricaStoricoReferti, eliminaRefertoStorico } from '../services/db';
import { ArrowLeft, Archive, Calendar, Share2, Copy, Check, Trash2, ChevronDown, ChevronUp, Trophy } from 'lucide-react';

export default function ArchivioReferti({ societa, onTornaIndietro }) {
  const [partiteStorico, setPartiteStorico] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [partitaApertaId, setPartitaApertaId] = useState(null);
  const [copiatoId, setCopiatoId] = useState(null);

  const ricaricaStorico = async () => {
    if (!societa?.id) return;
    setCaricamento(true);
    const lista = await caricaStoricoReferti(societa.id);
    setPartiteStorico(lista);
    setCaricamento(false);
  };

  useEffect(() => {
    ricaricaStorico();
  }, [societa?.id]);

  const toggleDettaglio = (id) => {
    setPartitaApertaId(prev => (prev === id ? null : id));
  };

  const generaTestoReferto = (p) => {
    const dataFormatted = p.data_gara ? p.data_gara.split('-').reverse().join('/') : '';
    let t = `📋 *REFERTO GARA - InPanchina*\n`;
    t += `📅 *Data:* ${dataFormatted}\n`;
    t += `🏆 *${(societa?.nome || '').toUpperCase()}*\n`;
    t += `⚽ *${(p.squadra_casa || 'CASA').toUpperCase()} ${p.gol_casa} - ${p.gol_ospite} ${(p.squadra_ospite || 'OSPITE').toUpperCase()}*\n\n`;

    t += `👤 *STAFF:*\n`;
    t += `• Mister: ${(p.allenatore || '-').toUpperCase()}\n`;
    t += `• Dirigente: ${(p.dirigente || '-').toUpperCase()}\n\n`;

    const eventi = p.referto_eventi || [];
    const reti = eventi.filter(e => e.tipo === 'GOL');
    const amm = (p.referto_giocatori || []).filter(g => g.ammonizioni > 0 && !g.espulso);
    const esp = (p.referto_giocatori || []).filter(g => g.espulso);
    const cambi = eventi.filter(e => e.tipo === 'SOSTITUZIONE');

    if (reti.length > 0) {
      t += `⚽ *RETI:*\n`;
      reti.forEach(r => { t += `• ${r.minuto}' ${r.dettagli.toUpperCase()}\n`; });
      t += `\n`;
    }

    if (amm.length > 0) {
      t += `🟨 *AMMONITI:*\n`;
      amm.forEach(a => { t += `• #${a.numero} ${a.nome.toUpperCase()} (${a.ammonizioni} amm.)\n`; });
      t += `\n`;
    }

    if (esp.length > 0) {
      t += `🟥 *ESPULSI:*\n`;
      esp.forEach(e => { t += `• #${e.numero} ${e.nome.toUpperCase()}\n`; });
      t += `\n`;
    }

    if (cambi.length > 0) {
      t += `🔄 *SOSTITUZIONI:*\n`;
      cambi.forEach(c => { t += `• ${c.minuto}' ${c.dettagli.toUpperCase()}\n`; });
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

  const handleElimina = async (p) => {
    const conferma = window.confirm(`Vuoi cancellare definitivamente il referto del ${p.data_gara} contro ${p.squadra_ospite}?`);
    if (!conferma) return;

    await eliminaRefertoStorico(p.id);
    await ricaricaStorico();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Intestazione */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          onClick={onTornaIndietro}
          className="text-xs uppercase font-bold text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Torna Indietro
        </button>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase flex items-center gap-1.5">
          <Archive className="w-3.5 h-3.5" /> Storico Gare
        </span>
      </div>

      {/* Titolo e Società */}
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

      {/* Lista Partite Archiviate */}
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

            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition">
                {/* Scheda Sintetica con Risultato */}
                <div 
                  onClick={() => toggleDettaglio(p.id)}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/50 select-none"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {dataFormatted}
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

                {/* Dettagli Espansi del Referto */}
                {aperta && (
                  <div className="border-t border-slate-800 p-4 bg-slate-950 space-y-4">
                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {generaTestoReferto(p)}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleElimina(p)}
                        className="p-2.5 rounded-xl text-rose-400 hover:text-white bg-slate-900 hover:bg-rose-950/40 border border-rose-900/40 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Trash2 className="w-4 h-4" /> Elimina
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopia(p)}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
                        >
                          {copiatoId === p.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          {copiatoId === p.id ? 'Copiato!' : 'Copia'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleWhatsApp(p)}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950"
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
    </div>
  );
}
