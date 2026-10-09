import type { ConfigJuego } from '../../types/memorama';

export interface OpcionesPuntuacion {
  modo: ConfigJuego['modoPuntuacion'];
  factorTiempo?: number;
  factorIntentos?: number;
  baseFinal?: number;
  tiempoLimite: number;
  maximoIntentos: number;
  tiempoTranscurrido: number;
}

/** Puntuación pura y determinista. No consulta reloj, DOM ni almacenamiento. */
export function calcularPuntuacion(
  estado: { paresEncontrados: number; intentosRealizados: number },
  opciones: OpcionesPuntuacion,
): number {
  const {
    modo, factorTiempo = 1, factorIntentos = 10, baseFinal = 1000,
    tiempoLimite, maximoIntentos, tiempoTranscurrido,
  } = opciones;
  const numeros = [factorTiempo, factorIntentos, baseFinal, tiempoLimite, maximoIntentos,
    tiempoTranscurrido, estado.paresEncontrados, estado.intentosRealizados];
  if (numeros.some((n) => !Number.isFinite(n) || n < 0)) {
    throw new Error('Los valores de puntuación deben ser números finitos no negativos.');
  }
  if (!['tiempo', 'intentos', 'hibrido'].includes(modo)) throw new Error('Modo de puntuación inválido.');

  // Sin límite de tiempo no hay bonificación de tiempo.
  const bonusTiempo = tiempoLimite > 0
    ? Math.floor((Math.max(0, tiempoLimite - tiempoTranscurrido) / tiempoLimite) * factorTiempo)
    : 0;
  // Sin límite de intentos no hay penalización por intentos.
  const penalizacion = maximoIntentos > 0
    ? Math.floor((estado.intentosRealizados / maximoIntentos) * factorIntentos * baseFinal / 100)
    : 0;
  const puntos = modo === 'tiempo' ? baseFinal + bonusTiempo
    : modo === 'intentos' ? baseFinal - penalizacion
    : baseFinal + bonusTiempo - penalizacion;
  return Math.max(0, Math.round(puntos));
}

export interface RegistroRecord {
  nombre: string;
  puntuacion: number;
  fecha: string;
}

/** Conserva el récord anterior en caso de empate; fecha inyectada para determinismo. */
export function actualizarMejorRécord(
  anterior: RegistroRecord | null,
  nombre: string,
  puntuacion: number,
  fecha: string,
): RegistroRecord {
  if (!Number.isFinite(puntuacion) || puntuacion < 0) throw new Error('Puntuación inválida.');
  if (!nombre.trim() || !fecha.trim()) throw new Error('Nombre y fecha son obligatorios.');
  if (anterior && anterior.puntuacion >= puntuacion) return anterior;
  return { nombre, puntuacion, fecha };
}
