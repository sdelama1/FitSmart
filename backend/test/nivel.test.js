const test = require("node:test");
const assert = require("node:assert");
const { clasificarNivel } = require("../src/nivel");

test("HU-03: menos de 6 meses es principiante", () => {
  assert.strictEqual(clasificarNivel(0), "principiante");
  assert.strictEqual(clasificarNivel(5), "principiante");
});
test("HU-03: de 6 a 11 meses es intermedio", () => {
  assert.strictEqual(clasificarNivel(6), "intermedio");
  assert.strictEqual(clasificarNivel(11), "intermedio");
});
test("HU-03: 12 meses o más es experimentado", () => {
  assert.strictEqual(clasificarNivel(12), "experimentado");
  assert.strictEqual(clasificarNivel(60), "experimentado");
});
test("HU-03: rechaza valores negativos", () => {
  assert.throws(() => clasificarNivel(-1));
});
