// HU-11 y HU-12: alertas de estancamiento y rutina guiada
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

// Resumen de la semana calculado con el historial del usuario (semana de lunes a domingo)
const lunesDe = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const volumen = (ss) => ss.reduce((t, s) => t + s.ejercicios.reduce((a, e) => a + e.series.reduce((b, x) => b + (x.calentamiento ? 0 : x.peso_kg * x.repeticiones), 0), 0), 0);
function resumirSemana(sesiones) {
  const lunes = lunesDe(new Date()), lunesAnt = new Date(lunes); lunesAnt.setDate(lunes.getDate() - 7);
  const esta = sesiones.filter((s) => s.fecha >= iso(lunes)), ant = sesiones.filter((s) => s.fecha >= iso(lunesAnt) && s.fecha < iso(lunes));
  const vEsta = volumen(esta), vAnt = volumen(ant);
  return { sesiones: esta.length, series: esta.reduce((t, s) => t + s.ejercicios.reduce((a, e) => a + e.series.filter((x) => !x.calentamiento).length, 0), 0),
    volumen: vEsta, anterior: vAnt };
}
const miles = (n) => n.toLocaleString("es-PE", { maximumFractionDigits: 0 });

const OBJ = { hipertrofia: "aumento de masa muscular", fuerza: "fuerza", perdida_grasa: "pérdida de grasa", resistencia: "resistencia" };

export default function Inicio({ perfil, usuario }) {
  const [rutina, setRutina] = useState(undefined);
  const [alertas, setAlertas] = useState([]);
  const [dia, setDia] = useState(1);
  const [error, setError] = useState("");
  const [semana, setSemana] = useState(null);

  useEffect(() => {
    api("/rutinas/actual").then(setRutina).catch(() => setRutina(null));
    api("/alertas").then(setAlertas).catch(() => {});
    api("/sesiones").then((ss) => setSemana(resumirSemana(ss))).catch(() => {});
  }, []);

  const generar = async () => {
    setError("");
    try { setRutina(await api("/rutinas/generar", { method: "POST" })); setDia(1); } catch (e) { setError(e.message); }
  };
  const leida = async (a) => { await api(`/alertas/${a.id_alerta}/leida`, { method: "PATCH" }); setAlertas(alertas.filter((x) => x.id_alerta !== a.id_alerta)); };
  const desactualizada = rutina && perfil && (rutina.nivel !== perfil.nivel || rutina.objetivo !== perfil.objetivo || rutina.dias_por_semana !== perfil.dias_por_semana);
  const diaActual = rutina?.dias?.find((d) => d.dia === dia);

  return (
    <section>
      <p className="saludo">Hola, {usuario?.nombre?.split(" ")[0] || "atleta"}</p>
      <h2>Mi rutina</h2>
      {semana && <div className="resumen-semana">
        <div className="dato"><b>{semana.sesiones}</b><small>{semana.sesiones === 1 ? "sesión" : "sesiones"} esta semana</small></div>
        <div className="dato"><b className="verde">{miles(semana.volumen)} kg</b>
          <small>volumen esta semana{semana.anterior > 0 ? ` · la anterior: ${miles(semana.anterior)} kg` : ""}</small></div>
        <div className="dato solo-pc"><b>{semana.series}</b><small>{semana.series === 1 ? "serie registrada" : "series registradas"} esta semana</small></div>
      </div>}
      {alertas.map((a) => (
        <div key={a.id_alerta} className="alerta">
          <b>Alerta de estancamiento</b><p>{a.mensaje}</p>
          <button className="enlace" onClick={() => leida(a)}>Entendido</button>
        </div>))}

      {rutina === undefined && <p className="vacio">Cargando…</p>}
      {rutina === null && <div className="tarjeta">
        <p>Genera una rutina según tu nivel ({perfil.nivel}), tu objetivo ({OBJ[perfil.objetivo]}) y tus {perfil.dias_por_semana} días por semana.</p>
        <button className="btn" onClick={generar}>Generar mi rutina</button></div>}
      {rutina && <>
        <p className="sub">{rutina.nombre} · {OBJ[rutina.objetivo]} · nivel {rutina.nivel}</p>
        {desactualizada && <div className="aviso">Tu perfil cambió. <button className="enlace" onClick={generar}>Regenerar rutina</button></div>}
        <div className="dias dias-rutina">{rutina.dias.map((d) => (
          <button key={d.dia} className={dia === d.dia ? "dia activo" : "dia"} onClick={() => setDia(d.dia)}>Día {d.dia}</button>))}</div>
        <ul className="lista">
          {diaActual?.ejercicios.map((e) => (
            <li key={e.id_ejercicio} className="tarjeta fila-rutina">
              <span className="miniatura">{e.nombre.split(" ").filter((x) => x.length > 2).slice(0, 2).map((x) => x[0].toUpperCase()).join("")}</span>
              <div><b>{e.nombre}</b><small>{e.series_objetivo} series × {e.rep_min} a {e.rep_max} repeticiones</small></div>
              <Link className="btn mini" to={`/registrar?ejercicio=${e.id_ejercicio}`}>Registrar</Link>
            </li>))}
        </ul>
      </>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
