// HU-05, HU-06 y HU-10: registro de series con precarga y sugerencia de carga
// HU-20 a HU-23: alternativas con equipo ocupado, esfuerzo para principiantes, incremento por ejercicio y calentamiento
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import Temporizador from "./Temporizador.jsx";

// Control de − / + para no tener que escribir el peso ni las repeticiones; el valor también se puede tocar y editar
function Paso({ etq, valor, paso, min, unidad, onCambio, nombre }) {
  const mover = (d) => { const base = valor === "" ? 0 : Number(valor); onCambio(Math.max(min, Math.round((base + d) * 2) / 2)); };
  return (
    <div className="paso">
      <span className="etq">{etq}</span>
      <button type="button" onClick={() => mover(-paso)} aria-label={`Restar ${paso} a ${etq}`}>−</button>
      <div className="valor"><input name={nombre} type="number" step={paso} min={min} inputMode="decimal" placeholder="0" value={valor}
        style={{ width: `${Math.max(2, String(valor).length) + 0.6}ch` }}
        onChange={(e) => onCambio(e.target.value === "" ? "" : Number(e.target.value))} aria-label={etq} />{unidad && <span>{unidad}</span>}</div>
      <button type="button" onClick={() => mover(paso)} aria-label={`Sumar ${paso} a ${etq}`}>+</button>
    </div>
  );
}

const kg = (n) => Number(n).toLocaleString("es-PE", { maximumFractionDigits: 2 });
const fechaCorta = (f) => new Date(f + "T00:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" });

