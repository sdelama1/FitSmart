// HU-08: historial por fecha y por ejercicio
import { useEffect, useState } from "react";
import { api } from "../api.js";

const fecha = (s) => new Date(s + "T00:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

export default function Historial() {
  const [ejercicios, setEjercicios] = useState([]);
  const [filtro, setFiltro] = useState({ ejercicio: "", desde: "", hasta: "" });
  const [sesiones, setSesiones] = useState([]);
  useEffect(() => { api("/ejercicios").then(setEjercicios).catch(() => {}); }, []);
  useEffect(() => {
    const p = new URLSearchParams(Object.entries(filtro).filter(([, v]) => v));
    api("/sesiones?" + p).then(setSesiones).catch(() => setSesiones([]));
  }, [filtro]);
  return (
    <section>
      <h2>Historial</h2>
      <select value={filtro.ejercicio} onChange={(e) => setFiltro({ ...filtro, ejercicio: e.target.value })}>
        <option value="">Todos los ejercicios</option>
        {ejercicios.map((e) => <option key={e.id_ejercicio} value={e.id_ejercicio}>{e.nombre}</option>)}</select>
      <div className="fila2">
        <label>Desde<input type="date" value={filtro.desde} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} /></label>
        <label>Hasta<input type="date" value={filtro.hasta} onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} /></label>
      </div>
      <ul className="lista">
        {sesiones.map((s) => (
          <li key={s.id_sesion} className="tarjeta">
            <b>{fecha(s.fecha)}</b>
            {s.ejercicios.map((e) => (
              <div key={e.id_ejercicio} className="hist-ej"><span>{e.nombre}</span>
                <small>{e.series.map((x) => `${x.peso_kg} kg × ${x.repeticiones}${x.rpe ? ` (RPE ${x.rpe})` : ""}`).join(" · ")}</small></div>))}
          </li>))}
        {!sesiones.length && <li className="vacio">Todavía no hay sesiones registradas.</li>}
      </ul>
    </section>
  );
}
