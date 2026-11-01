import React, { useState } from 'react';
import Distinta from './components/Distinta';
import Cronometro from './components/Cronometro';
import { salvaDistintaSuDb } from './services/db';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [faseApp, setFaseApp] = useState('distinta');
  const [partitaInfo, setPartitaInfo] = useState(null);
  const [rosa, setRosa] = useState([]);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  const [tempoGara, setTempoGara] = useState(1);
  const [golCasa, setGolCasa] = useState(0);
  const [golOspiti, setGolOspiti] = useState(0);

  const [partitaId] = useState('PARTITA_OGGI');

  const handleConfermaDistinta = async ({ partitaInfo, giocatori }) => {
    setSalvataggioInCorso(true);
    setPartitaInfo(partitaInfo);
    setRosa(giocatori);

    const risultato = await salvaDistintaSuDb(partitaId, partitaInfo, giocatori);

    setSalvataggioInCorso(false);

    if (risultato.success) {
      alert('Distinta salvata con successo sul Database Cloud!');
      setFaseApp('partita');
    } else {
      alert('Nota: Salvataggio locale ok. Connessione cloud non riuscita.');
      setFaseApp('partita');
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-3 md:p-6">
      {salvataggioInCorso && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <p className="text-emerald-400 font-bold text-lg animate-pulse flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 animate-spin" /> Salvataggio su Cloud in corso...
          </p>
        </div>
      )}

      {faseApp === 'distinta' ? (
        <Distinta onConfermaDistinta={handleConfermaDistinta} />
      ) : (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              onClick={() => setFaseApp('distinta')}
              className="text-xs uppercase font-bold text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Torna a Distinta
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Panchina
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between text-center">
            <div className="flex-1">
              <h3 className="font-bold text-sm md:text-base text-slate-200 truncate">
                {partitaInfo?.squadraCasa || 'Casa'}
              </h3>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">{golCasa}</div>
              <div className="flex justify-center gap-1 mt-2">
                <button
                  onClick={() => setGolCasa(golCasa + 1)}
                  className="bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded text-xs font-bold"
                >
                  +1
                </button>
                <button
                  onClick={() => setGolCasa(Math.max(0, golCasa - 1))}
                  className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-xs font-bold"
                >
                  -1
                </button>
              </div>
            </div>

            <div className="px-4 text-slate-600 font-bold text-xl">VS</div>

            <div className="flex-1">
              <h3 className="font-bold text-sm md:text-base text-slate-200 truncate">
                {partitaInfo?.squadraOspite || 'Ospite'}
              </h3>
              <div className="text-4xl md:text-5xl font-black text-white mt-1">{golOspiti}</div>
              <div className="flex justify-center gap-1 mt-2">
                <button
                  onClick={() => setGolOspiti(golOspiti + 1)}
                  className="bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded text-xs font-bold"
                >
                  +1
                </button>
                <button
                  onClick={() => setGolOspiti(Math.max(0, golOspiti - 1))}
                  className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-xs font-bold"
                >
                  -1
                </button>
              </div>
            </div>
          </div>

          <Cronometro
            tempo={tempoGara}
            setTempo={setTempoGara}
            onFinePrimoTempo={() => alert('Fine 1° Tempo!')}
            onFinePartita={() => alert('Triplice fischio!')}
          />
        </div>
      )}
    </div>
  );
}
