// HU-13 y HU-14: cálculos de progreso a partir de las series efectivas (sin calentamiento)
const SUS_IMPARES = [0, 2, 4, 6, 8];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const lunesDe = (f) => { const d = new Date(f + "T00:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
const sumarDias = (f, n) => { const d = new Date(f + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); };

// Volumen semanal (lunes a domingo) de las últimas N semanas, incluidas las semanas sin entrenamiento
function volumenSemanal(series, hoy, semanas = 8) {
  const actual = lunesDe(hoy);
  const salida = [];
  for (let i = semanas - 1; i >= 0; i--) salida.push({ semana: sumarDias(actual, -7 * i), volumen: 0, series: 0, sesiones: new Set() });
  const porSemana = new Map(salida.map((s) => [s.semana, s]));
  for (const s of series) {
    const sem = porSemana.get(lunesDe(s.fecha));
    if (!sem) continue;
    sem.volumen += s.peso_kg * s.repeticiones; sem.series += 1; sem.sesiones.add(s.id_sesion);
  }
  return salida.map((s) => ({ semana: s.semana, volumen: Math.round(s.volumen * 10) / 10, series: s.series, sesiones: s.sesiones.size }));
}

// Comparación por grupo muscular: últimos 7 días frente a los 7 días anteriores
function compararSemanas(series, hoy) {
  const desde = sumarDias(hoy, -6), desdeAnt = sumarDias(hoy, -13);
  const grupos = new Map();
  for (const s of series) {
    const periodo = s.fecha >= desde && s.fecha <= hoy ? "actual" : s.fecha >= desdeAnt && s.fecha < desde ? "anterior" : null;
    if (!periodo) continue;
    if (!grupos.has(s.grupo_muscular)) grupos.set(s.grupo_muscular, { grupo_muscular: s.grupo_muscular, actual: 0, anterior: 0 });
    grupos.get(s.grupo_muscular)[periodo] += s.peso_kg * s.repeticiones;
  }
  return [...grupos.values()].map((g) => ({
    ...g, actual: Math.round(g.actual * 10) / 10, anterior: Math.round(g.anterior * 10) / 10,
    variacion: g.anterior > 0 ? Math.round(((g.actual - g.anterior) / g.anterior) * 1000) / 10 : null,
  })).sort((a, b) => b.actual + b.anterior - (a.actual + a.anterior));
}

// HU-15: puntaje SUS de 0 a 100. Ítems impares: respuesta - 1; pares: 5 - respuesta; la suma se multiplica por 2,5
function puntajeSUS(r) {
  if (!Array.isArray(r) || r.length !== 10 || !r.every((x) => Number.isInteger(x) && x >= 1 && x <= 5)) return null;
  return r.reduce((t, x, i) => t + (SUS_IMPARES.includes(i) ? x - 1 : 5 - x), 0) * 2.5;
}

module.exports = { volumenSemanal, compararSemanas, puntajeSUS, lunesDe, sumarDias };
