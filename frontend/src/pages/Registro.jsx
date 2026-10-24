import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Registro({ entrar }) {
  const [f, setF] = useState({ nombre: "", correo: "", contrasena: "", consentimiento: false });
  const [error, setError] = useState("");
  const enviar = async (e) => {
    e.preventDefault(); setError("");
    try { entrar(await api("/auth/registro", { method: "POST", body: f })); } catch (err) { setError(err.message); }
  };
  return (
    <div className="pantalla-auth">
      <h1>Crear cuenta</h1>
      <form onSubmit={enviar} className="form">
        <label>Nombre completo<input required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
        <label>Correo electrónico<input type="email" required value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} /></label>
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
