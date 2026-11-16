// HU-13 y HU-14: gráficos de progreso y comparación con la semana anterior
const router = require("express").Router();
const db = require("../db");
const { volumenSemanal, compararSemanas, sumarDias } = require("../progreso");

const hoyBD = async () => (await db.query("SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS d")).rows[0].d;
const seriesDesde = (id, desde) => db.query(
  `SELECT s.id_sesion, to_char(s.fecha, 'YYYY-MM-DD') AS fecha, se.peso_kg::float AS peso_kg, se.repeticiones, e.grupo_muscular
   FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion JOIN ejercicio e ON e.id_ejercicio = se.id_ejercicio
   WHERE s.id_usuario = $1 AND NOT se.calentamiento AND s.fecha >= $2::date`, [id, desde]);

router.get("/semanal", async (req, res, next) => {
  try {
    const semanas = Math.min(Math.max(Number(req.query.semanas) || 8, 2), 26);
    const hoy = await hoyBD();
    const { rows } = await seriesDesde(req.usuario.id, sumarDias(hoy, -7 * semanas - 7));
    res.json(volumenSemanal(rows, hoy, semanas));
  } catch (e) { next(e); }
});

router.get("/comparacion", async (req, res, next) => {
  try {
    const hoy = await hoyBD();
    const { rows } = await seriesDesde(req.usuario.id, sumarDias(hoy, -13));
    res.json({ desde: sumarDias(hoy, -6), hasta: hoy, grupos: compararSemanas(rows, hoy) });
  } catch (e) { next(e); }
});

// Ejercicios que el usuario ya registró, para elegir cuál graficar
router.get("/ejercicios", async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT e.id_ejercicio, e.nombre, COUNT(DISTINCT s.id_sesion)::int AS sesiones, MAX(s.fecha) AS ultima
       FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion JOIN ejercicio e ON e.id_ejercicio = se.id_ejercicio
       WHERE s.id_usuario = $1 AND NOT se.calentamiento GROUP BY e.id_ejercicio, e.nombre ORDER BY MAX(s.fecha) DESC, e.nombre`, [req.usuario.id]);
    res.json(rows.map(({ ultima, ...r }) => r));
  } catch (e) { next(e); }
});

// Carga máxima y volumen por sesión de un ejercicio
router.get("/ejercicio/:id", async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT to_char(s.fecha, 'YYYY-MM-DD') AS fecha, MAX(se.peso_kg)::float AS carga_maxima,
              SUM(se.peso_kg * se.repeticiones)::float AS volumen
       FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion
       WHERE s.id_usuario = $1 AND se.id_ejercicio = $2 AND NOT se.calentamiento
       GROUP BY s.id_sesion, s.fecha ORDER BY s.fecha, s.id_sesion`, [req.usuario.id, req.params.id]);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
