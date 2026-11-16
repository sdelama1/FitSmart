// Gráficos simples en SVG (sin librerías): barras y línea de una sola serie, con detalle al pasar el cursor
// y una tabla con los mismos datos para quien no puede leer el gráfico.
import { useEffect, useRef, useState } from "react";

const ALTO = 220, M = { arriba: 16, derecha: 12, abajo: 28, izquierda: 48 };
const num = (n, d = 0) => Number(n).toLocaleString("es-PE", { maximumFractionDigits: d });

// El SVG se dibuja al ancho real de su caja para que el texto de los ejes conserve su tamaño en celular y en computadora
function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(640);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho];
}

// Escala "bonita" para el eje vertical: 4 divisiones con valores redondos
function escala(max) {
  if (!(max > 0)) return { tope: 1, marcas: [0, 1] };
  const paso0 = max / 4, base = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((k) => k * base).find((p) => p >= paso0);
  const tope = Math.ceil(max / paso) * paso;
  return { tope, marcas: Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso) };
}

function Marco({ titulo, marcas, tope, unidad, children, datos, columnas, ANCHO }) {
  const y = (v) => M.arriba + (ALTO - M.arriba - M.abajo) * (1 - v / tope);
  return (
    <figure className="grafico">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} width={ANCHO} height={ALTO} role="img" aria-label={titulo}>
        {marcas.map((v) => (
          <g key={v}>
            <line x1={M.izquierda} x2={ANCHO - M.derecha} y1={y(v)} y2={y(v)} className="rejilla" />
            <text x={M.izquierda - 8} y={y(v) + 4} className="eje" textAnchor="end">{num(v)}</text>
          </g>))}
        {children(y)}
      </svg>
      <details className="tabla-grafico"><summary>Ver datos en tabla</summary>
        <table className="series"><thead><tr>{columnas.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{datos.map((d) => <tr key={d.etq}><td>{d.detalle || d.etq}</td><td>{num(d.valor, 1)} {unidad}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

// Barra con las esquinas superiores redondeadas (4 px) y la base recta sobre el eje
function barra(x, arriba, w, base) {
  const r = Math.min(4, (base - arriba) / 2, w / 2);
  return `M${x},${base} V${arriba + r} Q${x},${arriba} ${x + r},${arriba} H${x + w - r} Q${x + w},${arriba} ${x + w},${arriba + r} V${base} Z`;
}

export function Barras({ titulo, datos, unidad = "", columnas }) {
  const [activo, setActivo] = useState(null);
  const [ref, ANCHO] = useAncho();
  const { tope, marcas } = escala(Math.max(...datos.map((d) => d.valor), 0));
  const banda = (ANCHO - M.izquierda - M.derecha) / datos.length, ancho = Math.min(36, banda * 0.6);
  const d = activo != null ? datos[activo] : null;
  return (
    <div className="grafico-caja" ref={ref}>
      <div className="lectura">{d ? <><b>{num(d.valor, 1)} {unidad}</b> · {d.detalle || d.etq}</> : <span>Pasa el cursor o toca una barra</span>}</div>
      <Marco titulo={titulo} marcas={marcas} tope={tope} unidad={unidad} datos={datos} columnas={columnas} ANCHO={ANCHO}>
        {(y) => datos.map((p, i) => {
          const x = M.izquierda + banda * i + (banda - ancho) / 2;
          return (
            <g key={p.etq} onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)} onClick={() => setActivo(i)}>
              <rect x={M.izquierda + banda * i} y={M.arriba} width={banda} height={ALTO - M.arriba - M.abajo} fill="transparent" />
              {p.valor > 0 && <path className={activo === i ? "barra activa" : "barra"} d={barra(x, y(p.valor), ancho, y(0))} />}
              {(banda >= 44 || (datos.length - 1 - i) % 2 === 0 || activo === i) &&
                <text x={x + ancho / 2} y={ALTO - 8} className={activo === i ? "eje activo" : "eje"} textAnchor="middle">{p.etq}</text>}
            </g>);
        })}
      </Marco>
    </div>
  );
}

export function Linea({ titulo, datos, unidad = "", columnas }) {
  const [activo, setActivo] = useState(null);
  const [ref, ANCHO] = useAncho();
  const valores = datos.map((d) => d.valor);
  const { tope, marcas } = escala(Math.max(...valores, 0) * 1.1);
  const paso = datos.length > 1 ? (ANCHO - M.izquierda - M.derecha - 24) / (datos.length - 1) : 0;
  const x = (i) => M.izquierda + 12 + paso * i;
  const d = activo != null ? datos[activo] : null;
  const cada = Math.ceil(datos.length / Math.max(3, Math.floor(ANCHO / 80))); // etiquetas del eje x espaciadas para que no se encimen
  return (
    <div className="grafico-caja" ref={ref}>
      <div className="lectura">{d ? <><b>{num(d.valor, 1)} {unidad}</b> · {d.detalle || d.etq}</> : <span>Pasa el cursor o toca un punto</span>}</div>
      <Marco titulo={titulo} marcas={marcas} tope={tope} unidad={unidad} datos={datos} columnas={columnas} ANCHO={ANCHO}>
        {(y) => <>
          {activo != null && <line x1={x(activo)} x2={x(activo)} y1={M.arriba} y2={ALTO - M.abajo} className="guia" />}
          <polyline className="linea" points={datos.map((p, i) => `${x(i)},${y(p.valor)}`).join(" ")} />
          {datos.map((p, i) => (
            <g key={p.etq + i} onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)} onClick={() => setActivo(i)}>
              <rect x={x(i) - Math.max(paso, 24) / 2} y={M.arriba} width={Math.max(paso, 24)} height={ALTO - M.arriba - M.abajo} fill="transparent" />
              <circle cx={x(i)} cy={y(p.valor)} r={activo === i ? 6 : 4} className="punto" />
              {(i % cada === 0 || i === datos.length - 1) && <text x={x(i)} y={ALTO - 8} className="eje" textAnchor="middle">{p.etq}</text>}
            </g>))}
        </>}
      </Marco>
    </div>
  );
}
