// HU-04 y HU-06: catálogo con filtros y precarga de la sesión anterior
const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res, next) => {
  try {
    const { grupo, equipo, q } = req.query;
    const cond = [], p = [];
    if (grupo) { p.push(grupo); cond.push(`grupo_muscular = $${p.length}`); }
    if (equipo) { p.push(equipo); cond.push(`equipo = $${p.length}`); }
    if (q) { p.push(`%${q}%`); cond.push(`nombre ILIKE $${p.length}`); }
    const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
    const { rows } = await db.query(`SELECT * FROM ejercicio ${where} ORDER BY grupo_muscular, nombre`, p);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get("/filtros", async (_req, res, next) => {
  try {
    const g = await db.query("SELECT DISTINCT grupo_muscular AS v FROM ejercicio ORDER BY 1");
    const e = await db.query("SELECT DISTINCT equipo AS v FROM ejercicio ORDER BY 1");
    res.json({ grupos: g.rows.map((r) => r.v), equipos: e.rows.map((r) => r.v) });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await db.query("SELECT * FROM ejercicio WHERE id_ejercicio = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Ejercicio no encontrado" });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// Series de la última sesión anterior en que el usuario hizo este ejercicio
router.get("/:id/ultima-sesion", async (req, res, next) => {
  try {
    const excluir = req.query.excluir_sesion ? Number(req.query.excluir_sesion) : 0;
    const ult = await db.query(
      `SELECT s.id_sesion, to_char(s.fecha, 'YYYY-MM-DD') AS fecha FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion
       WHERE s.id_usuario = $1 AND se.id_ejercicio = $2 AND s.id_sesion <> $3
       ORDER BY s.fecha DESC, s.id_sesion DESC LIMIT 1`, [req.usuario.id, req.params.id, excluir]);
    if (!ult.rows[0]) return res.json(null);
    const series = await db.query(
      `SELECT numero_serie, peso_kg::float AS peso_kg, repeticiones, rpe FROM serie
       WHERE id_sesion = $1 AND id_ejercicio = $2 ORDER BY numero_serie`, [ult.rows[0].id_sesion, req.params.id]);
    res.json({ fecha: ult.rows[0].fecha, series: series.rows });
  } catch (e) { next(e); }
});

module.exports = router;
