
import { describe, expect, it } from 'vitest';

import {
  esMovimientoValido,
  procesarSeleccionCarta,
  resolverTurno,
  finalizarTurnoFallido,
  verificarFinJuego,
  finalizarPorTiempo,
} from '../../src/lib/memorama/gestorPartida';

import { EstadoJuegoEnum } from '../../src/types/memorama';
import type {
  Carta,
  ConfigJuego,
  EstadoJuego,
} from '../../src/types/memorama';

const config: ConfigJuego = {
  totalPares: 2,
  tiempoLimite: 60,
  maximoIntentos: 3,
  modoPuntuacion: 'hibrido',
};

function crearEstado(): EstadoJuego {
  const cartas: Carta[] = [
    {
      id: 1,
      parejaId: 'pareja-1',
      imagen: '/uno.png',
      estaVolteada: false,
      emparejada: false,
    },
    {
      id: 2,
      parejaId: 'pareja-1',
      imagen: '/uno.png',
      estaVolteada: false,
      emparejada: false,
    },
    {
      id: 3,
      parejaId: 'pareja-2',
      imagen: '/dos.png',
      estaVolteada: false,
      emparejada: false,
    },
    {
      id: 4,
      parejaId: 'pareja-2',
      imagen: '/dos.png',
      estaVolteada: false,
      emparejada: false,
    },
  ];

  return {
    estadoGeneral: EstadoJuegoEnum.Jugando,
    cartas,
    paresEncontrados: 0,
    intentosRealizados: 0,
    cartasSeleccionadas: [],
    turnoBloqueado: false,
  };
}

function seleccionarDosCartas(
  estado: EstadoJuego,
  primera: number,
  segunda: number,
): EstadoJuego {
  const paso1 = procesarSeleccionCarta(primera, estado);
  const paso2 = procesarSeleccionCarta(segunda, paso1.nuevoEstado);

  return paso2.nuevoEstado;
}

