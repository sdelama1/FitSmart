const jwt = require("jsonwebtoken");

function firmarToken(usuario) {
  return jwt.sign({ id: usuario.id_usuario, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function requiereAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sesión no iniciada" });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Sesión expirada, vuelve a iniciar sesión" });
  }
}
module.exports = { firmarToken, requiereAuth };
