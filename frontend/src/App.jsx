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

function Protegida({ usuario, perfil, setPerfil, salir }) {
  if (!usuario) return <Navigate to="/login" replace />;
  return (
    <div className="app">
      <header className="barra"><span className="marca">FitSmart</span>
        {perfil?.nivel && <span className="nivel">{perfil.nivel}</span>}</header>
      <main className="contenido">
        <Routes>
          <Route path="/" element={perfil?.nivel ? <Inicio perfil={perfil} /> : <Navigate to="/perfil" replace />} />
          <Route path="/catalogo" element={<Catalogo perfil={perfil} />} />
          <Route path="/registrar" element={<Registrar perfil={perfil} />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/perfil" element={<Perfil perfil={perfil} setPerfil={setPerfil} salir={salir} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="nav">
        <NavLink to="/" end>Inicio</NavLink>
        <NavLink to="/catalogo">Catálogo</NavLink>
        <NavLink to="/registrar">Registrar</NavLink>
        <NavLink to="/historial">Historial</NavLink>
        <NavLink to="/perfil">Perfil</NavLink>
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

  const entrar = (data) => { sesionLocal.guardar(data); setUsuario(data.usuario); navigate("/"); };
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
