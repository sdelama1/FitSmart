-- HU-01 (ajuste del docente): el año de nacimiento se pide al registrarse y se guarda en el usuario.
-- Se puede ejecutar más de una vez.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS anio_nacimiento SMALLINT CHECK (anio_nacimiento BETWEEN 1900 AND 2100);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfil_entrenamiento' AND column_name = 'anio_nacimiento') THEN
    UPDATE usuario u SET anio_nacimiento = p.anio_nacimiento FROM perfil_entrenamiento p
     WHERE p.id_usuario = u.id_usuario AND u.anio_nacimiento IS NULL;
    ALTER TABLE perfil_entrenamiento DROP COLUMN anio_nacimiento;
  END IF;
END $$;
