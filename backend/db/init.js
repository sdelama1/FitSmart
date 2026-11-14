// Crea las tablas y carga el catálogo de ejercicios: npm run db:init
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query("SELECT to_regclass('public.usuario') AS t");
  // Si las tablas ya existen solo se aplican las actualizaciones, que se pueden ejecutar varias veces
  const archivos = rows[0].t ? ["03_recomendaciones.sql"] : ["01_esquema.sql", "02_ejercicios.sql", "03_recomendaciones.sql"];
  if (rows[0].t) console.log("Las tablas ya existen: se aplican solo las actualizaciones.");
  for (const f of archivos) {
    await client.query(fs.readFileSync(path.join(__dirname, f), "utf8"));
    console.log("Ejecutado:", f);
  }
  await client.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
