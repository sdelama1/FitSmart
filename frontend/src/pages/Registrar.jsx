// HU-05, HU-06 y HU-10: registro de series con precarga y sugerencia de carga
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import Temporizador from "./Temporizador.jsx";

const leerDescanso = () => { try { return Number(localStorage.getItem("fitsmart_descanso")) || 90; } catch { return 90; } };

export default function Registrar({ perfil }) {
  const [params, setParams] = useSearchParams();
  const [sesion, setSesion] = useState(null);
  const [ejercicios, setEjercicios] = useState([]);
  const [hoy, setHoy] = useState([]);
  const [idEj, setIdEj] = useState(params.get("ejercicio") || "");
  const [anterior, setAnterior] = useState(null);
  const [sug, setSug] = useState(null);
  const [aceptado, setAceptado] = useState(null);
  const [f, setF] = useState({ peso_kg: "", repeticiones: "", rpe: "" });
  const [descanso, setDescanso] = useState(leerDescanso);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");
  const nivel = perfil?.nivel;

  useEffect(() => {
    api("/sesiones/hoy", { method: "POST" }).then((s) => { setSesion(s); return api(`/sesiones/${s.id_sesion}/series`); }).then(setHoy).catch((e) => setError(e.message));
    api("/ejercicios").then(setEjercicios).catch(() => {});
  }, []);

  const ej = ejercicios.find((e) => String(e.id_ejercicio) === String(idEj));
  const seriesEj = useMemo(() => hoy.filter((s) => String(s.id_ejercicio) === String(idEj)), [hoy, idEj]);

  useEffect(() => {
    if (!idEj || !sesion) return;
    setParams({ ejercicio: idEj }, { replace: true });
    api(`/ejercicios/${idEj}/ultima-sesion?excluir_sesion=${sesion.id_sesion}`).then(setAnterior).catch(() => setAnterior(null));
    setSug(null); setAceptado(null);
    api(`/sugerencias/${idEj}?excluir_sesion=${sesion.id_sesion}`).then(setSug).catch(() => setSug(null));
  }, [idEj, sesion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Precarga: misma serie de la sesión anterior; si no existe, la última serie registrada
  useEffect(() => {
    const n = seriesEj.length;
    const base = anterior?.series?.[n] || seriesEj[n - 1] || anterior?.series?.at(-1);
    const v = base ? { peso_kg: base.peso_kg, repeticiones: base.repeticiones, rpe: base.rpe ?? "" } : { peso_kg: "", repeticiones: "", rpe: "" };
    if (aceptado != null) v.peso_kg = aceptado; // peso de la sugerencia aceptada
    setF(v);
  }, [anterior, seriesEj, aceptado]);

  const responder = async (acepta) => {
    try { await api(`/sugerencias/${sug.id_recomendacion}`, { method: "PATCH", body: { aceptada: acepta } }); } catch { /* se registra igual en pantalla */ }
    setAceptado(acepta ? sug.peso_sugerido_kg : sug.anterior.peso_kg);
    setSug({ ...sug, respondida: acepta ? "aceptada" : "mantenida" });
  };

  const guardar = async (e) => {
    e?.preventDefault(); setError("");
    try {
      const s = await api(`/sesiones/${sesion.id_sesion}/series`, { method: "POST", body: { id_ejercicio: Number(idEj), ...f, descanso_seg: descanso } });
      setHoy([...hoy, { ...s, ejercicio: ej?.nombre }]); setTimer(Date.now());
    } catch (err) { setError(err.message); }
  };
  const borrar = async (s) => {
    await api(`/sesiones/${sesion.id_sesion}/series/${s.id_serie}`, { method: "DELETE" });
    setHoy(hoy.filter((x) => x.id_serie !== s.id_serie));
  };
  const cambiarDescanso = (v) => { setDescanso(v); try { localStorage.setItem("fitsmart_descanso", v); } catch { /* sin almacenamiento */ } };
  const num = (k) => (e) => setF({ ...f, [k]: e.target.value === "" ? "" : Number(e.target.value) });

  return (
    <section>
      <h2>Registrar entrenamiento</h2>
      <select value={idEj} onChange={(e) => setIdEj(e.target.value)}>
        <option value="">Elige un ejercicio</option>
        {ejercicios.map((e) => <option key={e.id_ejercicio} value={e.id_ejercicio}>{e.nombre} · {e.grupo_muscular}</option>)}
      </select>

      {ej && <>
        <h3>{ej.nombre}</h3>
        <p className="sub">{anterior?.series?.length
          ? `Anterior (${anterior.fecha}): ${anterior.series.map((s) => `${s.peso_kg} kg × ${s.repeticiones}`).join(", ")}`
          : "Sin registros anteriores de este ejercicio"}</p>
        {sug && <div className="sugerencia">
          <b>Sugerencia para hoy</b>
          <p className="cifra">{sug.peso_sugerido_kg} kg × {sug.rep_min} a {sug.rep_max}</p>
          <small>Sesión anterior: {sug.anterior.peso_kg} kg × {sug.anterior.repeticiones}{sug.anterior.rpe ? ` con RPE ${Math.round(sug.anterior.rpe)}` : ""}.
            {sug.delta_kg > 0 ? ` Aumento sugerido: ${sug.delta_kg} kg.` : sug.delta_kg < 0 ? ` Reducción sugerida: ${-sug.delta_kg} kg.` : " Mantener el peso."}</small>
          <small>{sug.fuente === "modelo" ? "Calculada por el modelo inteligente" : "Calculada con la regla de doble progresión"}</small>
          {!sug.respondida ? <div className="botones">
            <button className="btn" onClick={() => responder(true)}>Aceptar</button>
            <button className="btn sec" onClick={() => responder(false)}>Mantener peso</button></div>
            : <small><b>Sugerencia {sug.respondida}.</b></small>}
        </div>}
        {nivel === "principiante" && <details className="tecnica"><summary>Recordar la técnica</summary><p>{ej.descripcion_tecnica}</p></details>}

        <table className="series">
          <thead><tr><th>Serie</th><th>Peso (kg)</th><th>Reps</th><th>RPE</th><th></th></tr></thead>
          <tbody>
            {seriesEj.map((s) => <tr key={s.id_serie}><td>{s.numero_serie}</td><td>{s.peso_kg}</td><td>{s.repeticiones}</td><td>{s.rpe ?? "-"}</td>
              <td><button className="x" onClick={() => borrar(s)} aria-label="Borrar serie">✕</button></td></tr>)}
            <tr className="nueva">
              <td>{seriesEj.length + 1}</td>
              <td><input type="number" step="0.5" min="0" inputMode="decimal" value={f.peso_kg} onChange={num("peso_kg")} /></td>
              <td><input type="number" min="1" inputMode="numeric" value={f.repeticiones} onChange={num("repeticiones")} /></td>
              <td><input type="number" min="1" max="10" inputMode="numeric" value={f.rpe} onChange={num("rpe")} /></td><td></td>
            </tr>
          </tbody>
        </table>
        {nivel !== "experimentado" && <p className="ayuda">RPE: esfuerzo percibido de 1 (muy fácil) a 10 (no podías hacer otra repetición).</p>}
        {anterior?.series?.length > 0 && <p className="ayuda">Valores precargados de la sesión anterior.</p>}
        {error && <p className="error">{error}</p>}
        <button className="btn" onClick={guardar} disabled={f.peso_kg === "" || !f.repeticiones}>Guardar serie</button>
        <Temporizador inicio={timer} segundos={descanso} onFin={() => setTimer(0)} />
        <label className="descanso">Descanso entre series
          <select value={descanso} onChange={(e) => cambiarDescanso(Number(e.target.value))}>
            {[45, 60, 90, 120, 180, 240].map((s) => <option key={s} value={s}>{s >= 60 ? `${s / 60} min` : `${s} s`}</option>)}</select></label>
      </>}

      {hoy.length > 0 && <div className="resumen"><h3>Hoy</h3>
        {[...new Set(hoy.map((s) => s.ejercicio))].map((n) => <p key={n}><b>{n}:</b> {hoy.filter((s) => s.ejercicio === n).map((s) => `${s.peso_kg}×${s.repeticiones}`).join(", ")}</p>)}</div>}
    </section>
  );
}
