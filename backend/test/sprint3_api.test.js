// Integración del Sprint 3 (HU-13 a HU-16); requiere DATABASE_URL
require("dotenv").config();
const test = require("node:test");
const assert = require("node:assert");
process.env.JWT_SECRET = process.env.JWT_SECRET || "clave_de_prueba";
const omitir = !process.env.DATABASE_URL && "Sin DATABASE_URL: se omiten las pruebas de integración";
test.after(async () => { if (!omitir) await require("../src/db").pool.end(); });

test("Sprint 3", { skip: omitir }, async (t) => {
  const request = require("supertest");
  const app = require("../src/app");
  const db = require("../src/db");
  const correo = `prueba_s3_${Date.now()}@fitsmart.pe`;
  await request(app).post("/api/auth/registro").send({ nombre: "Prueba", correo, contrasena: "clave1234", consentimiento: true, anio_nacimiento: new Date().getFullYear() - 30 });
  const token = (await request(app).post("/api/auth/login").send({ correo, contrasena: "clave1234" })).body.token;
  const auth = { Authorization: `Bearer ${token}` };
  await request(app).put("/api/perfil").set(auth).send({ sexo: "masculino", peso_corporal_kg: 70, objetivo: "fuerza", dias_por_semana: 3, meses_practica: 14 });
  const banca = (await db.query("SELECT id_ejercicio FROM ejercicio WHERE nombre = 'Press de banca'")).rows[0].id_ejercicio;
  const ses = (await request(app).post("/api/sesiones/hoy").set(auth)).body.id_sesion;
  await request(app).post(`/api/sesiones/${ses}/series`).set(auth).send({ id_ejercicio: banca, peso_kg: 20, repeticiones: 10, calentamiento: true });
  await request(app).post(`/api/sesiones/${ses}/series`).set(auth).send({ id_ejercicio: banca, peso_kg: 50, repeticiones: 8, rpe: 8 });

  await t.test("HU-13: el volumen de la semana excluye el calentamiento", async () => {
    const r = await request(app).get("/api/progreso/semanal").set(auth);
    assert.strictEqual(r.body.length, 8);
    assert.strictEqual(r.body.at(-1).volumen, 400);
    const ej = await request(app).get(`/api/progreso/ejercicio/${banca}`).set(auth);
    assert.strictEqual(ej.body.at(-1).carga_maxima, 50);
  });

  await t.test("HU-14: la comparación devuelve el volumen por grupo muscular", async () => {
    const r = await request(app).get("/api/progreso/comparacion").set(auth);
    const pecho = r.body.grupos.find((g) => g.grupo_muscular === "Pecho");
    assert.strictEqual(pecho.actual, 400);
    assert.strictEqual(pecho.variacion, null);
  });

  await t.test("HU-15: el SUS se guarda una sola vez con el puntaje y el nivel", async () => {
    assert.strictEqual((await request(app).post("/api/sus").set(auth).send({ respuestas: [4, 2, 4] })).status, 400);
    const r = await request(app).post("/api/sus").set(auth).send({ respuestas: [4, 2, 4, 2, 4, 2, 4, 2, 4, 2] });
    assert.strictEqual(r.status, 201);
    assert.deepStrictEqual(r.body, { puntaje: 75, nivel: "experimentado" });
    assert.strictEqual((await request(app).post("/api/sus").set(auth).send({ respuestas: [4, 2, 4, 2, 4, 2, 4, 2, 4, 2] })).status, 409);
    assert.strictEqual((await request(app).get("/api/sus/estado").set(auth)).body.respondido, true);
  });

  await t.test("HU-16: solo el administrador gestiona el catálogo; la baja oculta el ejercicio", async () => {
    assert.strictEqual((await request(app).get("/api/admin/indicadores").set(auth)).status, 403);
    await db.query("UPDATE usuario SET rol = 'administrador' WHERE correo = $1", [correo]);
    const tokenAdmin = (await request(app).post("/api/auth/login").send({ correo, contrasena: "clave1234" })).body.token;
    const adm = { Authorization: `Bearer ${tokenAdmin}` };
    const ind = await request(app).get("/api/admin/indicadores").set(adm);
    assert.strictEqual(ind.status, 200);
    assert.ok(ind.body.sus_por_nivel.some((s) => s.nivel === "experimentado"));
    const nombre = `Ejercicio de prueba ${Date.now()}`;
    const nuevo = await request(app).post("/api/admin/ejercicios").set(adm).send({ nombre, grupo_muscular: "Core", equipo: "Peso corporal", tren: "superior",
      dificultad: 1, incremento_kg: 1, descripcion_tecnica: "Descripción de prueba con suficiente detalle." });
    assert.strictEqual(nuevo.status, 201);
    const id = nuevo.body.id_ejercicio;
    assert.ok((await request(app).get("/api/ejercicios?q=prueba").set(auth)).body.some((e) => e.id_ejercicio === id));
    assert.strictEqual((await request(app).delete(`/api/admin/ejercicios/${id}`).set(adm)).status, 204);
    assert.ok(!(await request(app).get("/api/ejercicios?q=prueba").set(auth)).body.some((e) => e.id_ejercicio === id));
    await db.query("DELETE FROM ejercicio WHERE id_ejercicio = $1", [id]);
  });
});
