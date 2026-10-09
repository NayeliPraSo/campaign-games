
import { describe, expect, it } from 'vitest';

import {
  validarImagenesSuficiente,
  obtenerConfigCampana,
  esConfigCampanaValida,
} from '../../src/types/campanas';

import type { ConfigCampaña } from '../../src/types/campanas';

const configBase: ConfigCampaña = {
  id: 'campana-prueba',
  nombre: 'Campaña de prueba',
  totalPares: 3,
  tiempoLimite: 60,
  maximoIntentos: 10,
  modoPuntuacion: 'hibrido',
  rutasImagenes: [
    '/imagenes/uno.png',
    '/imagenes/dos.png',
    '/imagenes/tres.png',
  ],
};

describe('Validación de imágenes', () => {
  it('acepta suficientes imágenes únicas', () => {
    expect(
      validarImagenesSuficiente(3, configBase.rutasImagenes)
    ).toBe(true);
  });

  it('permite tener más imágenes que parejas', () => {
    expect(
      validarImagenesSuficiente(2, configBase.rutasImagenes)
    ).toBe(true);
  });

  it('rechaza imágenes insuficientes', () => {
    expect(() =>
      validarImagenesSuficiente(4, configBase.rutasImagenes)
    ).toThrow();
  });

  it('rechaza imágenes duplicadas', () => {
    expect(() =>
      validarImagenesSuficiente(3, [
        '/uno.png',
        '/uno.png',
        '/dos.png',
      ])
    ).toThrow();
  });

  it('detecta duplicados aunque tengan espacios alrededor', () => {
    expect(() =>
      validarImagenesSuficiente(2, [
        '/uno.png',
        ' /uno.png ',
      ])
    ).toThrow();
  });

  it('rechaza rutas vacías', () => {
    expect(() =>
      validarImagenesSuficiente(2, [
        '/uno.png',
        '   ',
      ])
    ).toThrow();
  });

  it('rechaza cantidades de parejas inválidas', () => {
    for (const total of [0, -1, 1.5, NaN, Infinity]) {
      expect(() =>
        validarImagenesSuficiente(total, configBase.rutasImagenes)
      ).toThrow();
    }
  });
});

describe('Obtención de campañas', () => {
  it('obtiene la campaña básica', () => {
    const config = obtenerConfigCampana('campo-basico');

    expect(config.id).toBe('campo-basico');
    expect(config.totalPares).toBe(4);
    expect(config.rutasImagenes).toHaveLength(4);
    expect(esConfigCampanaValida(config)).toBe(true);
  });

  it('obtiene la campaña avanzada', () => {
    const config = obtenerConfigCampana('campo-avanzado');

    expect(config.id).toBe('campo-avanzado');
    expect(config.totalPares).toBe(8);
    expect(config.rutasImagenes).toHaveLength(8);
    expect(esConfigCampanaValida(config)).toBe(true);
  });

  it('permite obtener la plantilla personalizada sin imágenes', () => {
    const config = obtenerConfigCampana('campo-personalizado');

    expect(config.id).toBe('campo-personalizado');
    expect(config.rutasImagenes).toEqual([]);
    expect(config.tiempoLimite).toBe(0);
    expect(config.maximoIntentos).toBe(0);

    // Existe como plantilla, pero todavía no está lista para jugar.
    expect(esConfigCampanaValida(config)).toBe(false);
  });

  it('rechaza campañas desconocidas', () => {
    expect(() =>
      obtenerConfigCampana('campana-inexistente')
    ).toThrow('Campaña desconocida');
  });

  it('devuelve una copia independiente de las imágenes', () => {
    const primera = obtenerConfigCampana('campo-basico');
    const segunda = obtenerConfigCampana('campo-basico');

    expect(primera).not.toBe(segunda);
    expect(primera.rutasImagenes).not.toBe(segunda.rutasImagenes);
    expect(primera.rutasImagenes).toEqual(segunda.rutasImagenes);
  });
});

describe('Validación de configuración de campañas', () => {
  it('acepta una campaña correctamente configurada', () => {
    expect(esConfigCampanaValida(configBase)).toBe(true);
  });

  it('acepta campañas sin límite de tiempo ni intentos', () => {
    expect(esConfigCampanaValida({
      ...configBase,
      tiempoLimite: 0,
      maximoIntentos: 0,
    })).toBe(true);
  });

  it('rechaza una cantidad inválida de parejas', () => {
    for (const totalPares of [0, -2, 2.5, NaN, Infinity]) {
      expect(esConfigCampanaValida({
        ...configBase,
        totalPares,
      })).toBe(false);
    }
  });

  it('rechaza límites de tiempo inválidos', () => {
    for (const tiempoLimite of [-1, 1.5, NaN, Infinity]) {
      expect(esConfigCampanaValida({
        ...configBase,
        tiempoLimite,
      })).toBe(false);
    }
  });

  it('rechaza límites de intentos inválidos', () => {
    for (const maximoIntentos of [-1, 2.5, NaN, Infinity]) {
      expect(esConfigCampanaValida({
        ...configBase,
        maximoIntentos,
      })).toBe(false);
    }
  });

  it('rechaza modos de puntuación desconocidos', () => {
    expect(esConfigCampanaValida({
      ...configBase,
      modoPuntuacion: 'desconocido' as ConfigCampaña['modoPuntuacion'],
    })).toBe(false);
  });

  it('rechaza identificadores y nombres vacíos', () => {
    expect(esConfigCampanaValida({
      ...configBase,
      id: ' ',
    })).toBe(false);

    expect(esConfigCampanaValida({
      ...configBase,
      nombre: ' ',
    })).toBe(false);
  });

  it('rechaza configuraciones con imágenes duplicadas', () => {
    expect(esConfigCampanaValida({
      ...configBase,
      rutasImagenes: [
        '/uno.png',
        '/uno.png',
        '/dos.png',
      ],
    })).toBe(false);
  });

  it('permite completar una plantilla personalizada', () => {
    const plantilla = obtenerConfigCampana('campo-personalizado');

    const configurada: ConfigCampaña = {
      ...plantilla,
      totalPares: 3,
      rutasImagenes: [
        '/promo/uno.png',
        '/promo/dos.png',
        '/promo/tres.png',
      ],
    };

    expect(esConfigCampanaValida(configurada)).toBe(true);
  });
});
