import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Login({ entrar }) {
  const [f, setF] = useState({ correo: "", contrasena: "" });
  const [error, setError] = useState("");
  const enviar = async (e) => {
    e.preventDefault(); setError("");
    try { entrar(await api("/auth/login", { method: "POST", body: f })); } catch (err) { setError(err.message); }
  };
  return (
    <div className="pantalla-auth">
      <img src="/icono.svg" alt="" className="logo" />
      <h1>FitSmart</h1>
      <form onSubmit={enviar} className="form">
        <label>Correo electrónico<input type="email" required value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} /></label>
        <label>Contraseña<input type="password" required value={f.contrasena} onChange={(e) => setF({ ...f, contrasena: e.target.value })} /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn">Iniciar sesión</button>
      </form>
      <Link to="/registro" className="enlace">Crear cuenta nueva</Link>
    </div>
  );
}
