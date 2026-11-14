const test = require("node:test");
const assert = require("node:assert");
const { recomendar, domina } = require("../src/recomendador");

const CAT = [
  { id_ejercicio: 1, nombre: "Jalón al pecho", grupo_muscular: "Espalda", equipo: "Polea", dificultad: 1, id_progresion: 2 },
  { id_ejercicio: 2, nombre: "Dominadas", grupo_muscular: "Espalda", equipo: "Peso corporal", dificultad: 3, id_progresion: null },
  { id_ejercicio: 3, nombre: "Sentadilla con barra", grupo_muscular: "Piernas", equipo: "Barra", dificultad: 2, id_progresion: null },
  { id_ejercicio: 4, nombre: "Prensa de piernas", grupo_muscular: "Piernas", equipo: "Máquina", dificultad: 1, id_progresion: 3 },
  { id_ejercicio: 5, nombre: "Press de banca", grupo_muscular: "Pecho", equipo: "Barra", dificultad: 2, id_progresion: null },
  { id_ejercicio: 6, nombre: "Flexiones de pecho", grupo_muscular: "Pecho", equipo: "Peso corporal", dificultad: 1, id_progresion: 5 },
  { id_ejercicio: 7, nombre: "Elevaciones laterales", grupo_muscular: "Hombros", equipo: "Mancuernas", dificultad: 1, id_progresion: null },
];
const ses = (id, filas) => filas.map(([fecha, peso_max, volumen]) => ({ id_ejercicio: id, fecha, peso_max, volumen }));
const HOY = "2026-11-14";

test("HU-19: domina un ejercicio cuando la carga sube sin bajar en 3 sesiones", () => {
  assert.strictEqual(domina([{ peso_max: 35 }, { peso_max: 37.5 }, { peso_max: 40 }]), true);
  assert.strictEqual(domina([{ peso_max: 40 }, { peso_max: 37.5 }, { peso_max: 42.5 }]), false);
  assert.strictEqual(domina([{ peso_max: 40 }, { peso_max: 40 }, { peso_max: 40 }]), false);
  assert.strictEqual(domina([{ peso_max: 35 }, { peso_max: 40 }]), false);
});

test("HU-19: al dominar el jalón se recomienda pasar a dominadas", () => {
  const h = ses(1, [["2026-11-03", 35, 1050], ["2026-11-07", 37.5, 1125], ["2026-11-11", 40, 1200]]);
  const r = recomendar({ nivel: "intermedio" }, CAT, h, { hoy: HOY });
  assert.strictEqual(r[0].tipo, "progresion");
  assert.strictEqual(r[0].ejercicio.nombre, "Dominadas");
  assert.match(r[0].motivo, /de 35 a 40 kg/);
});

test("HU-19: el principiante no recibe ejercicios avanzados", () => {
  const h = ses(1, [["2026-11-03", 35, 1050], ["2026-11-07", 37.5, 1125], ["2026-11-11", 40, 1200]]);
  const r = recomendar({ nivel: "principiante" }, CAT, h, { hoy: HOY });
  assert.ok(r.every((x) => x.ejercicio.dificultad <= 2));
  assert.ok(!r.some((x) => x.tipo === "progresion"));
});

test("HU-19: ante un estancamiento se propone una variante del mismo grupo con otro equipo", () => {
  const h = ses(3, [["2026-10-30", 80, 2400], ["2026-11-03", 75, 1800], ["2026-11-07", 75, 1800], ["2026-11-11", 75, 1800]]);
  const r = recomendar({ nivel: "intermedio" }, CAT, h, { hoy: HOY });
  const v = r.find((x) => x.tipo === "variante");
  assert.strictEqual(v.ejercicio.nombre, "Prensa de piernas");
});

test("HU-19: recomienda equilibrar los grupos que no se entrenaron en la semana", () => {
  const h = ses(5, [["2026-11-12", 40, 1200]]);
  const r = recomendar({ nivel: "intermedio" }, CAT, h, { hoy: HOY });
  const grupos = r.filter((x) => x.tipo === "equilibrio").map((x) => x.ejercicio.grupo_muscular);
  assert.deepStrictEqual(grupos, ["Piernas", "Espalda", "Hombros"]);
});

test("HU-19: sin historial recomienda ejercicios básicos nuevos, sin repetir grupo y como máximo 3", () => {
  const r = recomendar({ nivel: "principiante" }, CAT, [], { hoy: HOY });
  assert.strictEqual(r.length, 3);
  assert.ok(r.every((x) => x.tipo === "nuevo" && x.ejercicio.dificultad === 1));
  assert.strictEqual(new Set(r.map((x) => x.ejercicio.grupo_muscular)).size, 3);
});

test("HU-19: no repite un ejercicio descartado", () => {
  const r = recomendar({ nivel: "principiante" }, CAT, [], { hoy: HOY, excluir: new Set([4]) });
  assert.ok(!r.some((x) => x.ejercicio.id_ejercicio === 4));
});

test("HU-20: con la prensa ocupada propone ejercicios de pierna con otro equipo, primero los conocidos", () => {
  const cat = [
    { id_ejercicio: 1, nombre: "Prensa de piernas", grupo_muscular: "Piernas", tren: "inferior", equipo: "Máquina", dificultad: 1 },
    { id_ejercicio: 2, nombre: "Extensión de cuádriceps", grupo_muscular: "Piernas", tren: "inferior", equipo: "Máquina", dificultad: 1 },
    { id_ejercicio: 3, nombre: "Sentadilla goblet", grupo_muscular: "Piernas", tren: "inferior", equipo: "Mancuernas", dificultad: 1 },
    { id_ejercicio: 4, nombre: "Sentadilla con barra", grupo_muscular: "Piernas", tren: "inferior", equipo: "Barra", dificultad: 2 },
    { id_ejercicio: 5, nombre: "Peso muerto convencional", grupo_muscular: "Piernas", tren: "inferior", equipo: "Barra", dificultad: 3 },
  ];
  const { alternativas } = require("../src/recomendador");
  assert.deepStrictEqual(alternativas(cat[0], cat, "principiante").map((e) => e.id_ejercicio), [3, 4]);
  assert.deepStrictEqual(alternativas(cat[0], cat, "intermedio", new Set([4])).map((e) => e.id_ejercicio), [4, 3, 5]);
});
