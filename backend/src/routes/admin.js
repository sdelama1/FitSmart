// HU-16: panel del administrador del gimnasio (catálogo de ejercicios e indicadores de uso)
const router = require("express").Router();
const db = require("../db");

router.use((req, res, next) => (req.usuario?.rol === "administrador" ? next() : res.status(403).json({ error: "Solo para el administrador" })));

const GRUPOS = ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Core"];
const TRENES = ["superior", "inferior"];

function validar(b) {
  const e = {
    nombre: String(b.nombre || "").trim(), grupo_muscular: b.grupo_muscular, equipo: String(b.equipo || "").trim(), tren: b.tren,
    dificultad: Number(b.dificultad), incremento_kg: Number(b.incremento_kg), descripcion_tecnica: String(b.descripcion_tecnica || "").trim(),
    url_multimedia: String(b.url_multimedia || "").trim() || null, id_progresion: b.id_progresion ? Number(b.id_progresion) : null,
  };
  if (!e.nombre) return [null, "Ingresa el nombre del ejercicio"];
  if (!GRUPOS.includes(e.grupo_muscular)) return [null, "Selecciona un grupo muscular"];
  if (!e.equipo) return [null, "Ingresa el equipo"];
  if (!TRENES.includes(e.tren)) return [null, "Selecciona el tren (superior o inferior)"];
  if (![1, 2, 3].includes(e.dificultad)) return [null, "La dificultad debe ser 1, 2 o 3"];
  if (!(e.incremento_kg > 0 && e.incremento_kg <= 10)) return [null, "El incremento debe estar entre 0,5 y 10 kg"];
  if (e.descripcion_tecnica.length < 20) return [null, "Describe la técnica en al menos 20 caracteres"];
  if (e.url_multimedia && !/^https?:\/\//.test(e.url_multimedia)) return [null, "El enlace del video debe empezar con http"];
  return [e, null];
}

router.get("/indicadores", async (_req, res, next) => {
  try {
    const q = async (sql) => (await db.query(sql)).rows;
    const [tot] = await q(`SELECT
        (SELECT COUNT(*)::int FROM usuario WHERE rol = 'usuario') AS registrados,
        (SELECT COUNT(DISTINCT s.id_usuario)::int FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion WHERE s.fecha >= CURRENT_DATE - 6) AS activos,
        (SELECT COUNT(DISTINCT s.id_sesion)::int FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion WHERE s.fecha >= CURRENT_DATE - 6) AS sesiones_semana,
        (SELECT COUNT(*)::int FROM respuesta_sus) AS respuestas_sus`);
    const porSemana = await q(`SELECT to_char(date_trunc('week', d)::date, 'YYYY-MM-DD') AS semana,
        (SELECT COUNT(DISTINCT s.id_sesion)::int FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion
          WHERE s.fecha >= date_trunc('week', d)::date AND s.fecha < date_trunc('week', d)::date + 7) AS sesiones
      FROM generate_series(CURRENT_DATE - 49, CURRENT_DATE, interval '7 days') AS d ORDER BY 1`);
    const sus = await q(`SELECT nivel, COUNT(*)::int AS respuestas, ROUND(AVG(puntaje), 1)::float AS promedio
      FROM respuesta_sus WHERE nivel IS NOT NULL GROUP BY nivel
      ORDER BY array_position(ARRAY['principiante','intermedio','experimentado']::varchar[], nivel)`);
    const porNivel = await q(`SELECT nivel, COUNT(*)::int AS usuarios FROM perfil_entrenamiento GROUP BY nivel
      ORDER BY array_position(ARRAY['principiante','intermedio','experimentado']::varchar[], nivel)`);
    res.json({ ...tot, sesiones_por_semana: porSemana, sus_por_nivel: sus, usuarios_por_nivel: porNivel });
  } catch (e) { next(e); }
});

router.get("/ejercicios", async (_req, res, next) => {
  try {
    res.json((await db.query(
      `SELECT e.*, (SELECT COUNT(*)::int FROM serie se WHERE se.id_ejercicio = e.id_ejercicio) AS series_registradas
       FROM ejercicio e ORDER BY e.activo DESC, e.grupo_muscular, e.nombre`)).rows);
  } catch (e) { next(e); }
});

router.post("/ejercicios", async (req, res, next) => {
  try {
    const [e, err] = validar(req.body || {});
    if (err) return res.status(400).json({ error: err });
    const { rows } = await db.query(
      `INSERT INTO ejercicio (nombre, grupo_muscular, equipo, tren, dificultad, incremento_kg, descripcion_tecnica, url_multimedia, id_progresion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [e.nombre, e.grupo_muscular, e.equipo, e.tren, e.dificultad, e.incremento_kg, e.descripcion_tecnica, e.url_multimedia, e.id_progresion]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Ya existe un ejercicio con ese nombre" });
    next(e);
  }
});

router.put("/ejercicios/:id", async (req, res, next) => {
  try {
    const [e, err] = validar(req.body || {});
    if (err) return res.status(400).json({ error: err });
    if (e.id_progresion === Number(req.params.id)) return res.status(400).json({ error: "Un ejercicio no puede progresar a sí mismo" });
    const { rows } = await db.query(
      `UPDATE ejercicio SET nombre=$1, grupo_muscular=$2, equipo=$3, tren=$4, dificultad=$5, incremento_kg=$6,
         descripcion_tecnica=$7, url_multimedia=$8, id_progresion=$9, activo = COALESCE($10, activo)
       WHERE id_ejercicio = $11 RETURNING *`,
      [e.nombre, e.grupo_muscular, e.equipo, e.tren, e.dificultad, e.incremento_kg, e.descripcion_tecnica, e.url_multimedia, e.id_progresion,
        typeof req.body.activo === "boolean" ? req.body.activo : null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Ejercicio no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Ya existe un ejercicio con ese nombre" });
    next(e);
  }
});

// Baja lógica: el ejercicio deja de aparecer en el catálogo, la rutina y las recomendaciones, pero su historial se conserva
router.delete("/ejercicios/:id", async (req, res, next) => {
  try {
    const r = await db.query("UPDATE ejercicio SET activo = FALSE WHERE id_ejercicio = $1", [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: "Ejercicio no encontrado" });
    res.status(204).end();
  } catch (e) { next(e); }
});

router.patch("/ejercicios/:id/reactivar", async (req, res, next) => {
  try {
    const r = await db.query("UPDATE ejercicio SET activo = TRUE WHERE id_ejercicio = $1", [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: "Ejercicio no encontrado" });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