describe('Gestión de partidas del memorama', () => {
  it('permite seleccionar una carta válida', () => {
    const estado = crearEstado();

    expect(esMovimientoValido(estado, 1)).toBe(true);

    const resultado = procesarSeleccionCarta(1, estado);

    expect(resultado.resultadoInmediato).toBe('seleccion');
    expect(resultado.nuevoEstado.cartasSeleccionadas).toEqual([1]);
    expect(resultado.nuevoEstado.cartas[0].estaVolteada).toBe(true);
    expect(resultado.nuevoEstado.intentosRealizados).toBe(0);
    expect(resultado.nuevoEstado.turnoBloqueado).toBe(false);
  });

  it('bloquea el tablero después de seleccionar dos cartas', () => {
    const estado = seleccionarDosCartas(crearEstado(), 1, 3);

    expect(estado.cartasSeleccionadas).toEqual([1, 3]);
    expect(estado.turnoBloqueado).toBe(true);
    expect(estado.cartas.find(c => c.id === 1)?.estaVolteada).toBe(true);
    expect(estado.cartas.find(c => c.id === 3)?.estaVolteada).toBe(true);
    expect(esMovimientoValido(estado, 2)).toBe(false);
  });

  it('reconoce una pareja correcta y contabiliza un intento', () => {
    const estado = seleccionarDosCartas(crearEstado(), 1, 2);

    const { nuevoEstado, resultado } = resolverTurno(
      1, 2, estado, config
    );

    expect(resultado).toEqual({
      tipo: 'acierto',
      parejaId: 'pareja-1',
    });

    expect(nuevoEstado.paresEncontrados).toBe(1);
    expect(nuevoEstado.intentosRealizados).toBe(1);
    expect(nuevoEstado.turnoBloqueado).toBe(false);
    expect(nuevoEstado.cartasSeleccionadas).toEqual([]);

    expect(
      nuevoEstado.cartas.filter(c => c.emparejada)
    ).toHaveLength(2);
  });

  it('reconoce una pareja incorrecta y mantiene el turno bloqueado', () => {
    const estado = seleccionarDosCartas(crearEstado(), 1, 3);

    const { nuevoEstado, resultado } = resolverTurno(
      1, 3, estado, config
    );

    expect(resultado.tipo).toBe('error');
    expect(nuevoEstado.intentosRealizados).toBe(1);
    expect(nuevoEstado.paresEncontrados).toBe(0);
    expect(nuevoEstado.turnoBloqueado).toBe(true);
    expect(nuevoEstado.cartasSeleccionadas).toEqual([1, 3]);
  });

  it('oculta las cartas incorrectas y desbloquea el tablero', () => {
    const estado = seleccionarDosCartas(crearEstado(), 1, 3);

    const { nuevoEstado } = resolverTurno(1, 3, estado, config);
    const estadoFinal = finalizarTurnoFallido(nuevoEstado);

    expect(estadoFinal.turnoBloqueado).toBe(false);
    expect(estadoFinal.cartasSeleccionadas).toEqual([]);
    expect(estadoFinal.intentosRealizados).toBe(1);

    expect(
      estadoFinal.cartas.find(c => c.id === 1)?.estaVolteada
    ).toBe(false);

    expect(
      estadoFinal.cartas.find(c => c.id === 3)?.estaVolteada
    ).toBe(false);

    expect(esMovimientoValido(estadoFinal, 2)).toBe(true);
  });

  it('declara victoria al encontrar todas las parejas', () => {
    const primerTurno = seleccionarDosCartas(crearEstado(), 1, 2);
    const primerResultado = resolverTurno(
      1, 2, primerTurno, config
    );

    const segundoTurno = seleccionarDosCartas(
      primerResultado.nuevoEstado, 3, 4
    );

    const { nuevoEstado, resultado } = resolverTurno(
      3, 4, segundoTurno, config
    );

    expect(nuevoEstado.estadoGeneral).toBe(EstadoJuegoEnum.Ganado);
    expect(nuevoEstado.paresEncontrados).toBe(2);
    expect(nuevoEstado.intentosRealizados).toBe(2);

    expect(resultado).toEqual({
      tipo: 'gameover',
      razon: 'ganoAlCompletar',
    });

    expect(verificarFinJuego(nuevoEstado, config)).toBe('ganado');
  });

  it('declara derrota cuando se agotan los intentos', () => {
    const configLimitada = {
      ...config,
      maximoIntentos: 1,
    };

    const estado = seleccionarDosCartas(crearEstado(), 1, 3);

    const { nuevoEstado, resultado } = resolverTurno(
      1, 3, estado, configLimitada
    );

    expect(nuevoEstado.estadoGeneral).toBe(EstadoJuegoEnum.Perdido);

    expect(resultado).toEqual({
      tipo: 'gameover',
      razon: 'sinIntentos',
    });

    expect(
      verificarFinJuego(nuevoEstado, configLimitada)
    ).toBe('perdido');
  });

  it('permite continuar cuando no existe límite de intentos', () => {
    const configIlimitada = {
      ...config,
      maximoIntentos: 0,
    };

    const estadoInicial: EstadoJuego = {
      ...crearEstado(),
      intentosRealizados: 100,
    };

    const estado = seleccionarDosCartas(estadoInicial, 1, 3);

    const { nuevoEstado } = resolverTurno(
      1, 3, estado, configIlimitada
    );

    expect(nuevoEstado.intentosRealizados).toBe(101);
    expect(nuevoEstado.estadoGeneral).toBe(EstadoJuegoEnum.Jugando);
    expect(
      verificarFinJuego(nuevoEstado, configIlimitada)
    ).toBe('continúa');
  });

  it('impide seleccionar dos veces la misma carta', () => {
    const primerPaso = procesarSeleccionCarta(1, crearEstado());
    const segundoPaso = procesarSeleccionCarta(
      1, primerPaso.nuevoEstado
    );

    expect(segundoPaso.resultadoInmediato).toBe('invalido');
    expect(segundoPaso.nuevoEstado.cartasSeleccionadas).toEqual([1]);
  });

  it('impide seleccionar cartas ya emparejadas', () => {
    const estado = seleccionarDosCartas(crearEstado(), 1, 2);
    const { nuevoEstado } = resolverTurno(1, 2, estado, config);

    expect(esMovimientoValido(nuevoEstado, 1)).toBe(false);
  });

  it('impide movimientos cuando la partida terminó', () => {
    const estado: EstadoJuego = {
      ...crearEstado(),
      estadoGeneral: EstadoJuegoEnum.Perdido,
    };

    const resultado = procesarSeleccionCarta(1, estado);

    expect(resultado.resultadoInmediato).toBe('bloqueado');
    expect(resultado.nuevoEstado).toBe(estado);
  });

  it('rechaza resolver un turno incompleto', () => {
    const estado = procesarSeleccionCarta(
      1, crearEstado()
    ).nuevoEstado;

    expect(() => resolverTurno(
      1, 2, estado, config
    )).toThrow();
  });

  it('declara derrota cuando se agota el tiempo', () => {
    const estado = finalizarPorTiempo(
      crearEstado(), config, 60
    );

    expect(estado.estadoGeneral).toBe(EstadoJuegoEnum.Perdido);
  });

  it('mantiene la partida activa si todavía queda tiempo', () => {
    const estado = finalizarPorTiempo(
      crearEstado(), config, 30
    );

    expect(estado.estadoGeneral).toBe(EstadoJuegoEnum.Jugando);
  });

  it('no aplica límite de tiempo cuando está configurado en cero', () => {
    const configSinTiempo = {
      ...config,
      tiempoLimite: 0,
    };

    const estado = finalizarPorTiempo(
      crearEstado(), configSinTiempo, 9999
    );

    expect(estado.estadoGeneral).toBe(EstadoJuegoEnum.Jugando);
  });

  it('permite ganar al completar las parejas en el último intento', () => {
    const estadoInicial: EstadoJuego = {
      ...crearEstado(),
      paresEncontrados: 1,
      intentosRealizados: 2,
      cartas: crearEstado().cartas.map(c =>
        c.parejaId === 'pareja-1'
          ? { ...c, emparejada: true, estaVolteada: true }
          : c
      ),
    };

    const estado = seleccionarDosCartas(estadoInicial, 3, 4);
    const { nuevoEstado } = resolverTurno(3, 4, estado, config);

    expect(nuevoEstado.intentosRealizados).toBe(3);
    expect(nuevoEstado.estadoGeneral).toBe(EstadoJuegoEnum.Ganado);
  });
});
