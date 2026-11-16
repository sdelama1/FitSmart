-- Sprint 3 (HU-13 a HU-16). Se puede ejecutar más de una vez.

-- HU-15: el puntaje SUS se guarda junto con el nivel del usuario al momento de responder (una respuesta por usuario)
ALTER TABLE respuesta_sus ADD COLUMN IF NOT EXISTS nivel VARCHAR(15) CHECK (nivel IN ('principiante', 'intermedio', 'experimentado'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_respuesta_sus_usuario ON respuesta_sus (id_usuario);

-- HU-16: baja lógica de ejercicios; un ejercicio dado de baja deja de mostrarse pero su historial se conserva
ALTER TABLE ejercicio ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
