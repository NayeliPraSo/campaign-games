
import { describe, expect, it } from 'vitest';

import {
  calcularPuntuacion,
  actualizarMejorRécord,
} from '../../src/lib/memorama/calculadorPuntaje';

import type {
  OpcionesPuntuacion,
  RegistroRecord,
} from '../../src/lib/memorama/calculadorPuntaje';

const opcionesBase: OpcionesPuntuacion = {
  modo: 'hibrido',
  baseFinal: 1000,
  factorTiempo: 100,
  factorIntentos: 10,
  tiempoLimite: 120,
  maximoIntentos: 10,
  tiempoTranscurrido: 60,
};

const estadoBase = {
  paresEncontrados: 4,
  intentosRealizados: 5,
};

describe('Cálculo de puntuación del memorama', () => {
  it('otorga más puntos cuando se termina en menos tiempo', () => {
    const rapido = calcularPuntuacion(estadoBase, {
      ...opcionesBase,
      modo: 'tiempo',
      tiempoTranscurrido: 20,
    });

    const lento = calcularPuntuacion(estadoBase, {
      ...opcionesBase,
      modo: 'tiempo',
      tiempoTranscurrido: 100,
    });

    expect(rapido).toBeGreaterThan(lento);
  });

  it('otorga más puntos cuando se utilizan menos intentos', () => {
    const pocosIntentos = calcularPuntuacion(
      { ...estadoBase, intentosRealizados: 3 },
      { ...opcionesBase, modo: 'intentos' },
    );

    const muchosIntentos = calcularPuntuacion(
      { ...estadoBase, intentosRealizados: 9 },
      { ...opcionesBase, modo: 'intentos' },
    );

    expect(pocosIntentos).toBeGreaterThan(muchosIntentos);
  });

  it('combina correctamente tiempo e intentos en modo híbrido', () => {
    const puntuacion = calcularPuntuacion(
      estadoBase,
      opcionesBase,
    );

    // Base: 1000
    // Bonificación de tiempo: 50
    // Penalización de intentos: 50
    expect(puntuacion).toBe(1000);
  });

  it('calcula correctamente el modo tiempo', () => {
    const puntuacion = calcularPuntuacion(estadoBase, {
      ...opcionesBase,
      modo: 'tiempo',
    });

    expect(puntuacion).toBe(1050);
  });

  it('calcula correctamente el modo intentos', () => {
    const puntuacion = calcularPuntuacion(estadoBase, {
      ...opcionesBase,
      modo: 'intentos',
    });

    expect(puntuacion).toBe(950);
  });

  it('no aplica bonificación cuando no existe límite de tiempo', () => {
    const puntuacion = calcularPuntuacion(estadoBase, {
      ...opcionesBase,
      modo: 'tiempo',
      tiempoLimite: 0,
    });

    expect(puntuacion).toBe(1000);
  });

  it('no aplica penalización cuando no existe límite de intentos', () => {
    const puntuacion = calcularPuntuacion(estadoBase, {
      ...opcionesBase,
      modo: 'intentos',
      maximoIntentos: 0,
    });

    expect(puntuacion).toBe(1000);
  });

  it('funciona sin límites de tiempo ni intentos', () => {
    const puntuacion = calcularPuntuacion(estadoBase, {
      ...opcionesBase,
      tiempoLimite: 0,
      maximoIntentos: 0,
    });

    expect(puntuacion).toBe(1000);
    expect(Number.isFinite(puntuacion)).toBe(true);
  });

  it('nunca devuelve una puntuación negativa', () => {
    const puntuacion = calcularPuntuacion(
      { ...estadoBase, intentosRealizados: 100 },
      {
        ...opcionesBase,
        modo: 'intentos',
        maximoIntentos: 1,
      },
    );

    expect(puntuacion).toBe(0);
  });

  it('no concede bonificación si se supera el tiempo límite', () => {
    const puntuacion = calcularPuntuacion(estadoBase, {
      ...opcionesBase,
      modo: 'tiempo',
      tiempoTranscurrido: 200,
    });

    expect(puntuacion).toBe(1000);
  });

  it('produce el mismo resultado con los mismos datos', () => {
    const primero = calcularPuntuacion(
      estadoBase,
      opcionesBase,
    );

    const segundo = calcularPuntuacion(
      estadoBase,
      opcionesBase,
    );

    expect(primero).toBe(segundo);
  });

  it('rechaza valores negativos', () => {
    expect(() =>
      calcularPuntuacion(estadoBase, {
        ...opcionesBase,
        tiempoTranscurrido: -1,
      }),
    ).toThrow();
  });

  it('rechaza valores no finitos', () => {
    expect(() =>
      calcularPuntuacion(estadoBase, {
        ...opcionesBase,
        factorTiempo: Infinity,
      }),
    ).toThrow();

    expect(() =>
      calcularPuntuacion(estadoBase, {
        ...opcionesBase,
        baseFinal: NaN,
      }),
    ).toThrow();
  });

  it('rechaza modos de puntuación inválidos', () => {
    expect(() =>
      calcularPuntuacion(estadoBase, {
        ...opcionesBase,
        modo: 'desconocido' as OpcionesPuntuacion['modo'],
      }),
    ).toThrow();
  });
});

describe('Gestión del mejor récord', () => {
  const recordAnterior: RegistroRecord = {
    nombre: 'Participante A',
    puntuacion: 1200,
    fecha: '2026-10-01T12:00:00.000Z',
  };

  it('crea el primer récord cuando no existe uno anterior', () => {
    const resultado = actualizarMejorRécord(
      null,
      'Participante B',
      1000,
      '2026-10-09T12:00:00.000Z',
    );

    expect(resultado).toEqual({
      nombre: 'Participante B',
      puntuacion: 1000,
      fecha: '2026-10-09T12:00:00.000Z',
    });
  });

  it('actualiza el récord cuando se obtiene una puntuación mayor', () => {
    const resultado = actualizarMejorRécord(
      recordAnterior,
      'Participante B',
      1500,
      '2026-10-09T12:00:00.000Z',
    );

    expect(resultado.nombre).toBe('Participante B');
    expect(resultado.puntuacion).toBe(1500);
  });

  it('conserva el récord anterior cuando la puntuación es menor', () => {
    const resultado = actualizarMejorRécord(
      recordAnterior,
      'Participante B',
      900,
      '2026-10-09T12:00:00.000Z',
    );

    expect(resultado).toBe(recordAnterior);
  });

  it('conserva el récord anterior en caso de empate', () => {
    const resultado = actualizarMejorRécord(
      recordAnterior,
      'Participante B',
      1200,
      '2026-10-09T12:00:00.000Z',
    );

    expect(resultado).toBe(recordAnterior);
  });

  it('rechaza puntuaciones inválidas', () => {
    expect(() =>
      actualizarMejorRécord(
        null,
        'Participante B',
        -100,
        '2026-10-09',
      ),
    ).toThrow();

    expect(() =>
      actualizarMejorRécord(
        null,
        'Participante B',
        NaN,
        '2026-10-09',
      ),
    ).toThrow();
  });

  it('exige nombre y fecha', () => {
    expect(() =>
      actualizarMejorRécord(
        null,
        ' ',
        1000,
        '2026-10-09',
      ),
    ).toThrow();

    expect(() =>
      actualizarMejorRécord(
        null,
        'Participante B',
        1000,
        ' ',
      ),
    ).toThrow();
  });
});
