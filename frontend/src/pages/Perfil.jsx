import { useState } from "react";
import { api } from "../api.js";

const OBJETIVOS = [["hipertrofia", "Aumento de masa muscular"], ["fuerza", "Fuerza"], ["perdida_grasa", "Pérdida de grasa"], ["resistencia", "Resistencia"]];
const ANIO = new Date().getFullYear();
const ANIOS = Array.from({ length: 77 }, (_, i) => ANIO - 14 - i); // edades de 14 a 90 años
const nivelDe = (m) => (m === "" || m == null ? "" : m < 6 ? "principiante" : m < 12 ? "intermedio" : "experimentado");

export default function Perfil({ perfil, setPerfil, salir }) {
  const [f, setF] = useState({
    anio_nacimiento: perfil?.anio_nacimiento ?? "", sexo: perfil?.sexo ?? "", peso_corporal_kg: perfil?.peso_corporal_kg ?? "",
    objetivo: perfil?.objetivo ?? "", dias_por_semana: perfil?.dias_por_semana ?? 3, meses_practica: perfil?.meses_practica ?? "",
  });
  const [msg, setMsg] = useState(""); const [error, setError] = useState("");
  const num = (k) => (e) => setF({ ...f, [k]: e.target.value === "" ? "" : Number(e.target.value) });
  const guardar = async (e) => {
    e.preventDefault(); setMsg(""); setError("");
    try { const p = await api("/perfil", { method: "PUT", body: f }); setPerfil({ ...perfil, ...p }); setMsg("Perfil guardado"); }
    catch (err) { setError(err.message); }
  };
  return (
    <section className="angosta">
      <h2>Mi perfil</h2>
      {!perfil?.nivel && <p className="aviso">Completa tu perfil para empezar a registrar entrenamientos.</p>}
      <form onSubmit={guardar} className="form">
        <div className="fila2">
          <label>Año de nacimiento<select required value={f.anio_nacimiento} onChange={num("anio_nacimiento")}>
            <option value="">Selecciona</option>{ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
          <label>Peso corporal (kg)<input type="number" step="0.1" min="1" required value={f.peso_corporal_kg} onChange={num("peso_corporal_kg")} /></label>
        </div>
        <label>Sexo<select required value={f.sexo} onChange={(e) => setF({ ...f, sexo: e.target.value })}>
          <option value="">Selecciona</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option></select></label>
        <label>Objetivo<select required value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })}>
          <option value="">Selecciona</option>{OBJETIVOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        <label>Meses entrenando en gimnasio<input type="number" min="0" required value={f.meses_practica} onChange={num("meses_practica")} /></label>
        <div><span className="etq">Días por semana</span>
          <div className="dias">{[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button type="button" key={d} className={f.dias_por_semana === d ? "dia activo" : "dia"} onClick={() => setF({ ...f, dias_por_semana: d })}>{d}</button>))}</div></div>
        {nivelDe(f.meses_practica) && <div className="caja-nivel">Nivel asignado: <b>{nivelDe(f.meses_practica)}</b></div>}
        {error && <p className="error">{error}</p>}{msg && <p className="ok">{msg}</p>}
        <button className="btn">Guardar perfil</button>
      </form>
      <button className="btn sec" onClick={salir}>Cerrar sesión</button>
    </section>
  );
}
