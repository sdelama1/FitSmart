// Reglas del Sprint 2 sin acceso a base de datos (se prueban de forma unitaria)
const LIMITE_SUPERIOR_KG = 2.5;
const LIMITE_INFERIOR_KG = 5;

// Rango de series y repeticiones según objetivo y nivel (HU-10 y HU-12)
function prescripcion(objetivo, nivel) {
  const p = nivel === "principiante";
  switch (objetivo) {
    case "fuerza": return p ? { series: 3, rep_min: 6, rep_max: 8 } : { series: 4, rep_min: 4, rep_max: 6 };
    case "perdida_grasa": return { series: 3, rep_min: 10, rep_max: 15 };
    case "resistencia": return { series: p ? 2 : 3, rep_min: 15, rep_max: 20 };
    default: return { series: p ? 3 : 4, rep_min: 8, rep_max: 12 }; // hipertrofia
  }
}

// Agrupa las series por sesión: serie de mayor carga, volumen y RPE medio
function resumirSesiones(filas) {
  const porSesion = new Map();
  for (const f of filas) {
    if (!porSesion.has(f.id_sesion)) porSesion.set(f.id_sesion, { fecha: f.fecha, series: [] });
    porSesion.get(f.id_sesion).series.push(f);
  }
  const out = [];
  let fechaAnt = null;
  for (const { fecha, series } of porSesion.values()) {
    const top = series.reduce((a, b) => (b.peso_kg > a.peso_kg ? b : a));
    const rpes = series.map((s) => s.rpe).filter((r) => r != null);
    const f = new Date(fecha + "T00:00:00Z");
    out.push({
      fecha, peso_kg: top.peso_kg, repeticiones: top.repeticiones, series: series.length,
      volumen: series.reduce((t, s) => t + s.peso_kg * s.repeticiones, 0),
      rpe: rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null,
      dias_desde_ant: fechaAnt ? Math.round((f - fechaAnt) / 86400000) : null,
    });
    fechaAnt = f;
  }
  return out;
}

// HU-22: subida máxima por sesión. Es la menor entre el límite del tren, el incremento propio del ejercicio
// y el 10 % de la carga actual (redondeado hacia abajo a 0,5 kg, con un mínimo de 0,5 kg)
const MAX_SUBIDA_PORCENTAJE = 0.10;
function topeSubida(actual, inferior, incremento) {
  const tren = inferior ? LIMITE_INFERIOR_KG : LIMITE_SUPERIOR_KG;
  const porcentaje = Math.floor(actual * MAX_SUBIDA_PORCENTAJE * 2) / 2;
  return Math.max(0.5, Math.min(tren, incremento ?? tren, porcentaje));
}

// Respaldo del modelo: doble progresión con los mismos límites de seguridad
function reglaDobleProgresion(ultima, repMax, inferior, incremento) {
  const tope = topeSubida(ultima.peso_kg, inferior, incremento);
  const sube = ultima.repeticiones >= repMax;
  return { peso_sugerido_kg: ultima.peso_kg + (sube ? tope : 0), delta_kg: sube ? tope : 0 };
}

// Límites de seguridad aplicados también a la respuesta del modelo. La subida se redondea al tope permitido
// y la bajada a múltiplos del incremento del ejercicio (como máximo un 10 %), para sugerir cargas que existen en la sala
function aplicarLimites(actual, sugerido, inferior, incremento) {
  const tope = topeSubida(actual, inferior, incremento);
  const paso = incremento ?? (inferior ? LIMITE_INFERIOR_KG : LIMITE_SUPERIOR_KG);
  const d = sugerido - actual;
  let delta = 0;
  if (d > 0) delta = Math.min(tope, Math.round(d / tope) * tope);
  else if (d < 0) delta = -Math.min(Math.floor((actual * 0.1) / paso) * paso, Math.floor(-d / paso) * paso);
  return Math.round((actual + delta) * 2) / 2;
}

// HU-11: estancamiento si ninguna de las 3 últimas sesiones supera el volumen de la sesión previa a ellas
function hayEstancamiento(volumenes) {
  if (volumenes.length < 4) return false;
  const ref = volumenes[volumenes.length - 4];
  return volumenes.slice(-3).every((v) => v <= ref);
}

module.exports = { topeSubida, prescripcion, resumirSesiones, reglaDobleProgresion, aplicarLimites, hayEstancamiento, LIMITE_SUPERIOR_KG, LIMITE_INFERIOR_KG };
