# FitSmart · Sprints 1 y 2 (entregables 1.4.1, 1.4.2 y 1.4.3)

Aplicación web del módulo inteligente de seguimiento de entrenamientos FitSmart.
Cubre las historias HU-01 a HU-16 y HU-19 a HU-23 (Sprints 1, 2 y 3).

## Sprint 1

| Historia | Qué incluye | Dónde está |
|---|---|---|
| HU-01 | Registro con año de nacimiento (el sistema calcula la edad) y consentimiento (Ley N.º 29733), inicio de sesión con JWT, contraseña con bcrypt | `backend/src/routes/auth.js`, `Login.jsx`, `Registro.jsx` |
| HU-02 | Perfil de entrenamiento editable | `backend/src/routes/perfil.js`, `Perfil.jsx` |
| HU-03 | Nivel según meses de práctica (< 6 principiante, 6 a 11 intermedio, 12 o más experimentado); la interfaz cambia según el nivel | `backend/src/nivel.js` |
| HU-04 | Catálogo con filtro por grupo muscular y equipo, técnica y enlace a video | `backend/src/routes/ejercicios.js`, `Catalogo.jsx` |
| HU-05 | Registro de series con peso, repeticiones y RPE (1 a 10) | `backend/src/routes/sesiones.js`, `Registrar.jsx` |
| HU-06 | Precarga de los valores de la sesión anterior: guardar una serie toma un toque | `GET /api/ejercicios/:id/ultima-sesion` |
| HU-07 | Temporizador de descanso configurable con vibración y sonido | `Temporizador.jsx` |
| HU-08 | Historial por fecha y por ejercicio | `GET /api/sesiones`, `Historial.jsx` |

## Sprint 2

| Historia | Qué incluye | Dónde está |
|---|---|---|
| HU-09 | Modelo de gradient boosting que predice el cambio de peso de la siguiente sesión; guarda el modelo y el reporte de error absoluto medio (MAE) | `ml-service/entrenar.py`, `ml-service/1.4.1_Entrenamiento_modelo_FitSmart.ipynb` |
| HU-10 | Sugerencia de peso para la sesión con botones Aceptar y Mantener peso; tope de +2,5 kg en tren superior y +5 kg en tren inferior; si el servicio del modelo no responde en 1,5 s se usa la regla de doble progresión | `ml-service/main.py`, `backend/src/routes/sugerencias.js`, `Registrar.jsx` |
| HU-11 | Alerta cuando ninguna de las 3 últimas sesiones de un ejercicio supera el volumen de la sesión previa, con un ejercicio del mismo grupo muscular como variante | `backend/src/routes/alertas.js`, `Inicio.jsx` |
| HU-12 | Rutina según nivel (4, 5 o 6 ejercicios por día; máquinas primero para principiantes), objetivo (series y repeticiones) y días por semana (cuerpo completo, superior/inferior o empuje/tirón/pierna) | `backend/src/rutina.js`, `backend/src/routes/rutinas.js`, `Inicio.jsx` |

## Sprint 3

| Historia | Qué incluye | Dónde está |
|---|---|---|
| HU-13 | Pantalla Progreso: volumen semanal de las últimas 8 semanas (gráfico de barras) y carga máxima por sesión de cada ejercicio (gráfico de línea), con detalle al pasar el cursor y tabla de datos. No incluye el calentamiento | `backend/src/progreso.js`, `backend/src/routes/progreso.js`, `Progreso.jsx`, `Graficos.jsx` |
| HU-14 | Comparación por grupo muscular del volumen de los últimos 7 días frente a los 7 anteriores, con la variación porcentual | `GET /api/progreso/comparacion`, `Progreso.jsx` |
| HU-15 | Cuestionario SUS de 10 ítems (escala de 1 a 5) dentro del módulo. Se invita a responder desde Inicio después de 3 sesiones y también desde Perfil. El puntaje de 0 a 100 se guarda una sola vez por usuario junto con su nivel | `backend/src/routes/sus.js`, `Evaluacion.jsx` |
| HU-16 | Panel del administrador del gimnasio: usuarios registrados y activos, sesiones por semana, puntaje SUS promedio por nivel; alta, edición, baja y reactivación de ejercicios (la baja oculta el ejercicio sin borrar el historial) | `backend/src/routes/admin.js`, `Admin.jsx` |

Cuenta de administrador de demostración: `admin@fitsmart.pe` / `Admin1234!` (la crea `npm run db:seed`).

### Otras historias del Sprint 3

| Historia | Qué incluye | Dónde está |
|---|---|---|
| HU-19 | Recomendación personalizada de ejercicios en el catálogo según el historial: siguiente nivel al dominar un ejercicio (3 sesiones con carga en aumento), variante ante un estancamiento, equilibrio de grupos musculares sin entrenar en 7 días y ejercicios nuevos adecuados al nivel. Cada ejercicio tiene dificultad (básico, intermedio, avanzado) y el principiante no recibe ejercicios avanzados. Se registra si el usuario acepta o descarta cada recomendación | `backend/src/recomendador.js`, `backend/src/routes/recomendaciones.js`, `backend/db/03_recomendaciones.sql`, `Catalogo.jsx` |
| HU-20 | Botón "¿Equipo ocupado?" en Registrar: hasta 3 ejercicios del mismo músculo con otro equipo, aptos para el nivel, primero los que el usuario ya hizo | `GET /api/ejercicios/:id/alternativas`, `Registrar.jsx` |
| HU-21 | El principiante indica cuántas repeticiones más podía hacer (0, 1 o 2, 3 o 4, 5 o más) en lugar del RPE; se guarda como RPE equivalente (10, 9, 7 y 5) | `Registrar.jsx` |
| HU-22 | Incremento propio de cada ejercicio (1 kg en laterales, bíceps y tríceps; 2 kg en mancuernas; 2,5 kg en tren superior; 5 kg en tren inferior con barra o máquina). La subida nunca pasa del 10 % de la carga y las sugerencias se redondean a saltos de carga reales | `backend/src/progresion.js`, `backend/db/04_ajustes_coach.sql` |
| HU-23 | Interruptor "Serie de calentamiento": la serie se guarda y se ve en el historial, pero no cuenta para la sugerencia, la precarga, el volumen, las alertas ni las recomendaciones | `backend/src/routes/sesiones.js`, `Registrar.jsx` |

