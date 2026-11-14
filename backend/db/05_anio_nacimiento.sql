-- HU-02 (ajuste del docente): el perfil guarda el año de nacimiento y el sistema calcula la edad.
-- Se puede ejecutar más de una vez.
ALTER TABLE perfil_entrenamiento ADD COLUMN IF NOT EXISTS anio_nacimiento SMALLINT CHECK (anio_nacimiento BETWEEN 1900 AND 2100);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfil_entrenamiento' AND column_name = 'edad') THEN
    -- Los perfiles existentes pasan su edad a año de nacimiento aproximado
    UPDATE perfil_entrenamiento SET anio_nacimiento = EXTRACT(YEAR FROM CURRENT_DATE)::int - edad
     WHERE anio_nacimiento IS NULL AND edad IS NOT NULL;
    ALTER TABLE perfil_entrenamiento DROP COLUMN edad;
  END IF;
END $$;
