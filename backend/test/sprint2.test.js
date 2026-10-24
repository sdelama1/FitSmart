const test = require("node:test");
const assert = require("node:assert");
const { reglaDobleProgresion, aplicarLimites, hayEstancamiento, resumirSesiones, prescripcion } = require("../src/progresion");
const { generarRutina, division } = require("../src/rutina");

test("HU-10: la regla sube 2,5 kg en tren superior al llegar al tope de repeticiones", () => {
  assert.strictEqual(reglaDobleProgresion({ peso_kg: 40, repeticiones: 12 }, 12, false).peso_sugerido_kg, 42.5);
  assert.strictEqual(reglaDobleProgresion({ peso_kg: 40, repeticiones: 9 }, 12, false).peso_sugerido_kg, 40);
});
test("HU-10: la regla sube 5 kg en tren inferior", () => {
  assert.strictEqual(reglaDobleProgresion({ peso_kg: 80, repeticiones: 12 }, 12, true).peso_sugerido_kg, 85);
});
test("HU-10: los límites recortan la sugerencia del modelo", () => {
  assert.strictEqual(aplicarLimites(40, 50, false), 42.5);
  assert.strictEqual(aplicarLimites(80, 95, true), 85);
  assert.strictEqual(aplicarLimites(40, 41.3, false), 41.5);
  assert.strictEqual(aplicarLimites(40, 20, false), 36);
});
test("HU-11: tres sesiones sin superar el volumen previo generan estancamiento", () => {
  assert.strictEqual(hayEstancamiento([1000, 1200, 1150, 1200, 1100]), true);
  assert.strictEqual(hayEstancamiento([1000, 1200, 1150, 1250, 1100]), false);
  assert.strictEqual(hayEstancamiento([1200, 1200, 1200]), false);
});
test("Resumen por sesión toma la serie de mayor carga y el volumen total", () => {
  const r = resumirSesiones([
    { id_sesion: 1, fecha: "2026-10-20", peso_kg: 40, repeticiones: 10, rpe: 7 },
    { id_sesion: 1, fecha: "2026-10-20", peso_kg: 42.5, repeticiones: 8, rpe: 8 },
    { id_sesion: 2, fecha: "2026-10-23", peso_kg: 42.5, repeticiones: 9, rpe: null },
  ]);
  assert.deepStrictEqual([r[0].peso_kg, r[0].repeticiones, r[0].series, r[0].volumen, r[0].rpe], [42.5, 8, 2, 740, 7.5]);
  assert.strictEqual(r[1].dias_desde_ant, 3);
});
const CAT = [
  ["Press de banca", "Pecho", "Barra"], ["Aperturas en máquina", "Pecho", "Máquina"], ["Press inclinado", "Pecho", "Mancuernas"],
  ["Jalón al pecho", "Espalda", "Polea"], ["Remo con barra", "Espalda", "Barra"], ["Remo sentado", "Espalda", "Polea"],
  ["Sentadilla", "Piernas", "Barra"], ["Prensa", "Piernas", "Máquina"], ["Peso muerto rumano", "Piernas", "Barra"], ["Extensión", "Piernas", "Máquina"],
  ["Press militar", "Hombros", "Mancuernas"], ["Elevaciones", "Hombros", "Mancuernas"],
  ["Curl de bíceps", "Brazos", "Barra"], ["Extensión de tríceps", "Brazos", "Polea"], ["Plancha", "Core", "Peso corporal"],
].map(([nombre, grupo_muscular, equipo], i) => ({ id_ejercicio: i + 1, nombre, grupo_muscular, equipo }));
test("HU-12: la división depende de los días y del nivel", () => {
  assert.deepStrictEqual(division(3, "principiante"), ["cuerpo_completo", "cuerpo_completo", "cuerpo_completo"]);
  assert.deepStrictEqual(division(3, "experimentado"), ["empuje", "tiron", "pierna"]);
  assert.deepStrictEqual(division(4, "intermedio"), ["superior", "inferior", "superior", "inferior"]);
});
test("HU-12: rutina de principiante con 4 ejercicios por día, sin repetir en el día, y rango de hipertrofia", () => {
  const r = generarRutina({ nivel: "principiante", objetivo: "hipertrofia", dias_por_semana: 3 }, CAT);
  assert.strictEqual(r.dias.length, 3);
  for (const d of r.dias) {
    assert.strictEqual(d.ejercicios.length, 4);
    assert.strictEqual(new Set(d.ejercicios.map((e) => e.id_ejercicio)).size, 4);
    assert.ok(d.ejercicios.every((e) => e.series_objetivo === 3 && e.rep_min === 8 && e.rep_max === 12));
  }
  assert.strictEqual(r.dias[0].ejercicios[0].nombre, "Prensa"); // prioriza máquinas
});
test("HU-12: fuerza para experimentado usa 4 series de 4 a 6", () => {
  assert.deepStrictEqual(prescripcion("fuerza", "experimentado"), { series: 4, rep_min: 4, rep_max: 6 });
  const r = generarRutina({ nivel: "experimentado", objetivo: "fuerza", dias_por_semana: 5 }, CAT);
  assert.strictEqual(r.dias.length, 5);
  assert.ok(r.dias[1].ejercicios.some((e) => /bíceps/.test(e.nombre)));
});
