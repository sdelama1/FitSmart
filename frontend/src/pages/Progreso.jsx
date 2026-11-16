// HU-13 y HU-14: gráficos de progreso y comparación con la semana anterior
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Barras, Linea } from "./Graficos.jsx";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const corta = (f) => { const [, m, d] = f.split("-"); return `${Number(d)} ${MESES[Number(m) - 1]}`; };
const miles = (n) => Number(n).toLocaleString("es-PE", { maximumFractionDigits: 0 });

export default function Progreso() {
  const [semanal, setSemanal] = useState(null);
  const [comp, setComp] = useState(null);
  const [ejercicios, setEjercicios] = useState([]);
  const [idEj, setIdEj] = useState("");
  const [serie, setSerie] = useState([]);

  useEffect(() => {
    api("/progreso/semanal?semanas=8").then(setSemanal).catch(() => setSemanal([]));
    api("/progreso/comparacion").then(setComp).catch(() => setComp({ grupos: [] }));
    api("/progreso/ejercicios").then((l) => { setEjercicios(l); if (l[0]) setIdEj(String(l[0].id_ejercicio)); }).catch(() => {});
  }, []);
  useEffect(() => { if (idEj) api(`/progreso/ejercicio/${idEj}`).then(setSerie).catch(() => setSerie([])); }, [idEj]);

  const sinDatos = semanal && semanal.every((s) => s.volumen === 0);
  return (
    <section className="progreso">
      <h2>Mi progreso</h2>
      {sinDatos && <p className="vacio">Aún no hay series registradas. Tu progreso aparecerá aquí después de tu primer entrenamiento.</p>}

      {comp && comp.grupos.length > 0 && <div className="bloque">
        <h3>Esta semana frente a la anterior</h3>
        <p className="sub">Volumen (peso × repeticiones) de los últimos 7 días comparado con los 7 días anteriores, por grupo muscular.</p>
        <div className="comparacion">{comp.grupos.map((g) => (
          <div key={g.grupo_muscular} className="dato">
            <small>{g.grupo_muscular}</small>
            <b>{miles(g.actual)} kg</b>
            {g.variacion == null
              ? <span className="variacion neutra">{g.anterior === 0 ? "Sin datos la semana anterior" : ""}</span>
              : <span className={g.variacion >= 0 ? "variacion sube" : "variacion baja"}>{g.variacion >= 0 ? "▲" : "▼"} {Math.abs(g.variacion).toLocaleString("es-PE")} %<small>antes {miles(g.anterior)} kg</small></span>}
          </div>))}</div>
      </div>}

      {semanal && !sinDatos && <div className="bloque">
        <h3>Volumen semanal</h3>
        <p className="sub">Suma de peso × repeticiones de cada semana (lunes a domingo). No incluye el calentamiento.</p>
        <Barras titulo="Volumen semanal de las últimas 8 semanas" unidad="kg" columnas={["Semana", "Volumen"]}
          datos={semanal.map((s) => ({ etq: corta(s.semana), valor: s.volumen, detalle: `Semana del ${corta(s.semana)} · ${s.sesiones} ${s.sesiones === 1 ? "sesión" : "sesiones"}, ${s.series} ${s.series === 1 ? "serie" : "series"}` }))} />
      </div>}

      {ejercicios.length > 0 && <div className="bloque">
        <div className="cab-bloque"><h3>Carga máxima por ejercicio</h3>
          <select className="elegir-ejercicio" value={idEj} onChange={(e) => setIdEj(e.target.value)} aria-label="Ejercicio">
            {ejercicios.map((e) => <option key={e.id_ejercicio} value={e.id_ejercicio}>{e.nombre} ({e.sesiones})</option>)}</select></div>
        <p className="sub">Peso más alto que levantaste en cada sesión.</p>
        {serie.length > 0 && <Linea titulo="Carga máxima por sesión" unidad="kg" columnas={["Sesión", "Carga máxima"]}
          datos={serie.map((s) => ({ etq: corta(s.fecha), valor: s.carga_maxima, detalle: `${corta(s.fecha)} · volumen ${miles(s.volumen)} kg` }))} />}
      </div>}
    </section>
  );
}
