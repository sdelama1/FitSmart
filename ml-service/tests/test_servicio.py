import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi.testclient import TestClient
from main import app

c = TestClient(app)
H = [{"peso_kg": 37.5, "repeticiones": 8, "series": 3, "volumen": 900, "dias_desde_ant": 3},
     {"peso_kg": 40, "repeticiones": 10, "series": 3, "volumen": 1200, "dias_desde_ant": 4}]


def test_sugerencia_respeta_limite_superior():
    r = c.post("/sugerir", json={"historial": H, "tren_inferior": False})
    assert r.status_code == 200
    assert 36 <= r.json()["peso_sugerido_kg"] <= 42.5


def test_sugerencia_respeta_limite_inferior():
    r = c.post("/sugerir", json={"historial": H, "tren_inferior": True})
    assert r.json()["peso_sugerido_kg"] <= 45


def test_redondeo_a_medio_kilo():
    v = c.post("/sugerir", json={"historial": H}).json()["peso_sugerido_kg"]
    assert (v * 2) == int(v * 2)


def test_historial_vacio_rechazado():
    assert c.post("/sugerir", json={"historial": []}).status_code == 422
