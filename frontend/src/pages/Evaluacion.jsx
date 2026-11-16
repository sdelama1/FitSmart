// HU-15: cuestionario SUS (System Usability Scale) en español, aplicado desde el módulo
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export const ITEMS_SUS = [
  "Creo que me gustaría usar FitSmart con frecuencia.",
  "Encontré FitSmart innecesariamente complejo.",
  "Pensé que FitSmart era fácil de usar.",
  "Creo que necesitaría ayuda de una persona con conocimientos técnicos para poder usar FitSmart.",
  "Encontré que las distintas funciones de FitSmart estaban bien integradas.",
  "Pensé que había demasiada inconsistencia en FitSmart.",
  "Imagino que la mayoría de las personas aprendería a usar FitSmart muy rápidamente.",
  "Encontré FitSmart muy difícil de usar.",
  "Me sentí muy seguro usando FitSmart.",
  "Necesité aprender muchas cosas antes de poder empezar a usar FitSmart.",
];
const ESCALA = [[1, "Totalmente en desacuerdo"], [2, "En desacuerdo"], [3, "Ni de acuerdo ni en desacuerdo"], [4, "De acuerdo"], [5, "Totalmente de acuerdo"]];

export default function Evaluacion() {
  const [estado, setEstado] = useState(null);
  const [r, setR] = useState(Array(10).fill(null));
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  useEffect(() => { api("/sus/estado").then(setEstado).catch(() => setEstado({})); }, []);

  const faltan = r.filter((x) => x == null).length;
  const enviar = async (e) => {
    e.preventDefault(); setError("");
    try { await api("/sus", { method: "POST", body: { respuestas: r } }); setEnviado(true); } catch (err) { setError(err.message); }
  };

  if (!estado) return <p className="vacio">Cargando…</p>;
  if (enviado || estado.respondido) return (
    <section className="angosta">
      <h2>Evaluación de FitSmart</h2>
      <div className="tarjeta gracias"><b>¡Gracias por tu evaluación!</b>
        <p>Tus respuestas quedaron registradas para el estudio de usabilidad. El cuestionario se responde una sola vez.</p>
        <Link className="btn" to="/">Volver al inicio</Link></div>
    </section>
  );
  return (
    <section className="angosta sus">
      <h2>Evaluación de FitSmart</h2>
      <p className="sub">Son 10 afirmaciones sobre tu experiencia usando FitSmart. Marca qué tan de acuerdo estás con cada una; no hay respuestas correctas. Toma unos 2 minutos.</p>
      {!estado.disponible && <p className="aviso">El cuestionario se recomienda después de usar FitSmart en al menos {estado.minimo} sesiones (llevas {estado.sesiones}).</p>}
      <form onSubmit={enviar}>
        <ol className="items-sus">{ITEMS_SUS.map((t, i) => (
          <li key={i} className="tarjeta">
            <p>{t}</p>
            <div className="likert" role="radiogroup" aria-label={`Afirmación ${i + 1}`}>
              {ESCALA.map(([v, etq]) => (
                <button type="button" key={v} role="radio" aria-checked={r[i] === v} title={etq}
                  className={r[i] === v ? "activo" : ""} onClick={() => setR(r.map((x, j) => (j === i ? v : x)))}>{v}</button>))}
            </div>
            <div className="extremos"><span>Totalmente en desacuerdo</span><span>Totalmente de acuerdo</span></div>
          </li>))}</ol>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={faltan > 0}>{faltan > 0 ? `Faltan ${faltan} ${faltan === 1 ? "respuesta" : "respuestas"}` : "Enviar evaluación"}</button>
      </form>
    </section>
  );
}
