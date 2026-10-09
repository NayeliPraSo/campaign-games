import { EstadoJuegoEnum } from '../../types/memorama';
import type { ConfigJuego, EstadoJuego, ResultadoMovimiento } from '../../types/memorama';

export function esMovimientoValido(estado: EstadoJuego, cartaId: number): boolean {
  if (estado.estadoGeneral !== EstadoJuegoEnum.Jugando || estado.turnoBloqueado) return false;
  if (estado.cartasSeleccionadas.length >= 2 || estado.cartasSeleccionadas.includes(cartaId)) return false;
  const carta = estado.cartas.find((c) => c.id === cartaId);
  return !!carta && !carta.emparejada && !carta.estaVolteada;
}

/** Selecciona una carta, sin resolver todavía el par. */
export function procesarSeleccionCarta(
  cartaId: number, estado: EstadoJuego,
): { nuevoEstado: EstadoJuego; resultadoInmediato: 'seleccion' | 'bloqueado' | 'invalido' } {
  if (!esMovimientoValido(estado, cartaId)) {
    return {
      nuevoEstado: estado,
      resultadoInmediato: estado.turnoBloqueado || estado.estadoGeneral !== EstadoJuegoEnum.Jugando
        ? 'bloqueado' : 'invalido',
    };
  }
  const seleccionadas = [...estado.cartasSeleccionadas, cartaId];
  return {
    nuevoEstado: {
      ...estado,
      cartas: estado.cartas.map((carta) => carta.id === cartaId ? { ...carta, estaVolteada: true } : carta),
      cartasSeleccionadas: seleccionadas,
      turnoBloqueado: seleccionadas.length === 2,
    },
    resultadoInmediato: 'seleccion',
  };
}

/** Resuelve el par previamente seleccionado; no usa temporizadores. */
export function resolverTurno(
  carta1Id: number, carta2Id: number, estado: EstadoJuego, config: ConfigJuego,
): { nuevoEstado: EstadoJuego; resultado: ResultadoMovimiento } {
  const seleccionadas = estado.cartasSeleccionadas;
  if (estado.estadoGeneral !== EstadoJuegoEnum.Jugando || !estado.turnoBloqueado ||
      seleccionadas.length !== 2 || carta1Id === carta2Id ||
      !seleccionadas.includes(carta1Id) || !seleccionadas.includes(carta2Id)) {
    throw new Error('No hay un turno completo válido para resolver.');
  }
  const carta1 = estado.cartas.find((c) => c.id === carta1Id);
  const carta2 = estado.cartas.find((c) => c.id === carta2Id);
  if (!carta1 || !carta2 || carta1.emparejada || carta2.emparejada ||
      !carta1.estaVolteada || !carta2.estaVolteada) {
    throw new Error('Las cartas del turno no son válidas.');
  }
  const nuevosIntentos = estado.intentosRealizados + 1;
  if (carta1.parejaId === carta2.parejaId) {
    const paresEncontrados = estado.paresEncontrados + 1;
    const gano = paresEncontrados >= config.totalPares;
    return {
      nuevoEstado: {
        ...estado,
        cartas: estado.cartas.map((c) => c.id === carta1Id || c.id === carta2Id
          ? { ...c, emparejada: true, estaVolteada: true } : c),
        paresEncontrados, intentosRealizados: nuevosIntentos,
        cartasSeleccionadas: [], turnoBloqueado: false,
        estadoGeneral: gano ? EstadoJuegoEnum.Ganado : EstadoJuegoEnum.Jugando,
      },
      resultado: gano ? { tipo: 'gameover', razon: 'ganoAlCompletar' }
        : { tipo: 'acierto', parejaId: carta1.parejaId },
    };
  }
  const perdio = config.maximoIntentos > 0 && nuevosIntentos >= config.maximoIntentos;
  return {
    nuevoEstado: {
      ...estado, intentosRealizados: nuevosIntentos,
      // Las cartas quedan visibles hasta que el controlador llame finalizarTurnoFallido.
      cartasSeleccionadas: [carta1Id, carta2Id], turnoBloqueado: true,
      estadoGeneral: perdio ? EstadoJuegoEnum.Perdido : EstadoJuegoEnum.Jugando,
    },
    resultado: perdio ? { tipo: 'gameover', razon: 'sinIntentos' }
      : { tipo: 'error', carta1, carta2 },
  };
}

/** Oculta el par incorrecto después de la pausa visual. Incluso funciona si la partida terminó. */
export function finalizarTurnoFallido(estado: EstadoJuego): EstadoJuego {
  if (!estado.turnoBloqueado || estado.cartasSeleccionadas.length !== 2) {
    throw new Error('No hay un turno fallido pendiente.');
  }
  const seleccionadas = new Set(estado.cartasSeleccionadas);
  const cartasDelTurno = estado.cartas.filter((c) => seleccionadas.has(c.id));
  if (cartasDelTurno.length !== 2 || cartasDelTurno.some((c) => c.emparejada) ||
      cartasDelTurno[0].parejaId === cartasDelTurno[1].parejaId) {
    throw new Error('El turno pendiente no es una pareja fallida.');
  }
  return {
    ...estado,
    cartas: estado.cartas.map((c) => seleccionadas.has(c.id) ? { ...c, estaVolteada: false } : c),
    cartasSeleccionadas: [], turnoBloqueado: false,
  };
}

export function verificarFinJuego(estado: EstadoJuego, config: ConfigJuego): 'ganado' | 'perdido' | 'continúa' {
  if (estado.paresEncontrados >= config.totalPares || estado.estadoGeneral === EstadoJuegoEnum.Ganado) return 'ganado';
  if (estado.estadoGeneral === EstadoJuegoEnum.Perdido ||
      (config.maximoIntentos > 0 && estado.intentosRealizados >= config.maximoIntentos)) return 'perdido';
  return 'continúa';
}

/** El controlador calcula el tiempo transcurrido y llama esta función al agotarse. */
export function finalizarPorTiempo(estado: EstadoJuego, config: ConfigJuego, tiempoTranscurrido: number): EstadoJuego {
  if (estado.estadoGeneral !== EstadoJuegoEnum.Jugando || config.tiempoLimite === 0 ||
      tiempoTranscurrido < config.tiempoLimite) return estado;
  return { ...estado, estadoGeneral: EstadoJuegoEnum.Perdido };
}
