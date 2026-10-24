"""HU-09: entrena el modelo inteligente de FitSmart.
Uso: python entrenar.py  (lee los CSV de Strong o Hevy de la carpeta datos/)
Misma lógica que el notebook 1.4.1_Entrenamiento_modelo_FitSmart.ipynb."""
import json, glob, os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error

BASE = os.path.dirname(os.path.abspath(__file__))
CARPETA_DATOS = os.path.join(BASE, "datos")        # carpeta con los CSV de Strong o Hevy
PROPORCION_PRUEBA = 0.20       # 80 % entrenamiento, 20 % validación
MAX_DIAS_ENTRE_SESIONES = 60   # se descartan pares de sesiones muy separadas
LIMITE_SUPERIOR_KG = 2.5       # aumento máximo en tren superior
LIMITE_INFERIOR_KG = 5.0       # aumento máximo en tren inferior
SEMILLA = 42

def leer_strong(ruta):
    d = pd.read_csv(ruta)
    col_peso = [c for c in d.columns if c.lower().startswith("weight")][0]
    factor = 0.453592 if "lb" in col_peso.lower() else 1.0
    return pd.DataFrame({
        "fecha": pd.to_datetime(d["Date"], format="mixed"),
        "ejercicio": d["Exercise Name"].astype(str).str.strip(),
        "serie": d["Set Order"],
        "peso_kg": pd.to_numeric(d[col_peso], errors="coerce") * factor,
        "repeticiones": pd.to_numeric(d["Reps"], errors="coerce"),
        "rpe": pd.to_numeric(d["RPE"], errors="coerce") if "RPE" in d.columns else np.nan,
        "tipo_serie": "normal",
    })

def leer_hevy(ruta):
    d = pd.read_csv(ruta)
    peso = d["weight_kg"] if "weight_kg" in d.columns else d["weight_lbs"] * 0.453592
    return pd.DataFrame({
        "fecha": pd.to_datetime(d["start_time"], format="mixed", dayfirst=True),
        "ejercicio": d["exercise_title"].astype(str).str.strip(),
        "serie": d["set_index"],
        "peso_kg": pd.to_numeric(peso, errors="coerce"),
        "repeticiones": pd.to_numeric(d["reps"], errors="coerce"),
        "rpe": pd.to_numeric(d["rpe"], errors="coerce") if "rpe" in d.columns else np.nan,
        "tipo_serie": d["set_type"].fillna("normal") if "set_type" in d.columns else "normal",
    })

def cargar_todo(carpeta):
    partes = []
    for i, ruta in enumerate(sorted(glob.glob(os.path.join(carpeta, "*.csv")))):
        cab = pd.read_csv(ruta, nrows=0).columns
        if "Exercise Name" in cab:
            df = leer_strong(ruta)
        elif "exercise_title" in cab:
            df = leer_hevy(ruta)
        else:
            print("Formato no reconocido, se omite:", ruta)
            continue
        df["usuario"] = f"U{i+1}"
        partes.append(df)
        print(f"{os.path.basename(ruta)}: {len(df)} series")
    return pd.concat(partes, ignore_index=True)

datos = cargar_todo(CARPETA_DATOS)

PALABRAS_INFERIOR = ["squat", "sentadilla", "deadlift", "peso muerto", "leg", "pierna", "lunge", "zancada",
                     "hip thrust", "calf", "gemelo", "clean", "snatch", "glute", "hamstring", "femoral", "cuadriceps"]

def es_inferior(nombre):
    n = nombre.lower()
    return int(any(p in n for p in PALABRAS_INFERIOR))

limpio = datos[(datos["tipo_serie"].str.lower() != "warmup") & (datos["peso_kg"] > 0) & (datos["repeticiones"] > 0)].copy()
limpio["tren_inferior"] = limpio["ejercicio"].map(es_inferior)
sesiones_por_ej = limpio.groupby(["usuario", "ejercicio"])["fecha"].nunique()
validos = sesiones_por_ej[sesiones_por_ej >= 5].index
limpio = limpio.set_index(["usuario", "ejercicio"]).loc[validos].reset_index()
print(f"Series válidas: {len(limpio)} | usuarios: {limpio['usuario'].nunique()} | ejercicios: {limpio['ejercicio'].nunique()}")

limpio["dia"] = limpio["fecha"].dt.floor("D")
limpio["volumen"] = limpio["peso_kg"] * limpio["repeticiones"]
idx_top = limpio.groupby(["usuario", "ejercicio", "dia"])["peso_kg"].idxmax()
top = limpio.loc[idx_top, ["usuario", "ejercicio", "dia", "peso_kg", "repeticiones"]]
agg = limpio.groupby(["usuario", "ejercicio", "dia"]).agg(
    series=("serie", "count"), volumen=("volumen", "sum"), rpe=("rpe", "mean"), tren_inferior=("tren_inferior", "first")).reset_index()
