// HU-12: generación de la rutina guiada según nivel, objetivo y días disponibles
const { prescripcion } = require("./progresion");

const PLANTILLAS = {
  cuerpo_completo: ["Piernas", "Pecho", "Espalda", "Hombros", "Piernas", "Brazos", "Core"],
  superior: ["Pecho", "Espalda", "Hombros", "Pecho", "Espalda", "Brazos", "Brazos"],
  inferior: ["Piernas", "Piernas", "Piernas", "Piernas", "Core", "Core"],
  empuje: ["Pecho", "Pecho", "Hombros", "Pecho", "Hombros", "Brazos:tríceps"],
  tiron: ["Espalda", "Espalda", "Espalda", "Brazos:bíceps", "Core"],
  pierna: ["Piernas", "Piernas", "Piernas", "Piernas", "Core"],
};
const NOMBRES = { cuerpo_completo: "Cuerpo completo", superior: "Tren superior", inferior: "Tren inferior", empuje: "Empuje", tiron: "Tirón", pierna: "Pierna" };

function division(dias, nivel) {
  if (dias <= 2 || (dias === 3 && nivel === "principiante")) return Array(dias).fill("cuerpo_completo");
  if (dias === 3) return ["empuje", "tiron", "pierna"];
  if (dias === 4) return ["superior", "inferior", "superior", "inferior"];
  return Array.from({ length: dias }, (_, i) => ["empuje", "tiron", "pierna"][i % 3]);
}

function generarRutina(perfil, ejercicios) {
  const { nivel, objetivo, dias_por_semana: dias } = perfil;
  const n = nivel === "principiante" ? 4 : nivel === "intermedio" ? 5 : 6;
  const pres = prescripcion(objetivo, nivel);
  // El principiante empieza por máquinas y poleas, que guían el movimiento
  const orden = (e) => (nivel === "principiante" && ["Máquina", "Polea"].includes(e.equipo) ? 0 : 1);
  const usados = new Map();
  const tomar = (clave, delDia) => {
    const [grupo, filtro] = clave.split(":");
    let pool = ejercicios.filter((e) => e.grupo_muscular === grupo && !delDia.has(e.id_ejercicio));
    if (filtro === "tríceps") pool = pool.filter((e) => /tríceps/i.test(e.nombre));
    if (filtro === "bíceps") pool = pool.filter((e) => /bíceps/i.test(e.nombre));
    if (!pool.length) return null;
    pool.sort((a, b) => (usados.get(a.id_ejercicio) || 0) - (usados.get(b.id_ejercicio) || 0) || orden(a) - orden(b) || a.id_ejercicio - b.id_ejercicio);
    const e = pool[0];
    usados.set(e.id_ejercicio, (usados.get(e.id_ejercicio) || 0) + 1);
    return e;
  };
  const tipos = division(dias, nivel);
  return {
    nombre: tipos.every((t) => t === tipos[0]) ? `${NOMBRES[tipos[0]]} ${dias} días` : `${[...new Set(tipos)].map((t) => NOMBRES[t]).join(" / ")}`,
    nivel, objetivo, dias_por_semana: dias,
    dias: tipos.map((tipo, i) => {
      const delDia = new Set(), items = [];
      for (const clave of PLANTILLAS[tipo]) {
        if (items.length === n) break;
        const e = tomar(clave, delDia);
        if (!e) continue;
        delDia.add(e.id_ejercicio);
        items.push({ id_ejercicio: e.id_ejercicio, nombre: e.nombre, grupo_muscular: e.grupo_muscular, orden: items.length + 1,
          series_objetivo: pres.series, rep_min: pres.rep_min, rep_max: pres.rep_max });
      }
      return { dia: i + 1, tipo: NOMBRES[tipo], ejercicios: items };
    }),
  };
}

module.exports = { generarRutina, division };
