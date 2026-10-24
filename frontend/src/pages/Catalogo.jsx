import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

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
      {principiante && <p className="aviso">Revisa la técnica de cada ejercicio antes de registrarlo.</p>}
      <input className="buscar" placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        <button className={!grupo ? "chip activo" : "chip"} onClick={() => setGrupo("")}>Todos</button>
        {filtros.grupos.map((g) => <button key={g} className={grupo === g ? "chip activo" : "chip"} onClick={() => setGrupo(g)}>{g}</button>)}
      </div>
      <select value={equipo} onChange={(e) => setEquipo(e.target.value)}>
        <option value="">Todo el equipo</option>{filtros.equipos.map((x) => <option key={x}>{x}</option>)}</select>
      <ul className="lista">
        {lista.map((e) => (
          <li key={e.id_ejercicio} className="tarjeta">
            <div className="tarjeta-cab">
              <div className="miniatura">{e.grupo_muscular.slice(0, 2).toUpperCase()}</div>
              <div><b>{e.nombre}</b><small>{e.equipo} · {e.grupo_muscular}</small>
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