s = agg.merge(top, on=["usuario", "ejercicio", "dia"]).sort_values(["usuario", "ejercicio", "dia"])

g = s.groupby(["usuario", "ejercicio"])
s["peso_ant1"] = g["peso_kg"].shift(1)
s["peso_ant2"] = g["peso_kg"].shift(2)
s["reps_ant1"] = g["repeticiones"].shift(1)
s["delta_previo"] = s["peso_kg"] - s["peso_ant1"]
s["dias_desde_ant"] = g["dia"].diff().dt.days
s["n_sesion"] = g.cumcount() + 1
s["peso_sig"] = g["peso_kg"].shift(-1)
s["dias_hasta_sig"] = (g["dia"].shift(-1) - s["dia"]).dt.days
s["objetivo"] = s["peso_sig"] - s["peso_kg"]

VARIABLES = ["peso_kg", "repeticiones", "series", "volumen", "rpe", "tren_inferior",
             "peso_ant1", "peso_ant2", "reps_ant1", "delta_previo", "dias_desde_ant", "n_sesion"]
modelo_df = s[s["objetivo"].notna() & (s["dias_hasta_sig"] <= MAX_DIAS_ENTRE_SESIONES)].copy()
print("Pares sesión actual / sesión siguiente:", len(modelo_df))

modelo_df["orden"] = modelo_df.groupby(["usuario", "ejercicio"]).cumcount()
modelo_df["total"] = modelo_df.groupby(["usuario", "ejercicio"])["orden"].transform("max") + 1
es_prueba = modelo_df["orden"] >= np.floor(modelo_df["total"] * (1 - PROPORCION_PRUEBA))
entreno, prueba = modelo_df[~es_prueba], modelo_df[es_prueba]
print(f"Entrenamiento: {len(entreno)} | Validación: {len(prueba)}")

def aplicar_limites(delta, peso, inferior):
    tope = np.where(inferior == 1, LIMITE_INFERIOR_KG, LIMITE_SUPERIOR_KG)
    return np.clip(delta, -0.10 * peso, tope)

real = prueba["objetivo"].values
base_mismo = np.zeros(len(prueba))
base_regla = np.where(prueba["repeticiones"] >= 10, np.where(prueba["tren_inferior"] == 1, LIMITE_INFERIOR_KG, LIMITE_SUPERIOR_KG), 0.0)
mae_mismo = mean_absolute_error(real, base_mismo)
mae_regla = mean_absolute_error(real, base_regla)
print(f"MAE repetir peso: {mae_mismo:.2f} kg | MAE regla de doble progresión: {mae_regla:.2f} kg")

modelo = HistGradientBoostingRegressor(max_iter=300, learning_rate=0.05, max_depth=4, min_samples_leaf=10, random_state=SEMILLA)
# Se excluyen variables sin ningún dato (por ejemplo, el RPE cuando la app no lo registró)
VARIABLES = [v for v in VARIABLES if entreno[v].notna().any()]
print("Variables usadas:", VARIABLES)
modelo.fit(entreno[VARIABLES], entreno["objetivo"])
pred = aplicar_limites(modelo.predict(prueba[VARIABLES]), prueba["peso_kg"].values, prueba["tren_inferior"].values)
mae_modelo = mean_absolute_error(real, pred)
print(f"MAE del modelo (con límites): {mae_modelo:.2f} kg")

SALIDA = os.path.join(BASE, "salida")
os.makedirs(SALIDA, exist_ok=True)
joblib.dump({"modelo": modelo, "variables": VARIABLES, "limite_superior": LIMITE_SUPERIOR_KG, "limite_inferior": LIMITE_INFERIOR_KG, "version": "hgb-1.0"},
            os.path.join(SALIDA, "modelo_fitsmart.joblib"))
reporte = {
    "usuarios": int(limpio["usuario"].nunique()), "ejercicios": int(limpio["ejercicio"].nunique()),
    "series_validas": int(len(limpio)), "pares_entrenamiento": int(len(entreno)), "pares_validacion": int(len(prueba)),
    "mae_repetir_peso_kg": round(float(mae_mismo), 3), "mae_regla_doble_progresion_kg": round(float(mae_regla), 3),
    "mae_modelo_kg": round(float(mae_modelo), 3),
    "version_modelo": "hgb-1.0",
}
with open(os.path.join(SALIDA, "reporte_metricas.json"), "w", encoding="utf-8") as f:
    json.dump(reporte, f, ensure_ascii=False, indent=2)
print(json.dumps(reporte, ensure_ascii=False, indent=2))
