// HU-02 y HU-03: perfil de entrenamiento con nivel calculado
const router = require("express").Router();
const db = require("../db");
const { clasificarNivel } = require("../nivel");

const OBJETIVOS = ["hipertrofia", "fuerza", "perdida_grasa", "resistencia"];

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.nombre, u.correo, p.* FROM usuario u
       LEFT JOIN perfil_entrenamiento p ON p.id_usuario = u.id_usuario WHERE u.id_usuario = $1`, [req.usuario.id]);
    res.json(rows[0] || null);
  } catch (e) { next(e); }
});

router.put("/", async (req, res, next) => {
  try {
    const { edad, sexo, peso_corporal_kg, objetivo, dias_por_semana, meses_practica } = req.body || {};
    if (!(edad >= 14 && edad <= 90)) return res.status(400).json({ error: "La edad debe estar entre 14 y 90 años" });
    if (!["masculino", "femenino"].includes(sexo)) return res.status(400).json({ error: "Selecciona el sexo" });
    if (!(peso_corporal_kg > 0)) return res.status(400).json({ error: "Peso corporal no válido" });
    if (!OBJETIVOS.includes(objetivo)) return res.status(400).json({ error: "Selecciona un objetivo" });
    if (!(dias_por_semana >= 1 && dias_por_semana <= 7)) return res.status(400).json({ error: "Días por semana entre 1 y 7" });
    if (!(meses_practica >= 0)) return res.status(400).json({ error: "Tiempo de práctica no válido" });
    const nivel = clasificarNivel(meses_practica);
    const { rows } = await db.query(
      `INSERT INTO perfil_entrenamiento (id_usuario, edad, sexo, peso_corporal_kg, objetivo, dias_por_semana, meses_practica, nivel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id_usuario) DO UPDATE SET edad=EXCLUDED.edad, sexo=EXCLUDED.sexo, peso_corporal_kg=EXCLUDED.peso_corporal_kg,
         objetivo=EXCLUDED.objetivo, dias_por_semana=EXCLUDED.dias_por_semana, meses_practica=EXCLUDED.meses_practica, nivel=EXCLUDED.nivel
       RETURNING *`,
      [req.usuario.id, edad, sexo, peso_corporal_kg, objetivo, dias_por_semana, meses_practica, nivel]);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
