"""HU-10: servicio del modelo inteligente (FastAPI).
Uso: uvicorn main:app --port 8000
Recibe el historial de un ejercicio y devuelve el peso sugerido para la siguiente sesión."""
import os
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

RUTA_MODELO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida", "modelo_fitsmart.joblib")
app = FastAPI(title="FitSmart · servicio del modelo inteligente")
_paquete = None


def paquete():
    global _paquete
    if _paquete is None:
        if not os.path.exists(RUTA_MODELO):
            raise HTTPException(503, "Modelo no entrenado: ejecuta python entrenar.py")
        _paquete = joblib.load(RUTA_MODELO)
    return _paquete


class Sesion(BaseModel):
    peso_kg: float = Field(ge=0)
    repeticiones: int = Field(gt=0)
    series: int = Field(gt=0)
    volumen: float = Field(ge=0)
    rpe: Optional[float] = None
    dias_desde_ant: Optional[float] = None


class Solicitud(BaseModel):
    historial: List[Sesion] = Field(min_length=1, description="Sesiones del ejercicio, de la más antigua a la más reciente")
    tren_inferior: bool = False


def construir_fila(historial: List[Sesion], inferior: bool) -> dict:
    act = historial[-1]
    ant1 = historial[-2] if len(historial) > 1 else None
    ant2 = historial[-3] if len(historial) > 2 else None
    return {
        "peso_kg": act.peso_kg, "repeticiones": act.repeticiones, "series": act.series, "volumen": act.volumen,
        "rpe": act.rpe if act.rpe is not None else np.nan, "tren_inferior": int(inferior),
        "peso_ant1": ant1.peso_kg if ant1 else np.nan, "peso_ant2": ant2.peso_kg if ant2 else np.nan,
        "reps_ant1": ant1.repeticiones if ant1 else np.nan,
        "delta_previo": act.peso_kg - ant1.peso_kg if ant1 else np.nan,
        "dias_desde_ant": act.dias_desde_ant if act.dias_desde_ant is not None else np.nan,
        "n_sesion": len(historial),
    }


@app.get("/salud")
def salud():
    return {"estado": "ok", "modelo_cargado": os.path.exists(RUTA_MODELO)}


@app.post("/sugerir")
def sugerir(s: Solicitud):
    p = paquete()
    fila = pd.DataFrame([construir_fila(s.historial, s.tren_inferior)])[p["variables"]]
    delta = float(p["modelo"].predict(fila)[0])
    actual = s.historial[-1].peso_kg
    tope = p["limite_inferior"] if s.tren_inferior else p["limite_superior"]
    delta = float(np.clip(delta, -0.10 * actual, tope))  # límites de seguridad
    sugerido = round((actual + delta) * 2) / 2            # redondeo a 0,5 kg
    return {"peso_sugerido_kg": sugerido, "delta_kg": round(sugerido - actual, 2), "version_modelo": p.get("version", "hgb-1.0")}
