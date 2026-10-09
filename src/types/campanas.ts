import type { ConfigJuego } from './memorama';

export type IdentificadorCampana = string;

export interface ConfigCampaña extends ConfigJuego {
  id: IdentificadorCampana;
  nombre: string;
  rutasImagenes: ReadonlyArray<string>;
}

export function validarImagenesSuficiente(
  totalPares: number,
  rutasImagenes: ReadonlyArray<string>,
): boolean {
  if (!Number.isSafeInteger(totalPares) || totalPares < 1) {
    throw new Error('totalPares debe ser un entero positivo.');
  }
  const imagenes = rutasImagenes.map((ruta) => ruta.trim());
  if (imagenes.some((ruta) => !ruta)) {
    throw new Error('Las rutas de imágenes no pueden estar vacías.');
  }
  const unicas = new Set(imagenes);
  if (unicas.size !== imagenes.length) {
    throw new Error('Las rutas de imágenes deben ser únicas.');
  }
  if (unicas.size < totalPares) {
    throw new Error(`Se necesitan ${totalPares} imágenes únicas; hay ${unicas.size}.`);
  }
  return true;
}

const configuraciones: Record<string, ConfigCampaña> = {
  'campo-basico': {
    id: 'campo-basico', nombre: 'Campo Básico', totalPares: 4,
    tiempoLimite: 120, maximoIntentos: 10, modoPuntuacion: 'tiempo',
    rutasImagenes: ['/img/emoji1.svg', '/img/emoji2.svg', '/img/emoji3.svg', '/img/emoji4.svg'],
  },
  'campo-avanzado': {
    id: 'campo-avanzado', nombre: 'Campo Avanzado', totalPares: 8,
    tiempoLimite: 180, maximoIntentos: 20, modoPuntuacion: 'hibrido',
    rutasImagenes: Array.from({ length: 8 }, (_, i) => `/img/astro${i + 1}.svg`),
  },
  'campo-personalizado': {
    id: 'campo-personalizado', nombre: 'Campo Personalizado', totalPares: 6,
    tiempoLimite: 0, maximoIntentos: 0, modoPuntuacion: 'tiempo', rutasImagenes: [],
  },
};

/** La campaña personalizada es una plantilla: se valida cuando se le asignen imágenes. */
export function obtenerConfigCampana(identificador: IdentificadorCampana): ConfigCampaña {
  const config = configuraciones[identificador];
  if (!config) throw new Error(`Campaña desconocida: ${identificador}`);
  if (identificador !== 'campo-personalizado') validarImagenesSuficiente(config.totalPares, config.rutasImagenes);
  return { ...config, rutasImagenes: [...config.rutasImagenes] };
}

export function esConfigCampanaValida(config: ConfigCampaña): boolean {
  if (!Number.isSafeInteger(config.totalPares) || config.totalPares < 1) return false;
  if (!Number.isSafeInteger(config.tiempoLimite) || config.tiempoLimite < 0) return false;
  if (!Number.isSafeInteger(config.maximoIntentos) || config.maximoIntentos < 0) return false;
  if (!['tiempo', 'intentos', 'hibrido'].includes(config.modoPuntuacion)) return false;
  if (!config.id.trim() || !config.nombre.trim()) return false;
  try { return validarImagenesSuficiente(config.totalPares, config.rutasImagenes); }
  catch { return false; }
}
