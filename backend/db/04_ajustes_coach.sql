-- Ajustes por la revisión de un entrenador de sala (HU-20 a HU-23). Se puede ejecutar más de una vez.

-- HU-23: series de calentamiento; se guardan pero no entran en los cálculos (sugerencia, precarga, volumen, alertas)
ALTER TABLE serie ADD COLUMN IF NOT EXISTS calentamiento BOOLEAN NOT NULL DEFAULT FALSE;

-- HU-22: incremento de carga propio de cada ejercicio (kg). Los ejercicios pequeños suben de a 1 kg
ALTER TABLE ejercicio ADD COLUMN IF NOT EXISTS incremento_kg NUMERIC(3,1) NOT NULL DEFAULT 2.5 CHECK (incremento_kg > 0);
UPDATE ejercicio SET incremento_kg = 5 WHERE tren = 'inferior' AND equipo IN ('Barra', 'Máquina') AND nombre <> 'Extensión de cuádriceps';
UPDATE ejercicio SET incremento_kg = 2.5 WHERE nombre = 'Extensión de cuádriceps';
UPDATE ejercicio SET incremento_kg = 2 WHERE nombre IN ('Press inclinado con mancuernas', 'Press militar con mancuernas', 'Sentadilla goblet');
UPDATE ejercicio SET incremento_kg = 1 WHERE nombre IN ('Elevaciones laterales', 'Curl de bíceps con barra', 'Extensión de tríceps en polea');