// HU-21: el principiante responde cuántas repeticiones más podía hacer; se guarda como RPE equivalente
const RESERVA = [["0", 10], ["1 o 2", 9], ["3 o 4", 7], ["5 o más", 5]];
const redondear = (v, paso) => Math.max(0, Math.round(v / paso) * paso);

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
  const [cal, setCal] = useState(false);
  const [alts, setAlts] = useState(null);
  const nivel = perfil?.nivel;

  useEffect(() => {
    api("/sesiones/hoy", { method: "POST" }).then((s) => { setSesion(s); return api(`/sesiones/${s.id_sesion}/series`); }).then(setHoy).catch((e) => setError(e.message));
    api("/ejercicios").then(setEjercicios).catch(() => {});
  }, []);

  const ej = ejercicios.find((e) => String(e.id_ejercicio) === String(idEj));
  const seriesEj = useMemo(() => hoy.filter((s) => String(s.id_ejercicio) === String(idEj)), [hoy, idEj]);
  const efectivas = useMemo(() => seriesEj.filter((s) => !s.calentamiento), [seriesEj]);
  const paso = Number(ej?.incremento_kg) || 2.5;

  useEffect(() => {
    if (!idEj || !sesion) return;
    setParams({ ejercicio: idEj }, { replace: true });
    api(`/ejercicios/${idEj}/ultima-sesion?excluir_sesion=${sesion.id_sesion}`).then(setAnterior).catch(() => setAnterior(null));
    setSug(null); setAceptado(null); setAlts(null); setCal(false);
    api(`/sugerencias/${idEj}?excluir_sesion=${sesion.id_sesion}`).then(setSug).catch(() => setSug(null));
  }, [idEj, sesion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Precarga: misma serie efectiva de la sesión anterior; si no existe, la última registrada. El calentamiento no cuenta
  useEffect(() => {
    const n = efectivas.length;
    const base = anterior?.series?.[n] || efectivas[n - 1] || anterior?.series?.at(-1);
    const v = base ? { peso_kg: base.peso_kg, repeticiones: base.repeticiones, rpe: base.rpe ?? "" } : { peso_kg: "", repeticiones: "", rpe: "" };
    if (aceptado != null) v.peso_kg = aceptado; // peso de la sugerencia aceptada
    // Calentamiento: la mitad de la carga de trabajo y 10 repeticiones, sin esfuerzo
    if (cal && v.peso_kg !== "") { v.peso_kg = redondear(v.peso_kg * 0.5, paso); v.repeticiones = 10; v.rpe = ""; }
    setF(v);
  }, [anterior, efectivas, aceptado, cal, paso]);

  const responder = async (acepta) => {
    try { await api(`/sugerencias/${sug.id_recomendacion}`, { method: "PATCH", body: { aceptada: acepta } }); } catch { /* se registra igual en pantalla */ }
    setAceptado(acepta ? sug.peso_sugerido_kg : sug.anterior.peso_kg);
    setSug({ ...sug, respondida: acepta ? "aceptada" : "mantenida" });
  };

  const guardar = async (e) => {
    e?.preventDefault(); setError("");
    try {
      const s = await api(`/sesiones/${sesion.id_sesion}/series`, { method: "POST", body: { id_ejercicio: Number(idEj), ...f, descanso_seg: descanso, calentamiento: cal } });
      setHoy([...hoy, { ...s, ejercicio: ej?.nombre }]); setTimer(Date.now());
    } catch (err) { setError(err.message); }
  };
  const borrar = async (s) => {
    await api(`/sesiones/${sesion.id_sesion}/series/${s.id_serie}`, { method: "DELETE" });
    setHoy(hoy.filter((x) => x.id_serie !== s.id_serie));
  };
  const cambiarDescanso = (v) => { setDescanso(v); try { localStorage.setItem("fitsmart_descanso", v); } catch { /* sin almacenamiento */ } };
  const poner = (k) => (v) => setF({ ...f, [k]: v });
  const precargado = anterior?.series?.length > 0 || seriesEj.length > 0 || aceptado != null;
  const volumenHoy = hoy.filter((s) => !s.calentamiento).reduce((t, s) => t + s.peso_kg * s.repeticiones, 0);
  const verAlternativas = async () => {
    if (alts) return setAlts(null);
    try { setAlts(await api(`/ejercicios/${idEj}/alternativas`)); } catch { setAlts([]); }
  };

  return (
    <section className="registrar">
      <div className="cab-registrar">
        <div><h2>Registrar entrenamiento</h2>
          {ej && <p className="sub">{anterior?.series?.length
            ? `Anterior (${fechaCorta(anterior.fecha)}): ${anterior.series.map((s) => `${kg(s.peso_kg)} kg × ${s.repeticiones}`).join(" · ")}`
            : "Sin registros anteriores de este ejercicio"}</p>}</div>
        <select className="elegir-ejercicio" value={idEj} onChange={(e) => setIdEj(e.target.value)}>
          <option value="">Elige un ejercicio</option>
          {ejercicios.map((e) => <option key={e.id_ejercicio} value={e.id_ejercicio}>{e.nombre} · {e.grupo_muscular}</option>)}
        </select>
      </div>
      {!ej && <p className="vacio">Elige un ejercicio para ver la sugerencia de carga y registrar tus series.</p>}

      {ej && <>
        <div className="cab-ejercicio"><h3>{ej.nombre}</h3>
          <button type="button" className="btn-ocupado" onClick={verAlternativas}>{alts ? "Cerrar" : "¿Equipo ocupado?"}</button></div>
        {alts && <div className="alternativas">
          <p className="sub">Ejercicios del mismo músculo con otro equipo ({ej.equipo.toLowerCase()} ocupado):</p>
          {alts.length ? alts.map((a) => (
            <button type="button" key={a.id_ejercicio} className="alt" onClick={() => setIdEj(String(a.id_ejercicio))}>
              <span><b>{a.nombre}</b><small>{a.equipo}{a.conocido ? " · ya lo hiciste" : ""}</small></span><span className="flecha">Cambiar ›</span>
            </button>)) : <p className="sub">No hay alternativas con otro equipo para este ejercicio.</p>}
        </div>}
        <div className="registro-grid">
          <div className="col-sug">
            {sug && <div className="sugerencia">
              <div className="tag">Sugerencia de la IA</div>
              <p className="cifra">{kg(sug.peso_sugerido_kg)} <small>kg × {sug.rep_min} a {sug.rep_max}</small></p>
              <small>Sesión anterior: {kg(sug.anterior.peso_kg)} kg × {sug.anterior.repeticiones}{sug.anterior.rpe ? ` con RPE ${Math.round(sug.anterior.rpe)}` : ""}.
                {sug.delta_kg > 0 ? ` Aumento sugerido: ${kg(sug.delta_kg)} kg.` : sug.delta_kg < 0 ? ` Reducción sugerida: ${kg(-sug.delta_kg)} kg.` : " Mantener el peso."}</small>
              <small className="fuente">{sug.fuente === "modelo" ? "Calculada por el modelo inteligente" : "Calculada con la regla de doble progresión"}</small>
              {!sug.respondida ? <div className="botones">
                <button className="btn" onClick={() => responder(true)}>Aceptar</button>
                <button className="btn sec" onClick={() => responder(false)}>Mantener peso</button></div>
                : <small><b>Sugerencia {sug.respondida}.</b></small>}
            </div>}
            {nivel === "principiante" && <details className="tecnica"><summary>Recordar la técnica</summary><p>{ej.descripcion_tecnica}</p></details>}
          </div>

          <div className="col-serie">
            <form className={cal ? "panel-serie modo-cal" : "panel-serie"} onSubmit={guardar}>
              <div className="cab"><span>{cal ? "Calentamiento" : `Serie ${efectivas.length + 1}`}</span>{precargado && <span>Precargado</span>}</div>
              <label className="interruptor"><input type="checkbox" checked={cal} onChange={(e) => setCal(e.target.checked)} />
                <span className="pista" aria-hidden="true" /><span>Serie de calentamiento<small>No cuenta para la sugerencia ni para tu progreso</small></span></label>
              <Paso etq="Peso" nombre="peso" valor={f.peso_kg} paso={paso} min={0} unidad="kg" onCambio={poner("peso_kg")} />
              <Paso etq="Reps" nombre="repeticiones" valor={f.repeticiones} paso={1} min={1} onCambio={poner("repeticiones")} />
              {!cal && (nivel === "principiante" ? <div className="rpe"><span className="etq">¿Cuántas repeticiones más podías hacer?</span>
                <div className="opciones reserva">{RESERVA.map(([t, r]) => (
                  <button type="button" key={t} className={Number(f.rpe) === r ? "activo" : ""} onClick={() => setF({ ...f, rpe: Number(f.rpe) === r ? "" : r })}>{t}</button>))}</div>
                <p className="ayuda">Piensa solo en si podías mover el peso con buena técnica, no en el cansancio. 0 = no salía ni una más.</p></div>
                : <div className="rpe"><span className="etq">Esfuerzo (RPE)</span>
                <div className="opciones">{[5, 6, 7, 8, 9, 10].map((r) => (
                  <button type="button" key={r} className={Number(f.rpe) === r ? "activo" : ""} onClick={() => setF({ ...f, rpe: Number(f.rpe) === r ? "" : r })}>{r}</button>))}</div>
                {nivel !== "experimentado" && <p className="ayuda">RPE: esfuerzo percibido de 1 (muy fácil) a 10 (no podías hacer otra repetición).</p>}</div>)}
              <p className="ayuda">Este ejercicio sube de {kg(paso)} en {kg(paso)} kg.</p>
              {error && <p className="error">{error}</p>}
              <button className="btn guardar" disabled={f.peso_kg === "" || !f.repeticiones}>✓ {cal ? "Guardar calentamiento" : "Guardar serie"}</button>
            </form>
            <Temporizador inicio={timer} segundos={descanso} onFin={() => setTimer(0)} />
            <label className="descanso">Descanso entre series
              <select value={descanso} onChange={(e) => cambiarDescanso(Number(e.target.value))}>
                {[45, 60, 90, 120, 180, 240].map((s) => <option key={s} value={s}>{s >= 60 ? `${s / 60} min` : `${s} s`}</option>)}</select></label>
          </div>

          {seriesEj.length > 0 && <div className="col-tabla tabla-series">
            <h4>Series de hoy en {ej.nombre}</h4>
            <table className="series">
              <thead><tr><th>Serie</th><th>Peso</th><th>Reps</th><th>RPE</th><th></th></tr></thead>
              <tbody>{seriesEj.map((s) => <tr key={s.id_serie} className={s.calentamiento ? "fila-cal" : ""}><td>{s.calentamiento ? "C" : efectivas.indexOf(s) + 1}</td><td>{kg(s.peso_kg)} kg</td><td>{s.repeticiones}</td><td>{s.rpe ?? "-"}</td>
                <td className="x"><button className="x" onClick={() => borrar(s)} aria-label="Borrar serie">✕</button></td></tr>)}</tbody>
            </table>
            {seriesEj.some((s) => s.calentamiento) && <p className="ayuda">C = calentamiento, no cuenta en los cálculos.</p>}
          </div>}
        </div>
      </>}

      {hoy.length > 0 && <div className="resumen"><h3>Hoy · {volumenHoy.toLocaleString("es-PE", { maximumFractionDigits: 1 })} kg de volumen</h3>
        {[...new Set(hoy.map((s) => s.ejercicio))].map((n) => <p key={n}><b>{n}:</b> {hoy.filter((s) => s.ejercicio === n && !s.calentamiento).map((s) => `${s.peso_kg}×${s.repeticiones}`).join(", ") || "solo calentamiento"}
          {hoy.some((s) => s.ejercicio === n && s.calentamiento) && <small> (+{hoy.filter((s) => s.ejercicio === n && s.calentamiento).length} de calentamiento)</small>}</p>)}</div>}
    </section>
  );
}
