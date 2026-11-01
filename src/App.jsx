import React, { useState } from 'react';
import Distinta from './components/Distinta';

export default function App() {
  const [datiGara, setDatiGara] = useState(null);

  const handleConferma = (dati) => {
    setDatiGara(dati);
    alert('Distinta confermata con successo!');
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100">
      <Distinta onConfermaDistinta={handleConferma} />
    </div>
  );
}
