// HU-05, HU-07 y HU-08: sesiones, registro de series e historial
const router = require("express").Router();
const db = require("../db");

// Abre la sesión del día o devuelve la que ya existe
router.post("/hoy", async (req, res, next) => {
  try {
    const ex = await db.query("SELECT * FROM sesion WHERE id_usuario = $1 AND fecha = CURRENT_DATE ORDER BY id_sesion LIMIT 1", [req.usuario.id]);
    if (ex.rows[0]) return res.json(ex.rows[0]);
    const { rows } = await db.query("INSERT INTO sesion (id_usuario) VALUES ($1) RETURNING *", [req.usuario.id]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

async function sesionDelUsuario(idSesion, idUsuario) {
  const { rows } = await db.query("SELECT * FROM sesion WHERE id_sesion = $1 AND id_usuario = $2", [idSesion, idUsuario]);
  return rows[0];
}

router.get("/:id/series", async (req, res, next) => {
  try {
    if (!(await sesionDelUsuario(req.params.id, req.usuario.id))) return res.status(404).json({ error: "Sesión no encontrada" });
    const { rows } = await db.query(
      `SELECT se.id_serie, se.id_ejercicio, e.nombre AS ejercicio, se.numero_serie, se.peso_kg::float AS peso_kg,
              se.repeticiones, se.rpe, se.descanso_seg
       FROM serie se JOIN ejercicio e ON e.id_ejercicio = se.id_ejercicio
       WHERE se.id_sesion = $1 ORDER BY se.registrado_en`, [req.params.id]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/:id/series", async (req, res, next) => {
  try {
    if (!(await sesionDelUsuario(req.params.id, req.usuario.id))) return res.status(404).json({ error: "Sesión no encontrada" });
    const { id_ejercicio, peso_kg, repeticiones, rpe, descanso_seg } = req.body || {};
    if (!id_ejercicio) return res.status(400).json({ error: "Selecciona un ejercicio" });
    if (!(Number(peso_kg) >= 0)) return res.status(400).json({ error: "Peso no válido" });
    if (!(Number.isInteger(Number(repeticiones)) && Number(repeticiones) > 0)) return res.status(400).json({ error: "Repeticiones no válidas" });
    if (rpe != null && rpe !== "" && !(Number(rpe) >= 1 && Number(rpe) <= 10)) return res.status(400).json({ error: "El RPE va de 1 a 10" });
    const { rows } = await db.query(
      `INSERT INTO serie (id_sesion, id_ejercicio, numero_serie, repeticiones, peso_kg, rpe, descanso_seg)
       VALUES ($1, $2, (SELECT COALESCE(MAX(numero_serie), 0) + 1 FROM serie WHERE id_sesion = $1 AND id_ejercicio = $2),
               $3, $4, $5, $6)
       RETURNING id_serie, id_ejercicio, numero_serie, peso_kg::float AS peso_kg, repeticiones, rpe, descanso_seg`,
      [req.params.id, id_ejercicio, repeticiones, peso_kg, rpe === "" || rpe == null ? null : rpe, descanso_seg || null]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.delete("/:id/series/:idSerie", async (req, res, next) => {
  try {
    if (!(await sesionDelUsuario(req.params.id, req.usuario.id))) return res.status(404).json({ error: "Sesión no encontrada" });
    await db.query("DELETE FROM serie WHERE id_serie = $1 AND id_sesion = $2", [req.params.idSerie, req.params.id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

// Historial por fecha y por ejercicio
router.get("/", async (req, res, next) => {
  try {
    const { ejercicio, desde, hasta } = req.query;
    const p = [req.usuario.id], cond = ["s.id_usuario = $1"];
    if (ejercicio) { p.push(ejercicio); cond.push(`se.id_ejercicio = $${p.length}`); }
    if (desde) { p.push(desde); cond.push(`s.fecha >= $${p.length}`); }
    if (hasta) { p.push(hasta); cond.push(`s.fecha <= $${p.length}`); }
    const { rows } = await db.query(
      `SELECT s.id_sesion, to_char(s.fecha, 'YYYY-MM-DD') AS fecha, e.id_ejercicio, e.nombre AS ejercicio, e.grupo_muscular,
              se.numero_serie, se.peso_kg::float AS peso_kg, se.repeticiones, se.rpe
       FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion JOIN ejercicio e ON e.id_ejercicio = se.id_ejercicio
       WHERE ${cond.join(" AND ")} ORDER BY s.fecha DESC, s.id_sesion DESC, se.registrado_en`, p);
    const sesiones = [];
    for (const r of rows) {
      let s = sesiones.find((x) => x.id_sesion === r.id_sesion);
      if (!s) { s = { id_sesion: r.id_sesion, fecha: r.fecha, ejercicios: [] }; sesiones.push(s); }
      let ej = s.ejercicios.find((x) => x.id_ejercicio === r.id_ejercicio);
      if (!ej) { ej = { id_ejercicio: r.id_ejercicio, nombre: r.ejercicio, grupo_muscular: r.grupo_muscular, series: [] }; s.ejercicios.push(ej); }
      ej.series.push({ numero_serie: r.numero_serie, peso_kg: r.peso_kg, repeticiones: r.repeticiones, rpe: r.rpe });
    }
    res.json(sesiones);
  } catch (e) { next(e); }
});

module.exports = router;
