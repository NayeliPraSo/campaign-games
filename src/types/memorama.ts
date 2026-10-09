/** Tipos compartidos por el motor del memorama. */
export enum EstadoJuegoEnum {
  Preparado = 'preparado',
  Jugando = 'jugando',
  Ganado = 'ganado',
  Perdido = 'perdido',
}

export type IdPareja = string;

export interface Carta {
  id: number;
  parejaId: IdPareja;
  imagen: string;
  estaVolteada: boolean;
  emparejada: boolean;
}

export interface ConfigJuego {
  totalPares: number;
  tiempoLimite: number; // segundos; 0 = ilimitado
  maximoIntentos: number; // 0 = ilimitado
  modoPuntuacion: 'tiempo' | 'intentos' | 'hibrido';
}

export interface EstadoJuego {
  estadoGeneral: EstadoJuegoEnum;
  cartas: Carta[];
  paresEncontrados: number;
  intentosRealizados: number;
  cartasSeleccionadas: number[];
  turnoBloqueado: boolean;
}

export type ResultadoMovimiento =
  | { tipo: 'acierto'; parejaId: IdPareja }
  | { tipo: 'error'; carta1: Carta; carta2: Carta }
  | { tipo: 'bloqueado'; razon: 'yaVolteada' | 'turnoBloqueado' | 'juegoTerminado' | 'movimientoInvalido' }
  | { tipo: 'gameover'; razon: 'sinIntentos' | 'tiempoAgotado' | 'ganoAlCompletar' }
  | { tipo: 'progreso'; parejasRestantes: number };

export interface ResultadoJuego {
  estadoFinal: 'ganado' | 'perdido';
  mensaje: string;
  puntos: number;
  tiempoTranscurrido: number;
  intentosUsados: number;
}
