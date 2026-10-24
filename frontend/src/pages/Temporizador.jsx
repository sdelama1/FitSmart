// HU-07: temporizador de descanso que inicia al guardar una serie
import { useEffect, useRef, useState } from "react";

function avisar() {
  try { navigator.vibrate?.([300, 150, 300]); } catch { /* sin vibración */ }
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch { /* sin audio */ }
}

export default function Temporizador({ inicio, segundos, onFin }) {
  const [resta, setResta] = useState(0);
  const fin = useRef(0);
  useEffect(() => {
    if (!inicio) return;
    fin.current = Date.now() + segundos * 1000; setResta(segundos);
    const id = setInterval(() => {
      const r = Math.max(0, Math.round((fin.current - Date.now()) / 1000));
      setResta(r);
      if (r === 0) { clearInterval(id); avisar(); onFin?.(); }
    }, 250);
    return () => clearInterval(id);
  }, [inicio]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!inicio || resta === 0) return null;
  const mm = String(Math.floor(resta / 60)).padStart(2, "0"), ss = String(resta % 60).padStart(2, "0");
  return (
    <div className="temporizador">
      <span>Descanso</span><b>{mm}:{ss}</b>
      <button className="enlace" onClick={() => { setResta(0); onFin?.(); }}>Saltar</button>
    </div>
  );
}
