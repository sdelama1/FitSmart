import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

// El usuario indica su año de nacimiento y el sistema calcula la edad (14 a 90 años)
const ANIO = new Date().getFullYear();
const ANIOS = Array.from({ length: 77 }, (_, i) => ANIO - 14 - i);

export default function Registro({ entrar }) {
  const [f, setF] = useState({ nombre: "", correo: "", contrasena: "", anio_nacimiento: "", consentimiento: false });
  const [error, setError] = useState("");
  const enviar = async (e) => {
    e.preventDefault(); setError("");
    try { entrar(await api("/auth/registro", { method: "POST", body: { ...f, anio_nacimiento: Number(f.anio_nacimiento) } })); } catch (err) { setError(err.message); }
  };
  return (
    <div className="pantalla-auth">
      <h1>Crear cuenta</h1>
      <form onSubmit={enviar} className="form">
        <label>Nombre completo<input required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
        <label>Correo electrónico<input type="email" required value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} /></label>
        <label>Año de nacimiento<select name="anio_nacimiento" required value={f.anio_nacimiento} onChange={(e) => setF({ ...f, anio_nacimiento: e.target.value })}>
          <option value="">Selecciona</option>{ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
        <label>Contraseña (mínimo 8 caracteres)<input type="password" required minLength={8} value={f.contrasena} onChange={(e) => setF({ ...f, contrasena: e.target.value })} /></label>
        <label className="check"><input type="checkbox" checked={f.consentimiento} onChange={(e) => setF({ ...f, consentimiento: e.target.checked })} />
          Acepto el tratamiento de mis datos personales (Ley N.º 29733)</label>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={!f.consentimiento}>Crear cuenta</button>
      </form>
      <Link to="/login" className="enlace">Ya tengo cuenta</Link>
    </div>
  );
}