Tecnologías: React + Vite (PWA), Node.js + Express, PostgreSQL y Python (FastAPI + scikit-learn) para el modelo.

## Requisitos

- Node.js 20 o superior: https://nodejs.org
- PostgreSQL 15 o superior: https://www.postgresql.org/download/ (en Windows, el instalador incluye pgAdmin)
- Python 3.10 o superior: https://www.python.org/downloads/ (solo para el modelo inteligente)

## 1. Base de datos

En pgAdmin o en `psql`, crea una base vacía llamada `fitsmart`:

```sql
CREATE DATABASE fitsmart;
```

## 2. Backend (API)

```bash
cd backend
npm install
copy .env.example .env      # en Mac/Linux: cp .env.example .env
```

Abre `.env` y pon la contraseña de tu usuario `postgres` en `DATABASE_URL` y una clave larga cualquiera en `JWT_SECRET`. Luego:

```bash
npm run db:init    # crea las tablas y carga 23 ejercicios; si la base ya existe, solo aplica las actualizaciones
npm run dev        # API en http://localhost:3000
```

## 3. Servicio del modelo inteligente

En otra terminal:

```bash
cd ml-service
pip install -r requirements.txt
python entrenar.py              # entrena con los CSV de la carpeta datos/ y crea salida/modelo_fitsmart.joblib
uvicorn main:app --port 8000    # servicio en http://localhost:8000
```

La carpeta `datos/` trae un CSV de ejemplo (licencia MIT). Para el entrenamiento definitivo, descarga los CSV de Kaggle y ponlos en `datos/`:
- https://www.kaggle.com/datasets/joep89/weightlifting
- https://www.kaggle.com/datasets/tejaswinimukesh/hevy-app-workout-dataset-from-dumbbells-to-data

El MAE queda en `salida/reporte_metricas.json`. Si este servicio no está encendido, la app sigue funcionando y sugiere la carga con la regla de doble progresión.

## 4. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev        # abre http://localhost:5173
```

Para verlo como celular en el navegador: F12 y el botón de vista de dispositivo móvil.

## Pruebas

```bash
cd backend
npm test
```

Son 46 pruebas entre unitarias (nivel, progresión, límites, estancamiento, rutina, recomendaciones, progreso y puntaje SUS) y de integración con la base de datos (flujos de los Sprints 1, 2 y 3).
Las de integración usan la base de `DATABASE_URL`; crean usuarios de prueba y los borran al final.

Pruebas del servicio del modelo:

```bash
cd ml-service
python -m pytest tests
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registro` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| GET / PUT | `/api/perfil` | Ver o guardar el perfil (calcula el nivel) |
| GET | `/api/ejercicios?grupo=&equipo=&q=` | Catálogo filtrado |
| GET | `/api/ejercicios/:id/ultima-sesion` | Series de la sesión anterior (precarga) |
| POST | `/api/sesiones/hoy` | Abre la sesión del día |
| GET / POST | `/api/sesiones/:id/series` | Ver o registrar series |
| DELETE | `/api/sesiones/:id/series/:idSerie` | Borrar una serie |
| GET | `/api/sesiones?ejercicio=&desde=&hasta=` | Historial |
| GET | `/api/sugerencias/:idEjercicio?excluir_sesion=` | Sugerencia de carga (modelo o regla) |
| PATCH | `/api/sugerencias/:id` | Registrar si la sugerencia se aceptó |
| GET | `/api/alertas` | Detecta y lista alertas de estancamiento sin leer |
| PATCH | `/api/alertas/:id/leida` | Marcar alerta como leída |
| POST | `/api/rutinas/generar` | Generar rutina guiada desde el perfil |
| GET | `/api/rutinas/actual` | Rutina vigente |
| GET | `/api/recomendaciones` | Recomendaciones personalizadas de ejercicios (máximo 3) |
| GET | `/api/progreso/semanal` | Volumen semanal de las últimas semanas |
| GET | `/api/progreso/comparacion` | Volumen por grupo muscular: últimos 7 días frente a los 7 anteriores |
| GET | `/api/progreso/ejercicio/:id` | Carga máxima y volumen por sesión de un ejercicio |
| GET / POST | `/api/sus/estado`, `/api/sus` | Estado y envío del cuestionario SUS |
| GET | `/api/admin/indicadores` | Indicadores de uso (solo administrador) |
| GET / POST / PUT / DELETE | `/api/admin/ejercicios` | Gestión del catálogo (solo administrador) |
| GET | `/api/ejercicios/:id/alternativas` | Ejercicios alternativos si el equipo está ocupado |
| PATCH | `/api/recomendaciones/:id` | Registrar si la recomendación se aceptó o se descartó |

Todas las rutas, salvo registro y login, piden el encabezado `Authorization: Bearer <token>`.

La carpeta `capturas/` tiene las pantallas de las pruebas de cada sprint en vista móvil.
