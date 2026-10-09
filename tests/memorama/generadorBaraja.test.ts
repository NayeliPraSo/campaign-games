import { describe, it, expect } from 'vitest';

import { generarCartas } from '../../src/lib/memorama/generadorBaraja';
import type { ConfigCampaña } from '../../src/types/campanas';

const config: ConfigCampaña = {
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

describe('Generación de cartas del memorama', () => {
  it('genera exactamente dos cartas por pareja', () => {
    const cartas = generarCartas(config);

    expect(cartas).toHaveLength(6);

    const cantidades = new Map<string, number>();

    for (const carta of cartas) {
      cantidades.set(
        carta.parejaId,
        (cantidades.get(carta.parejaId) ?? 0) + 1
      );
    }

    expect(cantidades.size).toBe(3);

    for (const cantidad of cantidades.values()) {
      expect(cantidad).toBe(2);
    }
  });

  it('genera identificadores únicos para cada carta', () => {
    const cartas = generarCartas(config);
    const ids = cartas.map((carta) => carta.id);

    expect(new Set(ids).size).toBe(cartas.length);
  });

  it('inicializa todas las cartas ocultas y sin emparejar', () => {
    const cartas = generarCartas(config);

    for (const carta of cartas) {
      expect(carta.estaVolteada).toBe(false);
      expect(carta.emparejada).toBe(false);
    }
  });

  it('rechaza una campaña sin suficientes imágenes', () => {
    const configInvalida: ConfigCampaña = {
      ...config,
      totalPares: 5,
    };

    expect(() => generarCartas(configInvalida)).toThrow();
  });

  it('rechaza imágenes duplicadas', () => {
    const configDuplicada: ConfigCampaña = {
      ...config,
      rutasImagenes: [
        '/imagenes/uno.png',
        '/imagenes/uno.png',
        '/imagenes/tres.png',
      ],
    };

    expect(() => generarCartas(configDuplicada)).toThrow();
  });
});