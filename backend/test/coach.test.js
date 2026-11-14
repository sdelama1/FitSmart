// Pruebas de integración de los ajustes del entrenador (HU-20 y HU-23); requieren DATABASE_URL
require("dotenv").config();
const test = require("node:test");
const assert = require("node:assert");
process.env.JWT_SECRET = process.env.JWT_SECRET || "clave_de_prueba";
const omitir = !process.env.DATABASE_URL && "Sin DATABASE_URL: se omiten las pruebas de integración";
test.after(async () => { if (!omitir) await require("../src/db").pool.end(); });

test("Calentamiento y alternativas", { skip: omitir }, async (t) => {
  const request = require("supertest");
  const app = require("../src/app");
  const db = require("../src/db");
  const correo = `coach_${Date.now()}@fitsmart.pe`;
  await request(app).post("/api/auth/registro").send({ nombre: "Coach", correo, contrasena: "clave1234", consentimiento: true });
  const token = (await request(app).post("/api/auth/login").send({ correo, contrasena: "clave1234" })).body.token;
  const auth = { Authorization: `Bearer ${token}` };
  await request(app).put("/api/perfil").set(auth).send({ edad: 25, sexo: "femenino", peso_corporal_kg: 60, objetivo: "fuerza", dias_por_semana: 3, meses_practica: 2 });
  const banca = (await db.query("SELECT id_ejercicio FROM ejercicio WHERE nombre = 'Press de banca'")).rows[0].id_ejercicio;

  await t.test("HU-23: la serie de calentamiento se guarda sin RPE y no entra en la precarga", async () => {
    const id = (await db.query("INSERT INTO sesion (id_usuario, fecha) SELECT id_usuario, CURRENT_DATE - 3 FROM usuario WHERE correo = $1 RETURNING id_sesion", [correo])).rows[0].id_sesion;
    const c = await request(app).post(`/api/sesiones/${id}/series`).set(auth).send({ id_ejercicio: banca, peso_kg: 20, repeticiones: 12, rpe: 4, calentamiento: true });
    assert.strictEqual(c.status, 201);
    assert.strictEqual(c.body.calentamiento, true);
    assert.strictEqual(c.body.rpe, null);
    await request(app).post(`/api/sesiones/${id}/series`).set(auth).send({ id_ejercicio: banca, peso_kg: 40, repeticiones: 8, rpe: 8 });
    const ant = (await request(app).get(`/api/ejercicios/${banca}/ultima-sesion`).set(auth)).body;
    assert.deepStrictEqual(ant.series.map((s) => s.peso_kg), [40]);
    const sug = (await request(app).get(`/api/sugerencias/${banca}`).set(auth)).body;
    assert.strictEqual(sug.anterior.peso_kg, 40);
  });

  await t.test("HU-20: alternativas al press de banca con otro equipo y aptas para principiante", async () => {
    const r = await request(app).get(`/api/ejercicios/${banca}/alternativas`).set(auth);
    assert.ok(r.body.length >= 1 && r.body.length <= 3);
    assert.ok(r.body.every((e) => e.grupo_muscular === "Pecho" && e.equipo !== "Barra" && e.dificultad <= 2));
  });
});
