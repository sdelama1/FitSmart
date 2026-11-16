// HU-16: panel del administrador del gimnasio: indicadores de uso y gestión del catálogo de ejercicios
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Barras } from "./Graficos.jsx";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const corta = (f) => { const [, m, d] = f.split("-"); return `${Number(d)} ${MESES[Number(m) - 1]}`; };
const GRUPOS = ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Core"];
const DIFICULTAD = { 1: "Básico", 2: "Intermedio", 3: "Avanzado" };
const VACIO = { nombre: "", grupo_muscular: "", equipo: "", tren: "superior", dificultad: 1, incremento_kg: 2.5, descripcion_tecnica: "", url_multimedia: "", id_progresion: "" };

export function Indicadores() {
  const [d, setD] = useState(null);
  useEffect(() => { api("/admin/indicadores").then(setD).catch(() => setD(null)); }, []);
  if (!d) return <p className="vacio">Cargando…</p>;
  return (
    <section>
      <h2>Indicadores de uso</h2>
      <div className="resumen-semana admin-datos">
        <div className="dato"><b>{d.registrados}</b><small>usuarios registrados</small></div>
        <div className="dato"><b className="verde">{d.activos}</b><small>usuarios activos en los últimos 7 días</small></div>
        <div className="dato"><b>{d.sesiones_semana}</b><small>sesiones en los últimos 7 días</small></div>
        <div className="dato"><b>{d.respuestas_sus}</b><small>respuestas del cuestionario SUS</small></div>
      </div>
      <div className="bloque">
        <h3>Sesiones por semana</h3>
        <Barras titulo="Sesiones registradas por semana" unidad="sesiones" columnas={["Semana", "Sesiones"]}
          datos={d.sesiones_por_semana.map((s) => ({ etq: corta(s.semana), valor: s.sesiones, detalle: `Semana del ${corta(s.semana)}` }))} />
      </div>
      <div className="bloque dos-columnas">
        <div className="tabla-series"><h4>Puntaje SUS promedio por grupo</h4>
          {d.sus_por_nivel.length ? <table className="series"><thead><tr><th>Grupo</th><th>Respuestas</th><th>Promedio</th></tr></thead>
            <tbody>{d.sus_por_nivel.map((s) => <tr key={s.nivel}><td className="cap">{s.nivel}</td><td>{s.respuestas}</td>
              <td><b>{s.promedio.toLocaleString("es-PE")}</b> {s.promedio >= 68 ? "· sobre 68" : "· bajo 68"}</td></tr>)}</tbody></table>
            : <p className="ayuda">Todavía no hay respuestas del cuestionario.</p>}
          <p className="ayuda">68 es el valor de referencia del SUS: por encima se considera una usabilidad aceptable.</p>
        </div>
        <div className="tabla-series"><h4>Usuarios por nivel</h4>
          <table className="series"><thead><tr><th>Nivel</th><th>Usuarios</th></tr></thead>
            <tbody>{d.usuarios_por_nivel.map((u) => <tr key={u.nivel}><td className="cap">{u.nivel}</td><td>{u.usuarios}</td></tr>)}</tbody></table>
        </div>
      </div>
    </section>
  );
}

