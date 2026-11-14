// El usuario indica su año de nacimiento y el sistema calcula la edad; se aceptan edades de 14 a 90 años
const EDAD_MIN = 14, EDAD_MAX = 90;
const edadDesde = (anio, hoy = new Date()) => hoy.getFullYear() - Number(anio);
const anioValido = (anio) => Number.isInteger(Number(anio)) && anio !== "" && anio != null
  && edadDesde(anio) >= EDAD_MIN && edadDesde(anio) <= EDAD_MAX;
const ERROR_ANIO = `El año de nacimiento debe corresponder a una edad entre ${EDAD_MIN} y ${EDAD_MAX} años`;
module.exports = { edadDesde, anioValido, ERROR_ANIO, EDAD_MIN, EDAD_MAX };
