const test = require("node:test");
const assert = require("node:assert");
const { volumenSemanal, compararSemanas, puntajeSUS } = require("../src/progreso");

const serie = (fecha, peso_kg, repeticiones, grupo_muscular = "Pecho", id_sesion = fecha) => ({ fecha, peso_kg, repeticiones, grupo_muscular, id_sesion });

test("HU-13: volumen semanal de lunes a domingo, con semanas vacías en cero", () => {
  const v = volumenSemanal([serie("2026-11-16", 40, 10), serie("2026-11-18", 50, 10), serie("2026-11-10", 40, 8)], "2026-11-18", 3);
  assert.deepStrictEqual(v.map((s) => s.semana), ["2026-11-02", "2026-11-09", "2026-11-16"]);
  assert.deepStrictEqual(v.map((s) => s.volumen), [0, 320, 900]);
  assert.deepStrictEqual(v.map((s) => s.sesiones), [0, 1, 2]);
});

test("HU-14: variación por grupo muscular entre los últimos 7 días y los 7 anteriores", () => {
  const c = compararSemanas([
    serie("2026-11-17", 50, 10, "Pecho"), serie("2026-11-09", 40, 10, "Pecho"),
    serie("2026-11-16", 100, 5, "Piernas"),
    serie("2026-11-04", 30, 10, "Espalda"),
  ], "2026-11-18");
  const pecho = c.find((g) => g.grupo_muscular === "Pecho");
  assert.deepStrictEqual([pecho.actual, pecho.anterior, pecho.variacion], [500, 400, 25]);
  assert.strictEqual(c.find((g) => g.grupo_muscular === "Piernas").variacion, null); // sin semana anterior no hay porcentaje
  assert.ok(!c.some((g) => g.grupo_muscular === "Espalda")); // fuera de los 14 días
});

test("HU-15: puntaje SUS de 0 a 100 con la fórmula de Brooke", () => {
  assert.strictEqual(puntajeSUS([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
  assert.strictEqual(puntajeSUS([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
  assert.strictEqual(puntajeSUS([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
  assert.strictEqual(puntajeSUS([4, 2, 4, 2, 4, 2, 4, 2, 4, 2]), 75);
  assert.strictEqual(puntajeSUS([4, 2, 4]), null);
  assert.strictEqual(puntajeSUS([6, 2, 4, 2, 4, 2, 4, 2, 4, 2]), null);
});
