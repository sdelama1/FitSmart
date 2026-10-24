// Pruebas de integración: requieren DATABASE_URL de una base de prueba con las tablas creadas
require("dotenv").config();
const test = require("node:test");
const assert = require("node:assert");
process.env.JWT_SECRET = process.env.JWT_SECRET || "clave_de_prueba";
const omitir = !process.env.DATABASE_URL && "Sin DATABASE_URL: se omiten las pruebas de integración";
test.after(async () => { if (!omitir) await require("../src/db").pool.end(); });

test("Flujo del Sprint 1 (HU-01 a HU-08)", { skip: omitir }, async (t) => {
  const request = require("supertest");
  const app = require("../src/app");
  const db = require("../src/db");
  const correo = `prueba_${Date.now()}@fitsmart.pe`;
  let token, idSesion, idEj;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  await t.test("HU-01 registro sin consentimiento es rechazado", async () => {
    const r = await request(app).post("/api/auth/registro").send({ nombre: "Prueba", correo, contrasena: "clave1234" });
    assert.strictEqual(r.status, 400);
  });
  await t.test("HU-01 registro e inicio de sesión", async () => {
    const r = await request(app).post("/api/auth/registro").send({ nombre: "Prueba", correo, contrasena: "clave1234", consentimiento: true });
    assert.strictEqual(r.status, 201);
    const hash = await db.query("SELECT contrasena_hash FROM usuario WHERE correo = $1", [correo]);
    assert.match(hash.rows[0].contrasena_hash, /^\$2[aby]\$/);
    const mal = await request(app).post("/api/auth/login").send({ correo, contrasena: "otra" });
    assert.strictEqual(mal.status, 401);
    const ok = await request(app).post("/api/auth/login").send({ correo, contrasena: "clave1234" });
    assert.strictEqual(ok.status, 200);
    token = ok.body.token;
  });
  await t.test("HU-02 y HU-03 perfil con nivel calculado", async () => {
    const r = await request(app).put("/api/perfil").set(auth()).send({ edad: 24, sexo: "masculino", peso_corporal_kg: 72, objetivo: "hipertrofia", dias_por_semana: 4, meses_practica: 8 });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.nivel, "intermedio");
  });
  await t.test("HU-04 catálogo filtrado por grupo y equipo", async () => {
    const r = await request(app).get("/api/ejercicios?grupo=Pecho&equipo=Barra").set(auth());
    assert.ok(r.body.length >= 1);
    assert.ok(r.body.every((e) => e.grupo_muscular === "Pecho" && e.equipo === "Barra" && e.descripcion_tecnica));
    idEj = r.body[0].id_ejercicio;
  });
  await t.test("HU-05 registro de series con RPE", async () => {
    idSesion = (await request(app).post("/api/sesiones/hoy").set(auth())).body.id_sesion;
    const malo = await request(app).post(`/api/sesiones/${idSesion}/series`).set(auth()).send({ id_ejercicio: idEj, peso_kg: 40, repeticiones: 10, rpe: 11 });
    assert.strictEqual(malo.status, 400);
    const s1 = await request(app).post(`/api/sesiones/${idSesion}/series`).set(auth()).send({ id_ejercicio: idEj, peso_kg: 40, repeticiones: 10, rpe: 7, descanso_seg: 90 });
    const s2 = await request(app).post(`/api/sesiones/${idSesion}/series`).set(auth()).send({ id_ejercicio: idEj, peso_kg: 40, repeticiones: 9, rpe: 8 });
    assert.strictEqual(s1.body.numero_serie, 1);
    assert.strictEqual(s2.body.numero_serie, 2);
  });
  await t.test("HU-06 precarga de la sesión anterior", async () => {
    await db.query("UPDATE sesion SET fecha = CURRENT_DATE - 3 WHERE id_sesion = $1", [idSesion]);
    const nueva = (await request(app).post("/api/sesiones/hoy").set(auth())).body.id_sesion;
    assert.notStrictEqual(nueva, idSesion);
    const r = await request(app).get(`/api/ejercicios/${idEj}/ultima-sesion?excluir_sesion=${nueva}`).set(auth());
    assert.strictEqual(r.body.series.length, 2);
    assert.deepStrictEqual([r.body.series[0].peso_kg, r.body.series[0].repeticiones], [40, 10]);
  });
  await t.test("HU-08 historial por ejercicio", async () => {
    const r = await request(app).get(`/api/sesiones?ejercicio=${idEj}`).set(auth());
    assert.strictEqual(r.body.length, 1);
    assert.strictEqual(r.body[0].ejercicios[0].series.length, 2);
  });
  await t.test("Acceso sin token es rechazado", async () => {
    const r = await request(app).get("/api/perfil");
    assert.strictEqual(r.status, 401);
  });

  await db.query("DELETE FROM usuario WHERE correo = $1", [correo]);
});