export function GestionEjercicios() {
  const [lista, setLista] = useState([]);
  const [f, setF] = useState(null); // ejercicio en edición; null = formulario cerrado
  const [msg, setMsg] = useState(""); const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const cargar = () => api("/admin/ejercicios").then(setLista).catch(() => {});
  useEffect(() => { cargar(); }, []);

  const abrir = (e) => { setError(""); setMsg(""); setF(e ? { ...e, url_multimedia: e.url_multimedia || "", id_progresion: e.id_progresion || "", incremento_kg: Number(e.incremento_kg) } : { ...VACIO }); };
  const guardar = async (ev) => {
    ev.preventDefault(); setError("");
    try {
      const body = { ...f, dificultad: Number(f.dificultad), incremento_kg: Number(f.incremento_kg), id_progresion: f.id_progresion ? Number(f.id_progresion) : null };
      await api(f.id_ejercicio ? `/admin/ejercicios/${f.id_ejercicio}` : "/admin/ejercicios", { method: f.id_ejercicio ? "PUT" : "POST", body });
      setMsg(f.id_ejercicio ? "Ejercicio actualizado" : "Ejercicio agregado al catálogo"); setF(null); cargar();
    } catch (err) { setError(err.message); }
  };
  const baja = async (e) => { await api(`/admin/ejercicios/${e.id_ejercicio}`, { method: "DELETE" }); setMsg(`${e.nombre} se dio de baja`); cargar(); };
  const reactivar = async (e) => { await api(`/admin/ejercicios/${e.id_ejercicio}/reactivar`, { method: "PATCH" }); setMsg(`${e.nombre} volvió al catálogo`); cargar(); };
  const campo = (k) => (ev) => setF({ ...f, [k]: ev.target.value });
  const visibles = lista.filter((e) => !q || e.nombre.toLowerCase().includes(q.toLowerCase()));

  return (
    <section>
      <div className="cab-bloque"><h2>Catálogo de ejercicios</h2>{!f && <button className="btn mini nuevo" onClick={() => abrir(null)}>+ Nuevo ejercicio</button>}</div>
      {msg && <p className="ok">{msg}</p>}
      {f && <form className="tarjeta form form-ejercicio" onSubmit={guardar}>
        <h3>{f.id_ejercicio ? `Editar: ${f.nombre}` : "Nuevo ejercicio"}</h3>
        <label>Nombre<input required value={f.nombre} onChange={campo("nombre")} /></label>
        <div className="fila2">
          <label>Grupo muscular<select required value={f.grupo_muscular} onChange={campo("grupo_muscular")}><option value="">Selecciona</option>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</select></label>
          <label>Equipo<input required placeholder="Barra, Máquina, Mancuernas…" value={f.equipo} onChange={campo("equipo")} /></label>
        </div>
        <div className="fila2">
          <label>Tren<select value={f.tren} onChange={campo("tren")}><option value="superior">Superior</option><option value="inferior">Inferior</option></select></label>
          <label>Dificultad<select value={f.dificultad} onChange={campo("dificultad")}>{[1, 2, 3].map((n) => <option key={n} value={n}>{DIFICULTAD[n]}</option>)}</select></label>
        </div>
        <div className="fila2">
          <label>Incremento de carga (kg)<input type="number" step="0.5" min="0.5" max="10" required value={f.incremento_kg} onChange={campo("incremento_kg")} /></label>
          <label>Progresa a<select value={f.id_progresion} onChange={campo("id_progresion")}><option value="">Ninguno</option>
            {lista.filter((e) => e.activo && e.id_ejercicio !== f.id_ejercicio).map((e) => <option key={e.id_ejercicio} value={e.id_ejercicio}>{e.nombre}</option>)}</select></label>
        </div>
        <label>Descripción de la técnica<textarea rows={4} required minLength={20} value={f.descripcion_tecnica} onChange={campo("descripcion_tecnica")} /></label>
        <label>Enlace del video (opcional)<input type="url" placeholder="https://" value={f.url_multimedia} onChange={campo("url_multimedia")} /></label>
        {error && <p className="error">{error}</p>}
        <div className="botones"><button className="btn">Guardar</button><button type="button" className="btn sec" onClick={() => setF(null)}>Cancelar</button></div>
      </form>}
      <input className="buscar" placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="lista">{visibles.map((e) => (
        <li key={e.id_ejercicio} className={e.activo ? "tarjeta" : "tarjeta inactivo"}>
          <div className="fila-rutina">
            <div><b>{e.nombre}</b><small>{e.grupo_muscular} · {e.equipo} · {DIFICULTAD[e.dificultad]} · sube de {Number(e.incremento_kg).toLocaleString("es-PE")} kg</small>
              <small>{e.series_registradas} series registradas{!e.activo && " · dado de baja"}</small></div>
            <div className="acciones">
              <button className="btn mini" onClick={() => abrir(e)}>Editar</button>
              {e.activo ? <button className="btn mini peligro" onClick={() => baja(e)}>Dar de baja</button>
                : <button className="btn mini" onClick={() => reactivar(e)}>Reactivar</button>}
            </div>
          </div>
        </li>))}</ul>
    </section>
  );
}
