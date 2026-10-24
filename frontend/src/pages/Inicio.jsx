// HU-11 y HU-12: alertas de estancamiento y rutina guiada
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

const OBJ = { hipertrofia: "hipertrofia", fuerza: "fuerza", perdida_grasa: "pérdida de grasa", resistencia: "resistencia" };

export default function Inicio({ perfil }) {
  const [rutina, setRutina] = useState(undefined);
  const [alertas, setAlertas] = useState([]);
  const [dia, setDia] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/rutinas/actual").then(setRutina).catch(() => setRutina(null));
    api("/alertas").then(setAlertas).catch(() => {});
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
      {alertas.map((a) => (
        <div key={a.id_alerta} className="alerta">
          <b>Alerta de estancamiento</b><p>{a.mensaje}</p>
          <button className="enlace" onClick={() => leida(a)}>Entendido</button>
        </div>))}

      <h2>Mi rutina</h2>
      {rutina === undefined && <p className="vacio">Cargando…</p>}
      {rutina === null && <div className="tarjeta">
        <p>Genera una rutina según tu nivel ({perfil.nivel}), tu objetivo ({OBJ[perfil.objetivo]}) y tus {perfil.dias_por_semana} días por semana.</p>
        <button className="btn" onClick={generar}>Generar mi rutina</button></div>}
      {rutina && <>
        <p className="sub">{rutina.nombre} · {OBJ[rutina.objetivo]} · nivel {rutina.nivel}</p>
        {desactualizada && <div className="aviso">Tu perfil cambió. <button className="enlace" onClick={generar}>Regenerar rutina</button></div>}
        <div className="dias">{rutina.dias.map((d) => (
          <button key={d.dia} className={dia === d.dia ? "dia activo" : "dia"} onClick={() => setDia(d.dia)}>Día {d.dia}</button>))}</div>
        <ul className="lista">
          {diaActual?.ejercicios.map((e) => (
            <li key={e.id_ejercicio} className="tarjeta fila-rutina">
              <div><b>{e.nombre}</b><small>{e.series_objetivo} series × {e.rep_min} a {e.rep_max} repeticiones</small></div>
              <Link className="btn mini" to={`/registrar?ejercicio=${e.id_ejercicio}`}>Registrar</Link>
            </li>))}
        </ul>
      </>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
