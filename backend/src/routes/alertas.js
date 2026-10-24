// HU-11: alerta de estancamiento con variante propuesta
const router = require("express").Router();
const db = require("../db");
const { hayEstancamiento } = require("../progresion");

async function detectar(idUsuario) {
  const { rows } = await db.query(
    `SELECT se.id_ejercicio, s.id_sesion, MAX(s.fecha) AS fecha, SUM(se.peso_kg * se.repeticiones)::float AS volumen
     FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion WHERE s.id_usuario = $1
     GROUP BY se.id_ejercicio, s.id_sesion ORDER BY se.id_ejercicio, MAX(s.fecha), s.id_sesion`, [idUsuario]);
  const porEj = new Map();
  for (const r of rows) {
    if (!porEj.has(r.id_ejercicio)) porEj.set(r.id_ejercicio, []);
    porEj.get(r.id_ejercicio).push(r);
  }
  for (const [idE, ses] of porEj) {
    if (!hayEstancamiento(ses.map((s) => s.volumen))) continue;
    const ultimaFecha = ses.at(-1).fecha;
    const ya = await db.query("SELECT 1 FROM alerta WHERE id_usuario = $1 AND id_ejercicio = $2 AND fecha::date >= $3::date", [idUsuario, idE, ultimaFecha]);
    if (ya.rows.length) continue;
    const ej = (await db.query("SELECT * FROM ejercicio WHERE id_ejercicio = $1", [idE])).rows[0];
    // Variante: mismo grupo muscular, otro ejercicio; se prefiere otro tipo de equipo
    const v = (await db.query(
      `SELECT nombre FROM ejercicio WHERE grupo_muscular = $1 AND id_ejercicio <> $2
       ORDER BY (equipo = $3), id_ejercicio LIMIT 1`, [ej.grupo_muscular, idE, ej.equipo])).rows[0];
    const mensaje = `${ej.nombre} sin aumento de volumen en 3 sesiones seguidas.` + (v ? ` Variante propuesta: ${v.nombre}.` : "");
    await db.query("INSERT INTO alerta (id_usuario, id_ejercicio, mensaje) VALUES ($1,$2,$3)", [idUsuario, idE, mensaje]);
  }
}

router.get("/", async (req, res, next) => {
  try {
    await detectar(req.usuario.id);
    const { rows } = await db.query(
      `SELECT a.*, e.nombre AS ejercicio FROM alerta a JOIN ejercicio e ON e.id_ejercicio = a.id_ejercicio
       WHERE a.id_usuario = $1 AND NOT a.leida ORDER BY a.fecha DESC`, [req.usuario.id]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.patch("/:id/leida", async (req, res, next) => {
  try {
    await db.query("UPDATE alerta SET leida = TRUE WHERE id_alerta = $1 AND id_usuario = $2", [req.params.id, req.usuario.id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
