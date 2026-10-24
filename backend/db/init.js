// Crea las tablas y carga el catálogo de ejercicios: npm run db:init
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query("SELECT to_regclass('public.usuario') AS t");
  if (rows[0].t) {
    console.log("Las tablas ya existen. Para reiniciar, borra la base y vuelve a crearla.");
  } else {
    for (const f of ["01_esquema.sql", "02_ejercicios.sql"]) {
      await client.query(fs.readFileSync(path.join(__dirname, f), "utf8"));
      console.log("Ejecutado:", f);
    }
  }
  await client.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
