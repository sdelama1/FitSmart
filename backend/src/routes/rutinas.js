// HU-12: rutina guiada
const router = require("express").Router();
const db = require("../db");
const { generarRutina } = require("../rutina");

async function rutinaActual(idUsuario) {
  const r = await db.query("SELECT * FROM rutina WHERE id_usuario = $1 ORDER BY fecha_creacion DESC, id_rutina DESC LIMIT 1", [idUsuario]);
  if (!r.rows[0]) return null;
  const items = await db.query(
    `SELECT re.*, e.nombre, e.grupo_muscular FROM rutina_ejercicio re JOIN ejercicio e ON e.id_ejercicio = re.id_ejercicio
     WHERE re.id_rutina = $1 ORDER BY re.dia, re.orden`, [r.rows[0].id_rutina]);
  const dias = [];
  for (const it of items.rows) {
    let d = dias.find((x) => x.dia === it.dia);
    if (!d) { d = { dia: it.dia, ejercicios: [] }; dias.push(d); }
    d.ejercicios.push(it);
  }
  return { ...r.rows[0], dias };
}

router.get("/actual", async (req, res, next) => {
  try { res.json(await rutinaActual(req.usuario.id)); } catch (e) { next(e); }
});

router.post("/generar", async (req, res, next) => {
  const cliente = await db.pool.connect();
  try {
    const p = (await cliente.query("SELECT * FROM perfil_entrenamiento WHERE id_usuario = $1", [req.usuario.id])).rows[0];
    if (!p) return res.status(400).json({ error: "Completa tu perfil antes de generar la rutina" });
    const ejercicios = (await cliente.query("SELECT * FROM ejercicio")).rows;
    const rut = generarRutina(p, ejercicios);
    await cliente.query("BEGIN");
    const { rows } = await cliente.query(
      "INSERT INTO rutina (id_usuario, nombre, nivel, objetivo, dias_por_semana) VALUES ($1,$2,$3,$4,$5) RETURNING id_rutina",
      [req.usuario.id, rut.nombre, rut.nivel, rut.objetivo, rut.dias_por_semana]);
    for (const d of rut.dias) for (const e of d.ejercicios) {
      await cliente.query(
        "INSERT INTO rutina_ejercicio (id_rutina, id_ejercicio, dia, orden, series_objetivo, rep_min, rep_max) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [rows[0].id_rutina, e.id_ejercicio, d.dia, e.orden, e.series_objetivo, e.rep_min, e.rep_max]);
    }
    await cliente.query("COMMIT");
    res.status(201).json(await rutinaActual(req.usuario.id));
  } catch (e) { await cliente.query("ROLLBACK").catch(() => {}); next(e); }
  finally { cliente.release(); }
});

module.exports = { router, rutinaActual };
