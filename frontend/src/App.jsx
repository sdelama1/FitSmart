import { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { api, sesionLocal } from "./api.js";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import Perfil from "./pages/Perfil.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import Registrar from "./pages/Registrar.jsx";
import Historial from "./pages/Historial.jsx";
import Inicio from "./pages/Inicio.jsx";

// Íconos de la navegación (trazos simples para no depender de librerías externas)
const ICONOS = {
  inicio: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  catalogo: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  registrar: <><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" /></>,
  historial: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
};
const Icono = ({ n }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONOS[n]}</svg>;
const Marca = ({ clase }) => <span className={clase}>FIT<span>SMART</span></span>;

function Protegida({ usuario, perfil, setPerfil, salir }) {
  if (!usuario) return <Navigate to="/login" replace />;
  return (
    <div className="app">
      <header className="barra"><Marca clase="marca" />
        {perfil?.nivel && <span className="nivel">{perfil.nivel}</span>}</header>
      <main className="contenido">
        <Routes>
          <Route path="/" element={perfil?.nivel ? <Inicio perfil={perfil} usuario={usuario} /> : <Navigate to="/perfil" replace />} />
          <Route path="/catalogo" element={<Catalogo perfil={perfil} />} />
          <Route path="/registrar" element={<Registrar perfil={perfil} />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/perfil" element={<Perfil perfil={perfil} setPerfil={setPerfil} salir={salir} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="nav">
        <Marca clase="nav-marca" />
        <NavLink to="/" end><Icono n="inicio" />Inicio</NavLink>
        <NavLink to="/catalogo"><Icono n="catalogo" />Catálogo</NavLink>
        <NavLink to="/registrar"><Icono n="registrar" />Registrar</NavLink>
        <NavLink to="/historial"><Icono n="historial" />Historial</NavLink>
        <NavLink to="/perfil"><Icono n="perfil" />Perfil</NavLink>
        <div className="nav-usuario"><span className="avatar">{usuario.nombre?.[0]?.toUpperCase() || "U"}</span>
          <div>{usuario.nombre?.split(" ")[0]}<small>{perfil?.nivel || "Sin perfil"}</small></div></div>
      </nav>
    </div>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(() => sesionLocal.leer()?.usuario || null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(!!usuario);
  const navigate = useNavigate();

  useEffect(() => {
    if (!usuario) return;
    setCargando(true);
    api("/perfil").then(setPerfil).catch(() => setPerfil(null)).finally(() => setCargando(false));
  }, [usuario]);

  // Se marca la carga antes de navegar para no redirigir a Perfil mientras llega el perfil del usuario
  const entrar = (data) => { setCargando(true); sesionLocal.guardar(data); setUsuario(data.usuario); navigate("/"); };
  const salir = () => { sesionLocal.borrar(); setUsuario(null); setPerfil(null); navigate("/login"); };

  if (cargando) return <div className="cargando">Cargando…</div>;
  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login entrar={entrar} />} />
      <Route path="/registro" element={usuario ? <Navigate to="/" replace /> : <Registro entrar={entrar} />} />
      <Route path="/*" element={<Protegida usuario={usuario} perfil={perfil} setPerfil={setPerfil} salir={salir} />} />
    </Routes>
  );
}