test("Flujo del Sprint 2 (HU-10 a HU-12)", { skip: omitir }, async (t) => {
  const request = require("supertest");
  const app = require("../src/app");
  const db = require("../src/db");
  const correo = `prueba2_${Date.now()}@fitsmart.pe`;
  const reg = await request(app).post("/api/auth/registro").send({ nombre: "Prueba", correo, contrasena: "clave1234", consentimiento: true });
  const auth = { Authorization: `Bearer ${reg.body.token}` };
  const idU = reg.body.usuario.id_usuario;
  await request(app).put("/api/perfil").set(auth).send({ edad: 30, sexo: "femenino", peso_corporal_kg: 60, objetivo: "hipertrofia", dias_por_semana: 3, meses_practica: 2 });
  const idEj = (await db.query("SELECT id_ejercicio FROM ejercicio WHERE nombre = 'Press de banca'")).rows[0].id_ejercicio;
  // 5 sesiones anteriores de 3 series a 40 kg; repeticiones de la 3.ª serie: volumen 1200, 1200, 1160, 1200, 1120 (estancado)
  const ultimaSerie = [10, 10, 9, 10, 8];
  for (let i = 0; i < 5; i++) {
    const s = await db.query("INSERT INTO sesion (id_usuario, fecha) VALUES ($1, CURRENT_DATE - $2::int) RETURNING id_sesion", [idU, 15 - i * 3]);
    for (let k = 1; k <= 3; k++) {
      const reps = k === 3 ? ultimaSerie[i] : 10;
      await db.query("INSERT INTO serie (id_sesion, id_ejercicio, numero_serie, repeticiones, peso_kg) VALUES ($1,$2,$3,$4,40)", [s.rows[0].id_sesion, idEj, k, reps]);
    }
  }
  await t.test("HU-12 genera y guarda la rutina", async () => {
    const r = await request(app).post("/api/rutinas/generar").set(auth);
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.dias.length, 3);
    const a = await request(app).get("/api/rutinas/actual").set(auth);
    assert.strictEqual(a.body.id_rutina, r.body.id_rutina);
  });
  await t.test("HU-10 sugerencia dentro de límites y en menos de 2 s", async () => {
    const t0 = Date.now();
    const r = await request(app).get(`/api/sugerencias/${idEj}`).set(auth);
    assert.ok(Date.now() - t0 < 2000);
    assert.ok(r.body.peso_sugerido_kg <= 42.5 && r.body.peso_sugerido_kg >= 36);
    assert.ok(["modelo", "regla"].includes(r.body.fuente));
    if (process.env.ESPERAR_MODELO) assert.strictEqual(r.body.fuente, "modelo");
    const p = await request(app).patch(`/api/sugerencias/${r.body.id_recomendacion}`).set(auth).send({ aceptada: true });
    assert.strictEqual(p.body.aceptada, true);
  });
  await t.test("HU-11 alerta de estancamiento con variante, sin duplicados", async () => {
    const r = await request(app).get("/api/alertas").set(auth);
    assert.strictEqual(r.body.length, 1);
    assert.match(r.body[0].mensaje, /Variante propuesta/);
    const r2 = await request(app).get("/api/alertas").set(auth);
    assert.strictEqual(r2.body.length, 1);
    await request(app).patch(`/api/alertas/${r.body[0].id_alerta}/leida`).set(auth);
    assert.strictEqual((await request(app).get("/api/alertas").set(auth)).body.length, 0);
  });
  await db.query("DELETE FROM usuario WHERE correo = $1", [correo]);
});
