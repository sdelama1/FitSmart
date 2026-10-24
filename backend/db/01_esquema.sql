-- Modelo de datos del módulo inteligente de seguimiento de entrenamientos FitSmart
-- Motor: PostgreSQL 15 o superior
-- Versión 1.0, 24/10/2026

CREATE TABLE usuario (
    id_usuario            SERIAL PRIMARY KEY,
    nombre                VARCHAR(100) NOT NULL,
    correo                VARCHAR(120) NOT NULL UNIQUE,
    contrasena_hash       VARCHAR(255) NOT NULL,              -- bcrypt (RNF-06)
    rol                   VARCHAR(15)  NOT NULL DEFAULT 'usuario'
                          CHECK (rol IN ('usuario', 'administrador')),
    consentimiento_datos  BOOLEAN      NOT NULL DEFAULT FALSE, -- Ley N.º 29733 (RNF-07)
    fecha_registro        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE perfil_entrenamiento (
    id_perfil         SERIAL PRIMARY KEY,
    id_usuario        INT NOT NULL UNIQUE REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    edad              SMALLINT CHECK (edad BETWEEN 14 AND 90),
    sexo              VARCHAR(10) CHECK (sexo IN ('masculino', 'femenino')),
    peso_corporal_kg  NUMERIC(5,2) CHECK (peso_corporal_kg > 0),
    objetivo          VARCHAR(20) CHECK (objetivo IN ('hipertrofia', 'fuerza', 'perdida_grasa', 'resistencia')),
    dias_por_semana   SMALLINT CHECK (dias_por_semana BETWEEN 1 AND 7),
    meses_practica    SMALLINT NOT NULL CHECK (meses_practica >= 0),
    nivel             VARCHAR(15) NOT NULL
                      CHECK (nivel IN ('principiante', 'intermedio', 'experimentado'))  -- RF-03
);

CREATE TABLE ejercicio (
    id_ejercicio         SERIAL PRIMARY KEY,
    nombre               VARCHAR(100) NOT NULL UNIQUE,
    grupo_muscular       VARCHAR(30)  NOT NULL,
    equipo               VARCHAR(30)  NOT NULL,
    tren                 VARCHAR(10)  NOT NULL CHECK (tren IN ('superior', 'inferior')),
    descripcion_tecnica  TEXT,
    url_multimedia       VARCHAR(255)
);

CREATE TABLE rutina (
    id_rutina        SERIAL PRIMARY KEY,
    id_usuario       INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    nombre           VARCHAR(80) NOT NULL,
    nivel            VARCHAR(15) NOT NULL,
    objetivo         VARCHAR(20) NOT NULL,
    dias_por_semana  SMALLINT NOT NULL,
    fecha_creacion   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rutina_ejercicio (
    id_rutina        INT NOT NULL REFERENCES rutina(id_rutina) ON DELETE CASCADE,
    id_ejercicio     INT NOT NULL REFERENCES ejercicio(id_ejercicio),
    dia              SMALLINT NOT NULL CHECK (dia BETWEEN 1 AND 7),
    orden            SMALLINT NOT NULL,
    series_objetivo  SMALLINT NOT NULL CHECK (series_objetivo > 0),
    rep_min          SMALLINT NOT NULL,
    rep_max          SMALLINT NOT NULL CHECK (rep_max >= rep_min),
    PRIMARY KEY (id_rutina, id_ejercicio, dia)
);

CREATE TABLE sesion (
    id_sesion     SERIAL PRIMARY KEY,
    id_usuario    INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_rutina     INT REFERENCES rutina(id_rutina) ON DELETE SET NULL,
    fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
    duracion_min  SMALLINT
);

CREATE TABLE serie (
    id_serie       SERIAL PRIMARY KEY,
    id_sesion      INT NOT NULL REFERENCES sesion(id_sesion) ON DELETE CASCADE,
    id_ejercicio   INT NOT NULL REFERENCES ejercicio(id_ejercicio),
    numero_serie   SMALLINT NOT NULL CHECK (numero_serie > 0),
    repeticiones   SMALLINT NOT NULL CHECK (repeticiones > 0),
    peso_kg        NUMERIC(6,2) NOT NULL CHECK (peso_kg >= 0),
    rpe            SMALLINT CHECK (rpe BETWEEN 1 AND 10),          -- RF-06
    descanso_seg   SMALLINT,                                        -- RF-08
    registrado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recomendacion (
    id_recomendacion        SERIAL PRIMARY KEY,
    id_usuario              INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_ejercicio            INT NOT NULL REFERENCES ejercicio(id_ejercicio),
    fecha                   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    peso_sugerido_kg        NUMERIC(6,2) NOT NULL,                  -- RF-09
    repeticiones_sugeridas  SMALLINT NOT NULL,
    version_modelo          VARCHAR(20) NOT NULL,
    aceptada                BOOLEAN
);

CREATE TABLE alerta (
    id_alerta     SERIAL PRIMARY KEY,
    id_usuario    INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_ejercicio  INT NOT NULL REFERENCES ejercicio(id_ejercicio),
    tipo          VARCHAR(20) NOT NULL DEFAULT 'estancamiento',      -- RF-10
    mensaje       VARCHAR(255) NOT NULL,
    fecha         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leida         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE respuesta_sus (
    id_respuesta  SERIAL PRIMARY KEY,
    id_usuario    INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    fecha         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    item_1  SMALLINT NOT NULL CHECK (item_1  BETWEEN 1 AND 5),
    item_2  SMALLINT NOT NULL CHECK (item_2  BETWEEN 1 AND 5),
    item_3  SMALLINT NOT NULL CHECK (item_3  BETWEEN 1 AND 5),
    item_4  SMALLINT NOT NULL CHECK (item_4  BETWEEN 1 AND 5),
    item_5  SMALLINT NOT NULL CHECK (item_5  BETWEEN 1 AND 5),
    item_6  SMALLINT NOT NULL CHECK (item_6  BETWEEN 1 AND 5),
    item_7  SMALLINT NOT NULL CHECK (item_7  BETWEEN 1 AND 5),
    item_8  SMALLINT NOT NULL CHECK (item_8  BETWEEN 1 AND 5),
    item_9  SMALLINT NOT NULL CHECK (item_9  BETWEEN 1 AND 5),
    item_10 SMALLINT NOT NULL CHECK (item_10 BETWEEN 1 AND 5),
    -- Puntaje SUS de 0 a 100 (RF-16): impares (respuesta - 1), pares (5 - respuesta), suma por 2,5
    puntaje NUMERIC(5,2) GENERATED ALWAYS AS (
        ((item_1 - 1) + (5 - item_2) + (item_3 - 1) + (5 - item_4) + (item_5 - 1) +
         (5 - item_6) + (item_7 - 1) + (5 - item_8) + (item_9 - 1) + (5 - item_10)) * 2.5
    ) STORED
);

CREATE INDEX idx_sesion_usuario_fecha   ON sesion (id_usuario, fecha);
CREATE INDEX idx_serie_ejercicio        ON serie (id_ejercicio, registrado_en);
CREATE INDEX idx_recomendacion_usuario  ON recomendacion (id_usuario, id_ejercicio, fecha);
