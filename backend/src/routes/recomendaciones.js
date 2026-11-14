// HU-19: recomendaciones personalizadas de ejercicios en el catálogo
const router = require("express").Router();
const db = require("../db");
const { recomendar } = require("../recomendador");

const DIAS_DESCARTE = 7; // un ejercicio descartado no se vuelve a recomendar durante una semana

router.get("/", async (req, res, next) => {
  try {
    const id = req.usuario.id;
    const perfil = (await db.query("SELECT nivel FROM perfil_entrenamiento WHERE id_usuario = $1", [id])).rows[0];
    if (!perfil) return res.json([]);
    const catalogo = (await db.query("SELECT * FROM ejercicio ORDER BY id_ejercicio")).rows;
    const historial = (await db.query(
      `SELECT se.id_ejercicio, to_char(s.fecha, 'YYYY-MM-DD') AS fecha, MAX(se.peso_kg)::float AS peso_max,
              SUM(se.peso_kg * se.repeticiones)::float AS volumen
       FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion WHERE s.id_usuario = $1
       GROUP BY se.id_ejercicio, s.id_sesion, s.fecha ORDER BY s.fecha, s.id_sesion`, [id])).rows;
    const excluir = new Set((await db.query(
      `SELECT DISTINCT id_ejercicio FROM recomendacion_ejercicio
       WHERE id_usuario = $1 AND ((estado = 'descartada' AND fecha > now() - interval '${DIAS_DESCARTE} days')
                                  OR (estado = 'aceptada' AND fecha::date = CURRENT_DATE))`, [id])).rows.map((r) => r.id_ejercicio));
    const hoy = (await db.query("SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS d")).rows[0].d;

    const lista = recomendar(perfil, catalogo, historial, { hoy, excluir });
    const salida = [];
    for (const r of lista) {
      // Se reutiliza la recomendación pendiente del día para no duplicar registros al recargar la página
      let fila = (await db.query(
        `SELECT id_rec_ejercicio FROM recomendacion_ejercicio WHERE id_usuario = $1 AND id_ejercicio = $2 AND tipo = $3
         AND estado IS NULL AND fecha::date = CURRENT_DATE`, [id, r.ejercicio.id_ejercicio, r.tipo])).rows[0];
      if (!fila) fila = (await db.query(
        `INSERT INTO recomendacion_ejercicio (id_usuario, id_ejercicio, tipo, motivo) VALUES ($1, $2, $3, $4) RETURNING id_rec_ejercicio`,
        [id, r.ejercicio.id_ejercicio, r.tipo, r.motivo])).rows[0];
      salida.push({ id: fila.id_rec_ejercicio, tipo: r.tipo, motivo: r.motivo, ejercicio: r.ejercicio });
    }
    res.json(salida);
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { estado } = req.body || {};
    if (!["aceptada", "descartada"].includes(estado)) return res.status(400).json({ error: "Estado no válido" });
    const r = await db.query("UPDATE recomendacion_ejercicio SET estado = $1 WHERE id_rec_ejercicio = $2 AND id_usuario = $3",
      [estado, req.params.id, req.usuario.id]);
    if (!r.rowCount) return res.status(404).json({ error: "Recomendación no encontrada" });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
