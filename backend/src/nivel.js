// HU-03: clasificación del nivel de experiencia según los meses de práctica
function clasificarNivel(mesesPractica) {
  const m = Number(mesesPractica);
  if (!Number.isFinite(m) || m < 0) throw new Error("meses_practica inválido");
  if (m < 6) return "principiante";
  if (m < 12) return "intermedio";
  return "experimentado";
}
module.exports = { clasificarNivel };
