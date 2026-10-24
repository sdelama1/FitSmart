const express = require("express");
const cors = require("cors");
const { requiereAuth } = require("./auth");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/salud", (_req, res) => res.json({ estado: "ok" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/perfil", requiereAuth, require("./routes/perfil"));
app.use("/api/ejercicios", requiereAuth, require("./routes/ejercicios"));
app.use("/api/sesiones", requiereAuth, require("./routes/sesiones"));
app.use("/api/sugerencias", requiereAuth, require("./routes/sugerencias"));
app.use("/api/alertas", requiereAuth, require("./routes/alertas"));
app.use("/api/rutinas", requiereAuth, require("./routes/rutinas").router);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

module.exports = app;
