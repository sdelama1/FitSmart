// HU-19: recomendación personalizada de ejercicios según el progreso del usuario.
// Reglas sobre el historial: progresión al dominar un ejercicio, variante ante un estancamiento,
// equilibrio entre grupos musculares y ejercicios nuevos adecuados al nivel.
const { hayEstancamiento } = require("./progresion");

const MAX_DIFICULTAD = { principiante: 2, intermedio: 3, experimentado: 3 };
const GRUPOS_PRINCIPALES = ["Piernas", "Espalda", "Pecho", "Hombros"];
const PRIORIDAD = { progresion: 0, variante: 1, equilibrio: 2, nuevo: 3 };
const DIAS_RECIENTE = 14; // un ejercicio hecho en este lapso ya forma parte del entrenamiento del usuario
const DIAS_EQUILIBRIO = 7;

const ordenGrupo = (e) => { const i = GRUPOS_PRINCIPALES.indexOf(e.grupo_muscular); return i < 0 ? 99 : i; };
const diasEntre = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const kg = (n) => String(Number(n)).replace(".", ",");

// Domina el ejercicio si en sus 3 últimas sesiones la carga máxima nunca bajó y terminó por encima del inicio
function domina(sesiones) {
  if (sesiones.length < 3) return false;
  const p = sesiones.slice(-3).map((s) => s.peso_max);
  return p[1] >= p[0] && p[2] >= p[1] && p[2] > p[0];
}

/**
 * @param {object} perfil   { nivel }
 * @param {Array}  catalogo ejercicios con id_ejercicio, nombre, grupo_muscular, equipo, dificultad, id_progresion
 * @param {Array}  historial una fila por ejercicio y sesión: { id_ejercicio, fecha, peso_max, volumen }, en orden de fecha
 * @param {object} opciones { hoy: "AAAA-MM-DD", excluir: Set de id_ejercicio descartados hace poco, max: 3 }
 */
