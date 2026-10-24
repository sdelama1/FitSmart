// Carga datos de ejemplo para demostración de FitSmart (HU-01 a HU-12)
require("dotenv").config();
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Conectado a PostgreSQL...");

  // 1. Limpiar datos previos del usuario demo si existía
  await client.query("DELETE FROM usuario WHERE correo = 'demo@fitsmart.pe'");

  // 2. Crear usuario demo
  const hash = await bcrypt.hash("Demo1234!", 10);
  const uRes = await client.query(
    `INSERT INTO usuario (nombre, correo, contrasena_hash, consentimiento_datos)
     VALUES ($1, $2, $3, true) RETURNING id_usuario`,
    ["Usuario Demo", "demo@fitsmart.pe", hash]
  );
  const idU = uRes.rows[0].id_usuario;
  console.log("Usuario demo creado (ID:", idU, ")");

  // 3. Crear perfil de entrenamiento
  await client.query(
    `INSERT INTO perfil_entrenamiento (id_usuario, edad, sexo, peso_corporal_kg, objetivo, dias_por_semana, meses_practica, nivel)
     VALUES ($1, 24, 'masculino', 72.5, 'hipertrofia', 4, 8, 'intermedio')`,
    [idU]
  );
  console.log("Perfil de entrenamiento asignado (Nivel: intermedio)");

  // 4. Obtener id de ejercicios
  const ejBanca = (await client.query("SELECT id_ejercicio FROM ejercicio WHERE nombre = 'Press de banca'")).rows[0]?.id_ejercicio || 1;
  const ejSentadilla = (await client.query("SELECT id_ejercicio FROM ejercicio WHERE nombre = 'Sentadilla con barra'")).rows[0]?.id_ejercicio || 8;

  // 5. Cargar sesiones históricas para Press de banca (progresión para probar HU-09 y HU-10)
  const fechasBanca = [
    { diasAtras: 12, peso: 40.0, reps: 10, rpe: 7 },
    { diasAtras: 8,  peso: 40.0, reps: 10, rpe: 8 },
    { diasAtras: 4,  peso: 42.5, reps: 9,  rpe: 8 },
    { diasAtras: 1,  peso: 42.5, reps: 10, rpe: 9 },
  ];

  for (const s of fechasBanca) {
    const sRes = await client.query(
      `INSERT INTO sesion (id_usuario, fecha, duracion_min)
       VALUES ($1, CURRENT_DATE - ${s.diasAtras}, 50) RETURNING id_sesion`,
      [idU]
    );
    const idS = sRes.rows[0].id_sesion;
    for (let serie = 1; serie <= 3; serie++) {
      await client.query(
        `INSERT INTO serie (id_sesion, id_ejercicio, numero_serie, peso_kg, repeticiones, rpe, descanso_seg)
         VALUES ($1, $2, $3, $4, $5, $6, 90)`,
        [idS, ejBanca, serie, s.peso, s.reps, s.rpe]
      );
    }
  }
  console.log("Sesiones históricas de 'Press de banca' cargadas (4 sesiones).");

  // 6. Cargar sesiones con estancamiento para Sentadilla con barra (para probar HU-11)
  // 4 sesiones con volumen que no supera el volumen previo
  const fechasSentadilla = [
    { diasAtras: 15, peso: 80.0, reps: 10 },
    { diasAtras: 11, peso: 75.0, reps: 8  },
    { diasAtras: 7,  peso: 75.0, reps: 8  },
    { diasAtras: 3,  peso: 75.0, reps: 8  },
  ];

  for (const s of fechasSentadilla) {
    const sRes = await client.query(
      `INSERT INTO sesion (id_usuario, fecha, duracion_min)
       VALUES ($1, CURRENT_DATE - ${s.diasAtras}, 60) RETURNING id_sesion`,
      [idU]
    );
    const idS = sRes.rows[0].id_sesion;
    for (let serie = 1; serie <= 3; serie++) {
      await client.query(
        `INSERT INTO serie (id_sesion, id_ejercicio, numero_serie, peso_kg, repeticiones, rpe, descanso_seg)
         VALUES ($1, $2, $3, $4, $5, 8, 120)`,
        [idS, ejSentadilla, serie, s.peso, s.reps]
      );
    }
  }

  // Generar alerta de estancamiento para Sentadilla
  await client.query(
    `INSERT INTO alerta (id_usuario, id_ejercicio, tipo, mensaje)
     VALUES ($1, $2, 'estancamiento', 'Sentadilla con barra: 3 sesiones consecutivas sin aumento de volumen.')`,
    [idU, ejSentadilla]
  );
  console.log("Sesiones y alerta de estancamiento cargadas para 'Sentadilla con barra'.");

  console.log("\n========================================================");
  console.log("¡Datos de demostración cargados exitosamente!");
  console.log("Credenciales de prueba:");
  console.log("  Correo:      demo@fitsmart.pe");
  console.log("  Contraseña:  Demo1234!");
  console.log("========================================================\n");

  await client.end();
})().catch((e) => {
  console.error("Error al cargar semilla:", e.message);
  process.exit(1);
});
