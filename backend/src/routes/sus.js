// HU-15: cuestionario SUS aplicado desde el módulo al cierre de la prueba
const router = require("express").Router();
const db = require("../db");
const { puntajeSUS } = require("../progreso");

const SESIONES_MINIMAS = 3; // se invita a responder cuando el usuario ya usó el módulo en al menos tres sesiones

router.get("/estado", async (req, res, next) => {
  try {
    const r = (await db.query("SELECT puntaje::float AS puntaje, fecha FROM respuesta_sus WHERE id_usuario = $1", [req.usuario.id])).rows[0];
    const sesiones = (await db.query(
      "SELECT COUNT(DISTINCT s.id_sesion)::int AS n FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion WHERE s.id_usuario = $1",
      [req.usuario.id])).rows[0].n;
    res.json({ respondido: !!r, puntaje: r?.puntaje ?? null, sesiones, disponible: sesiones >= SESIONES_MINIMAS, minimo: SESIONES_MINIMAS });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const r = (req.body?.respuestas || []).map(Number);
    if (puntajeSUS(r) == null) return res.status(400).json({ error: "Responde los 10 ítems con un valor de 1 a 5" });
    const perfil = (await db.query("SELECT nivel FROM perfil_entrenamiento WHERE id_usuario = $1", [req.usuario.id])).rows[0];
    if (!perfil) return res.status(400).json({ error: "Completa tu perfil antes de responder el cuestionario" });
    const { rows } = await db.query(
      `INSERT INTO respuesta_sus (id_usuario, nivel, item_1, item_2, item_3, item_4, item_5, item_6, item_7, item_8, item_9, item_10)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING puntaje::float AS puntaje, nivel`,
      [req.usuario.id, perfil.nivel, ...r]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Ya respondiste el cuestionario" });
    next(e);
  }
});

module.exports = router;
