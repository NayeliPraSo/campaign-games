import { EstadoJuegoEnum } from '../../types/memorama';
import type { Carta, ConfigJuego, EstadoJuego } from '../../types/memorama';
import type { ConfigCampaña } from '../../types/campanas';
import { esConfigCampanaValida } from '../../types/campanas';

export type GeneradorRandom = () => number;
const randomDefault: GeneradorRandom = () => Math.random();

/** Crea parejas en orden; barajarCartas aplica la aleatoriedad separadamente. */
export function generarCartas(config: ConfigCampaña): Carta[] {
  if (!esConfigCampanaValida(config)) throw new Error('Configuración de campaña inválida.');
  return config.rutasImagenes.slice(0, config.totalPares).flatMap((imagen, indice) => {
    const parejaId = `pareja-${indice}`;
    return [0, 1].map((copia): Carta => ({
      id: indice * 2 + copia, parejaId, imagen, estaVolteada: false, emparejada: false,
    }));
  });
}

export function barajarCartas(cartas: ReadonlyArray<Carta>, randomFunc: GeneradorRandom = randomDefault): Carta[] {
  const resultado = [...cartas];
  for (let i = resultado.length - 1; i > 0; i--) {
    const aleatorio = randomFunc();
    if (!Number.isFinite(aleatorio) || aleatorio < 0 || aleatorio >= 1) {
      throw new Error('El generador aleatorio debe devolver un número en [0, 1).');
    }
    const j = Math.floor(aleatorio * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }
  return resultado;
}

export function inicializarEstado(cartas: ReadonlyArray<Carta>, config: ConfigJuego): EstadoJuego {
  if (!Number.isSafeInteger(config.totalPares) || config.totalPares < 1 || cartas.length !== config.totalPares * 2) {
    throw new Error('La baraja no corresponde al número de parejas configurado.');
  }
  const conteos = new Map<string, number>();
  const ids = new Set<number>();
  for (const carta of cartas) {
    if (ids.has(carta.id)) throw new Error('Hay IDs de carta repetidos.');
    ids.add(carta.id);
    conteos.set(carta.parejaId, (conteos.get(carta.parejaId) ?? 0) + 1);
  }
  if (conteos.size !== config.totalPares || [...conteos.values()].some((n) => n !== 2)) {
    throw new Error('Cada pareja debe contener exactamente dos cartas.');
  }
  return {
    estadoGeneral: EstadoJuegoEnum.Preparado,
    cartas: cartas.map((carta) => ({ ...carta, estaVolteada: false, emparejada: false })),
    paresEncontrados: 0, intentosRealizados: 0, cartasSeleccionadas: [], turnoBloqueado: false,
  };
}

export function comenzarPartida(estado: EstadoJuego): EstadoJuego {
  if (estado.estadoGeneral !== EstadoJuegoEnum.Preparado) {
    throw new Error('Solo puede comenzar una partida preparada.');
  }
  return {
    ...estado, estadoGeneral: EstadoJuegoEnum.Jugando,
    cartas: estado.cartas.map((carta) => ({ ...carta, estaVolteada: false, emparejada: false })),
    paresEncontrados: 0, intentosRealizados: 0, cartasSeleccionadas: [], turnoBloqueado: false,
  };
}
