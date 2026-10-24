// HU-01: registro e inicio de sesión
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const db = require("../db");
const { firmarToken } = require("../auth");

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/registro", async (req, res, next) => {
  try {
    const { nombre, correo, contrasena, consentimiento } = req.body || {};
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: "Ingresa tu nombre" });
    if (!CORREO.test(correo || "")) return res.status(400).json({ error: "Correo no válido" });
    if (!contrasena || contrasena.length < 8) return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    if (consentimiento !== true) return res.status(400).json({ error: "Debes aceptar el tratamiento de datos (Ley N.º 29733)" });
    const hash = await bcrypt.hash(contrasena, 10);
    const { rows } = await db.query(
      `INSERT INTO usuario (nombre, correo, contrasena_hash, consentimiento_datos)
       VALUES ($1, LOWER($2), $3, TRUE) RETURNING id_usuario, nombre, correo, rol`,
      [nombre.trim(), correo.trim(), hash]
    );
    res.status(201).json({ token: firmarToken(rows[0]), usuario: rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Ese correo ya está registrado" });
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body || {};
    const { rows } = await db.query("SELECT * FROM usuario WHERE correo = LOWER($1)", [(correo || "").trim()]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(contrasena || "", u.contrasena_hash))) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }
    res.json({ token: firmarToken(u), usuario: { id_usuario: u.id_usuario, nombre: u.nombre, correo: u.correo, rol: u.rol } });
  } catch (e) { next(e); }
});

module.exports = router;
