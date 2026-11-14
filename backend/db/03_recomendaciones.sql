-- HU-19: recomendación personalizada de ejercicios según el progreso del usuario
-- Se puede ejecutar más de una vez sin duplicar datos (npm run db:init lo aplica también sobre bases existentes)

-- Dificultad del ejercicio (1 básico, 2 intermedio, 3 avanzado) y ejercicio al que se progresa cuando se domina
ALTER TABLE ejercicio ADD COLUMN IF NOT EXISTS dificultad SMALLINT NOT NULL DEFAULT 1 CHECK (dificultad BETWEEN 1 AND 3);
ALTER TABLE ejercicio ADD COLUMN IF NOT EXISTS id_progresion INT REFERENCES ejercicio(id_ejercicio);

-- Ejercicios nuevos que completan las cadenas de progresión
INSERT INTO ejercicio (nombre, grupo_muscular, equipo, tren, descripcion_tecnica, url_multimedia) VALUES
('Flexiones de pecho', 'Pecho', 'Peso corporal', 'superior',
 'Manos algo más abiertas que los hombros y el cuerpo en línea recta de la cabeza a los talones. Baja el pecho hasta casi tocar el suelo con los codos a unos 45 grados del torso y empuja sin hundir la cadera.',
 'https://www.youtube.com/results?search_query=flexiones+de+pecho+tecnica+correcta'),
('Fondos en paralelas', 'Pecho', 'Peso corporal', 'superior',
 'Sujeta las barras con los brazos extendidos e inclina ligeramente el torso hacia adelante. Baja flexionando los codos hasta que los hombros queden a la altura de los codos y sube sin balancear las piernas.',
 'https://www.youtube.com/results?search_query=fondos+en+paralelas+tecnica+correcta'),
('Dominadas', 'Espalda', 'Peso corporal', 'superior',
 'Agarre prono algo más abierto que los hombros. Desde los brazos extendidos, lleva el pecho hacia la barra juntando las escápulas hasta pasar la barbilla y baja controlado sin balancearte.',
 'https://www.youtube.com/results?search_query=dominadas+tecnica+correcta'),
('Sentadilla goblet', 'Piernas', 'Mancuernas', 'inferior',
 'Sostén una mancuerna vertical pegada al pecho con los pies a la anchura de los hombros. Baja llevando la cadera atrás y abajo con la espalda recta y las rodillas en la dirección de los pies, y sube empujando con todo el pie.',
 'https://www.youtube.com/results?search_query=sentadilla+goblet+tecnica+correcta'),
('Peso muerto convencional', 'Piernas', 'Barra', 'inferior',
 'Pies a la anchura de la cadera con la barra sobre la mitad del pie. Toma la barra con la espalda recta y el pecho alto, empuja el suelo con las piernas y extiende la cadera manteniendo la barra pegada al cuerpo.',
 'https://www.youtube.com/results?search_query=peso+muerto+convencional+tecnica+correcta'),
('Press militar con barra', 'Hombros', 'Barra', 'superior',
 'De pie, barra apoyada en la parte alta del pecho y abdomen firme. Empuja la barra en línea recta por encima de la cabeza apartando la cara y bloquea los brazos sin arquear la zona lumbar.',
 'https://www.youtube.com/results?search_query=press+militar+con+barra+tecnica+correcta'),
('Elevación de piernas colgado', 'Core', 'Peso corporal', 'superior',
 'Cuelga de la barra con los brazos extendidos. Eleva las piernas rectas o con las rodillas flexionadas hasta la altura de la cadera usando el abdomen y bájalas despacio sin balancearte.',
 'https://www.youtube.com/results?search_query=elevacion+de+piernas+colgado+tecnica')
ON CONFLICT (nombre) DO NOTHING;

-- Dificultad de cada ejercicio
UPDATE ejercicio SET dificultad = 1 WHERE nombre IN ('Flexiones de pecho', 'Aperturas en máquina', 'Fondos asistidos', 'Jalón al pecho',
  'Remo sentado en polea', 'Sentadilla goblet', 'Prensa de piernas', 'Extensión de cuádriceps', 'Elevaciones laterales',
  'Curl de bíceps con barra', 'Extensión de tríceps en polea', 'Plancha abdominal');
UPDATE ejercicio SET dificultad = 2 WHERE nombre IN ('Press inclinado con mancuernas', 'Press de banca', 'Remo con barra',
  'Sentadilla con barra', 'Peso muerto rumano', 'Press militar con mancuernas');
UPDATE ejercicio SET dificultad = 3 WHERE nombre IN ('Fondos en paralelas', 'Dominadas', 'Peso muerto convencional',
  'Press militar con barra', 'Elevación de piernas colgado');

-- Cadenas de progresión: al dominar el ejercicio de la izquierda se recomienda el de la derecha
UPDATE ejercicio e SET id_progresion = s.id_ejercicio FROM ejercicio s, (VALUES
  ('Flexiones de pecho', 'Press inclinado con mancuernas'),
  ('Press inclinado con mancuernas', 'Press de banca'),
  ('Fondos asistidos', 'Fondos en paralelas'),
  ('Jalón al pecho', 'Dominadas'),
  ('Remo sentado en polea', 'Remo con barra'),
  ('Sentadilla goblet', 'Sentadilla con barra'),
  ('Prensa de piernas', 'Sentadilla con barra'),
  ('Peso muerto rumano', 'Peso muerto convencional'),
  ('Press militar con mancuernas', 'Press militar con barra'),
  ('Plancha abdominal', 'Elevación de piernas colgado')
) AS p(origen, destino)
WHERE e.nombre = p.origen AND s.nombre = p.destino;

-- Registro de las recomendaciones mostradas y de la respuesta del usuario
CREATE TABLE IF NOT EXISTS recomendacion_ejercicio (
    id_rec_ejercicio  SERIAL PRIMARY KEY,
    id_usuario        INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_ejercicio      INT NOT NULL REFERENCES ejercicio(id_ejercicio),
    tipo              VARCHAR(15) NOT NULL CHECK (tipo IN ('progresion', 'variante', 'equilibrio', 'nuevo')),
    motivo            VARCHAR(255) NOT NULL,
    fecha             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado            VARCHAR(12) CHECK (estado IN ('aceptada', 'descartada'))
);
CREATE INDEX IF NOT EXISTS idx_rec_ejercicio_usuario ON recomendacion_ejercicio (id_usuario, fecha);
