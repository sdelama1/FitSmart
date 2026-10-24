// HU-10: sugerencia de carga con el modelo inteligente y regla de respaldo
const router = require("express").Router();
const db = require("../db");
const { prescripcion, resumirSesiones, reglaDobleProgresion, aplicarLimites } = require("../progresion");

const ML_URL = process.env.ML_URL || "http://localhost:8000";
const TIEMPO_MAX_MS = 1500; // RNF-03: respuesta en 2 s o menos

async function pedirAlModelo(historial, inferior) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIEMPO_MAX_MS);
  try {
    const r = await fetch(`${ML_URL}/sugerir`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ historial: historial.slice(-6).map(({ fecha, ...s }) => s), tren_inferior: inferior }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; } finally { clearTimeout(t); }
}

router.get("/:idEjercicio", async (req, res, next) => {
  try {
    const idU = req.usuario.id, idE = Number(req.params.idEjercicio);
    const excluir = Number(req.query.excluir_sesion) || 0;
    const ej = (await db.query("SELECT * FROM ejercicio WHERE id_ejercicio = $1", [idE])).rows[0];
    if (!ej) return res.status(404).json({ error: "Ejercicio no encontrado" });

    // Rango de repeticiones: el de la rutina si el ejercicio está en ella; si no, el del objetivo
    const perfil = (await db.query("SELECT * FROM perfil_entrenamiento WHERE id_usuario = $1", [idU])).rows[0];
    const enRutina = (await db.query(
      `SELECT re.rep_min, re.rep_max FROM rutina_ejercicio re JOIN rutina r ON r.id_rutina = re.id_rutina
       WHERE r.id_usuario = $1 AND re.id_ejercicio = $2 ORDER BY r.fecha_creacion DESC LIMIT 1`, [idU, idE])).rows[0];
    const rango = enRutina || prescripcion(perfil?.objetivo, perfil?.nivel);

    const filas = (await db.query(
      `SELECT s.id_sesion, to_char(s.fecha, 'YYYY-MM-DD') AS fecha, se.peso_kg::float AS peso_kg, se.repeticiones, se.rpe
       FROM sesion s JOIN serie se ON se.id_sesion = s.id_sesion
       WHERE s.id_usuario = $1 AND se.id_ejercicio = $2 AND s.id_sesion <> $3
       ORDER BY s.fecha, s.id_sesion, se.numero_serie`, [idU, idE, excluir])).rows;
    if (!filas.length) return res.json(null);
    const historial = resumirSesiones(filas);
    const ultima = historial.at(-1);
    const inferior = ej.tren === "inferior";

    const inicio = Date.now();
    const delModelo = await pedirAlModelo(historial, inferior);
    let peso, fuente, version;
    if (delModelo) {
      peso = aplicarLimites(ultima.peso_kg, delModelo.peso_sugerido_kg, inferior);
      fuente = "modelo"; version = delModelo.version_modelo;
    } else {
      peso = reglaDobleProgresion(ultima, rango.rep_max, inferior).peso_sugerido_kg;
      fuente = "regla"; version = "regla-doble-prog";
    }
    // Si ya hay una sugerencia de hoy sin responder para el mismo peso, se reutiliza
    const previa = (await db.query(
      `SELECT id_recomendacion FROM recomendacion WHERE id_usuario = $1 AND id_ejercicio = $2 AND fecha::date = CURRENT_DATE
       AND aceptada IS NULL AND peso_sugerido_kg = $3 ORDER BY fecha DESC LIMIT 1`, [idU, idE, peso])).rows;
    const { rows } = previa.length ? { rows: previa } : await db.query(
      `INSERT INTO recomendacion (id_usuario, id_ejercicio, peso_sugerido_kg, repeticiones_sugeridas, version_modelo)
       VALUES ($1,$2,$3,$4,$5) RETURNING id_recomendacion`, [idU, idE, peso, rango.rep_min, version]);
    res.json({
      id_recomendacion: rows[0].id_recomendacion, peso_sugerido_kg: peso, delta_kg: Math.round((peso - ultima.peso_kg) * 100) / 100,
      rep_min: rango.rep_min, rep_max: rango.rep_max, fuente, version_modelo: version, tiempo_ms: Date.now() - inicio,
      anterior: { fecha: ultima.fecha, peso_kg: ultima.peso_kg, repeticiones: ultima.repeticiones, rpe: ultima.rpe },
    });
  } catch (e) { next(e); }
});

router.patch("/:idRecomendacion", async (req, res, next) => {
  try {
    const { aceptada } = req.body || {};
    if (typeof aceptada !== "boolean") return res.status(400).json({ error: "Indica si la sugerencia fue aceptada" });
    const r = await db.query("UPDATE recomendacion SET aceptada = $1 WHERE id_recomendacion = $2 AND id_usuario = $3 RETURNING *",
      [aceptada, req.params.idRecomendacion, req.usuario.id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Sugerencia no encontrada" });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
