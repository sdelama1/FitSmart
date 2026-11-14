import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

// HU-19: etiquetas de las recomendaciones personalizadas y de la dificultad del ejercicio
const TIPOS = { progresion: "Siguiente nivel", variante: "Variante", equilibrio: "Equilibrio", nuevo: "Nuevo para ti" };
const DIFICULTAD = { 1: "Básico", 2: "Intermedio", 3: "Avanzado" };

function Recomendaciones() {
  const [recs, setRecs] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { api("/recomendaciones").then(setRecs).catch(() => setRecs([])); }, []);
  const responder = async (r, estado) => {
    try { await api(`/recomendaciones/${r.id}`, { method: "PATCH", body: { estado } }); } catch { /* la navegación sigue igual */ }
    if (estado === "aceptada") navigate(`/registrar?ejercicio=${r.ejercicio.id_ejercicio}`);
    else setRecs(recs.filter((x) => x.id !== r.id));
  };
  if (!recs?.length) return null;
  return (
    <div className="recomendaciones">
      <h3>Te recomendamos</h3>
      <p className="sub">Según tu nivel y cómo vienes progresando.</p>
      <div className="recs">{recs.map((r) => (
        <div key={r.id} className={`rec rec-${r.tipo}`}>
          <span className="tag">{TIPOS[r.tipo]}</span>
          <b>{r.ejercicio.nombre}</b>
          <small className="rec-meta">{r.ejercicio.grupo_muscular} · {r.ejercicio.equipo} · {DIFICULTAD[r.ejercicio.dificultad] || "Básico"}</small>
          <p>{r.motivo}</p>
          <div className="botones">
            <button className="btn" onClick={() => responder(r, "aceptada")}>Registrar</button>
            <button className="btn sec" onClick={() => responder(r, "descartada")}>Ahora no</button>
          </div>
        </div>))}</div>
    </div>
  );
}

export default function Catalogo({ perfil }) {
  const [filtros, setFiltros] = useState({ grupos: [], equipos: [] });
  const [grupo, setGrupo] = useState(""); const [equipo, setEquipo] = useState(""); const [q, setQ] = useState("");
  const [lista, setLista] = useState([]); const [abierto, setAbierto] = useState(null);
  const navigate = useNavigate();
  const principiante = perfil?.nivel === "principiante";

  useEffect(() => { api("/ejercicios/filtros").then(setFiltros).catch(() => {}); }, []);
  useEffect(() => {
    const p = new URLSearchParams(); if (grupo) p.set("grupo", grupo); if (equipo) p.set("equipo", equipo); if (q) p.set("q", q);
    const t = setTimeout(() => api("/ejercicios?" + p).then(setLista).catch(() => setLista([])), 200);
    return () => clearTimeout(t);
  }, [grupo, equipo, q]);

  return (
    <section>
      <h2>Catálogo de ejercicios</h2>
      <Recomendaciones />
      {principiante && <p className="aviso">Revisa la técnica de cada ejercicio antes de registrarlo.</p>}
      <h3 className="titulo-lista">Todos los ejercicios</h3>
      <div className="filtros">
        <input className="buscar" placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          <button className={!grupo ? "chip activo" : "chip"} onClick={() => setGrupo("")}>Todos</button>
          {filtros.grupos.map((g) => <button key={g} className={grupo === g ? "chip activo" : "chip"} onClick={() => setGrupo(g)}>{g}</button>)}
        </div>
        <select className="equipo" value={equipo} onChange={(e) => setEquipo(e.target.value)}>
          <option value="">Todo el equipo</option>{filtros.equipos.map((x) => <option key={x}>{x}</option>)}</select>
      </div>
      <ul className="lista">
        {lista.map((e) => (
          <li key={e.id_ejercicio} className="tarjeta">
            <div className="tarjeta-cab">
              <div className="miniatura">{e.grupo_muscular.slice(0, 2).toUpperCase()}</div>
              <div><b>{e.nombre}</b><small>{e.equipo} · {e.grupo_muscular}</small>
                <span className={`dificultad d${e.dificultad || 1}`}>{DIFICULTAD[e.dificultad] || "Básico"}</span>
                <button className="enlace" onClick={() => setAbierto(abierto === e.id_ejercicio ? null : e.id_ejercicio)}>
                  {abierto === e.id_ejercicio ? "Ocultar técnica" : "Ver técnica ›"}</button></div>
            </div>
            {(abierto === e.id_ejercicio) && (
              <div className="tecnica">
                <p>{e.descripcion_tecnica}</p>
                {e.url_multimedia && <a href={e.url_multimedia} target="_blank" rel="noreferrer">Ver video de la técnica</a>}
                <button className="btn" onClick={() => navigate(`/registrar?ejercicio=${e.id_ejercicio}`)}>Registrar este ejercicio</button>
              </div>)}
          </li>))}
        {!lista.length && <li className="vacio">No hay ejercicios con esos filtros.</li>}
      </ul>
    </section>
  );
}