function recomendar(perfil, catalogo, historial, { hoy, excluir = new Set(), max = 3 } = {}) {
  const tope = MAX_DIFICULTAD[perfil.nivel] || 2;
  const porId = new Map(catalogo.map((e) => [e.id_ejercicio, e]));
  const apto = (e) => e && (e.dificultad || 1) <= tope && !excluir.has(e.id_ejercicio);

  const sesionesDe = new Map();
  for (const h of historial) {
    if (!sesionesDe.has(h.id_ejercicio)) sesionesDe.set(h.id_ejercicio, []);
    sesionesDe.get(h.id_ejercicio).push(h);
  }
  const ultimaVez = (id) => sesionesDe.get(id)?.at(-1)?.fecha;
  const reciente = (id) => { const f = ultimaVez(id); return f && diasEntre(f, hoy) <= DIAS_RECIENTE; };

  const candidatos = [];
  const proponer = (e, tipo, motivo) => { if (apto(e)) candidatos.push({ ejercicio: e, tipo, motivo }); };

  for (const [id, ses] of sesionesDe) {
    const e = porId.get(id);
    if (!e) continue;
    // 1. Progresión: domina el ejercicio y existe uno más exigente que todavía no hace
    if (domina(ses) && e.id_progresion && !reciente(e.id_progresion)) {
      const p = ses.slice(-3);
      proponer(porId.get(e.id_progresion), "progresion",
        `Subiste de ${kg(p[0].peso_max)} a ${kg(p[2].peso_max)} kg en tus 3 últimas sesiones de ${e.nombre}. Estás listo para el siguiente nivel.`);
    }
    // 2. Variante: estancamiento en el volumen; se propone otro ejercicio del mismo grupo, mejor con otro equipo
    if (hayEstancamiento(ses.map((s) => s.volumen))) {
      const v = catalogo
        .filter((x) => x.grupo_muscular === e.grupo_muscular && x.id_ejercicio !== id && !reciente(x.id_ejercicio) && apto(x))
        .sort((a, b) => (a.equipo === e.equipo) - (b.equipo === e.equipo)
          || Math.abs((a.dificultad || 1) - (e.dificultad || 1)) - Math.abs((b.dificultad || 1) - (e.dificultad || 1))
          || a.id_ejercicio - b.id_ejercicio)[0];
      if (v) proponer(v, "variante", `Llevas 3 sesiones sin superar tu volumen en ${e.nombre}. Cambiar de ejercicio da un estímulo nuevo al mismo músculo.`);
    }
  }

  // 3. Equilibrio: grupos principales sin entrenar en los últimos 7 días, si el usuario sí entrenó en ese lapso
  const activo = historial.some((h) => diasEntre(h.fecha, hoy) <= DIAS_EQUILIBRIO);
  if (activo) {
    for (const g of GRUPOS_PRINCIPALES) {
      const hechos = historial.filter((h) => porId.get(h.id_ejercicio)?.grupo_muscular === g);
      if (hechos.some((h) => diasEntre(h.fecha, hoy) <= DIAS_EQUILIBRIO)) continue;
      // Se prefiere un ejercicio que el usuario ya conoce; si no, el más sencillo del grupo
      const conocido = [...hechos].reverse().map((h) => porId.get(h.id_ejercicio)).find(apto);
      const e = conocido || catalogo.filter((x) => x.grupo_muscular === g && apto(x))
        .sort((a, b) => (a.dificultad || 1) - (b.dificultad || 1) || a.id_ejercicio - b.id_ejercicio)[0];
      proponer(e, "equilibrio", `No has entrenado ${g.toLowerCase()} en los últimos ${DIAS_EQUILIBRIO} días. Equilibrar los grupos musculares evita descompensaciones.`);
    }
  }

  // 4. Nuevo: ejercicios que nunca hizo, de la dificultad más baja disponible para completar la lista
  const nuevos = catalogo.filter((x) => !sesionesDe.has(x.id_ejercicio) && apto(x))
    .sort((a, b) => (a.dificultad || 1) - (b.dificultad || 1) || ordenGrupo(a) - ordenGrupo(b) || a.id_ejercicio - b.id_ejercicio);
  for (const e of nuevos) proponer(e, "nuevo", `Aún no lo has probado y es adecuado para tu nivel (${perfil.nivel}).`);

  // Orden por prioridad, sin repetir ejercicio ni más de una recomendación por grupo muscular
  const elegidas = [], usados = new Set(), grupos = new Set();
  for (const c of candidatos.sort((a, b) => PRIORIDAD[a.tipo] - PRIORIDAD[b.tipo])) {
    if (elegidas.length === max) break;
    if (usados.has(c.ejercicio.id_ejercicio) || grupos.has(c.ejercicio.grupo_muscular)) continue;
    usados.add(c.ejercicio.id_ejercicio); grupos.add(c.ejercicio.grupo_muscular);
    elegidas.push(c);
  }
  return elegidas;
}

// HU-20: alternativas cuando la máquina o el equipo están ocupados. Mismo grupo muscular y tren, otro equipo,
// dificultad adecuada al nivel; primero las que el usuario ya conoce y las de dificultad parecida
function alternativas(ej, catalogo, nivel, conocidos = new Set(), max = 3) {
  const tope = MAX_DIFICULTAD[nivel] || 2;
  return catalogo
    .filter((x) => x.id_ejercicio !== ej.id_ejercicio && x.grupo_muscular === ej.grupo_muscular && x.tren === ej.tren
      && x.equipo !== ej.equipo && (x.dificultad || 1) <= tope)
    .sort((a, b) => conocidos.has(b.id_ejercicio) - conocidos.has(a.id_ejercicio)
      || Math.abs((a.dificultad || 1) - (ej.dificultad || 1)) - Math.abs((b.dificultad || 1) - (ej.dificultad || 1))
      || a.id_ejercicio - b.id_ejercicio)
    .slice(0, max);
}

module.exports = { recomendar, alternativas, domina, MAX_DIFICULTAD };
