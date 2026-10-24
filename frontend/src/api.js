const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const sesionLocal = {
  leer() { try { return JSON.parse(localStorage.getItem("fitsmart_sesion")); } catch { return null; } },
  guardar(v) { try { localStorage.setItem("fitsmart_sesion", JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  borrar() { try { localStorage.removeItem("fitsmart_sesion"); } catch { /* sin almacenamiento */ } },
};

export async function api(ruta, { method = "GET", body } = {}) {
  const s = sesionLocal.leer();
  const r = await fetch(BASE + "/api" + ruta, {
    method,
    headers: { "Content-Type": "application/json", ...(s?.token ? { Authorization: `Bearer ${s.token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401 && s?.token) { sesionLocal.borrar(); window.location.href = "/login"; }
  if (r.status === 204) return null;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "No se pudo completar la operación");
  return data;
}
