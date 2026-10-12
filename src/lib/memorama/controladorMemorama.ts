
import { EstadoJuegoEnum } from '../../types/memorama';
import type { ConfigCampaña } from '../../types/campanas';
import type { EstadoJuego } from '../../types/memorama';

import {
  generarCartas,
  barajarCartas,
  inicializarEstado,
  comenzarPartida,
} from './generadorBaraja';

import {
  procesarSeleccionCarta,
  resolverTurno,
  finalizarTurnoFallido,
  finalizarPorTiempo,
} from './gestorPartida';

import { calcularPuntuacion } from './calculadorPuntaje';

const PAUSA_ERROR = 900;

export function inicializarMemorama(
  contenedor: HTMLElement,
  config: ConfigCampaña,
): () => void {
  const elementoTablero = contenedor.querySelector<HTMLElement>('.tablero');

  if (!elementoTablero) {
    throw new Error('No se encontró el tablero del memorama.');
  }

  const tablero: HTMLElement = elementoTablero;

  const botones = new Map<number, HTMLButtonElement>();

  tablero.querySelectorAll<HTMLButtonElement>('[data-carta-id]')
    .forEach((boton) => {
      const id = Number(boton.dataset.cartaId);

      if (!Number.isSafeInteger(id) || botones.has(id)) {
        throw new Error('Identificador de carta inválido o duplicado.');
      }

      botones.set(id, boton);
    });

  const cartasBase = generarCartas(config);

  if (
    botones.size !== cartasBase.length ||
    cartasBase.some((carta) => !botones.has(carta.id))
  ) {
    throw new Error('Las cartas del HTML no coinciden con la campaña.');
  }

  // Respetar el orden inicialmente generado por Astro.
  const idsIniciales = [...botones.keys()];
  const cartasPorId = new Map(
    cartasBase.map((carta) => [carta.id, carta]),
  );

  const cartasIniciales = idsIniciales.map((id) => {
    const carta = cartasPorId.get(id);

    if (!carta) {
      throw new Error(`Carta desconocida: ${id}`);
    }

    return carta;
  });

  let estado: EstadoJuego = comenzarPartida(
    inicializarEstado(cartasIniciales, config),
  );

  let destruido = false;
  let inicioPartida = performance.now();
  let tiempoTranscurrido = 0;
  let puntuacionFinal: number | null = null;
  let motivoDerrota: 'tiempo' | 'intentos' | null = null;

  let intervaloReloj: ReturnType<typeof setInterval> | null = null;
  let temporizadorError: ReturnType<typeof setTimeout> | null = null;

  const indicadorIntentos = contenedor.querySelector<HTMLElement>(
    '[data-memorama-intentos]',
  );

  const indicadorParejas = contenedor.querySelector<HTMLElement>(
    '[data-memorama-parejas]',
  );

  const indicadorTiempo = contenedor.querySelector<HTMLElement>(
    '[data-memorama-tiempo]',
  );

  const indicadorPuntuacion = contenedor.querySelector<HTMLElement>(
    '[data-memorama-puntuacion]',
  );

  const indicadorEstado = contenedor.querySelector<HTMLElement>(
    '[data-memorama-estado]',
  );

  const resultado = contenedor.querySelector<HTMLElement>(
    '[data-memorama-resultado]',
  );

  const resultadoTitulo = contenedor.querySelector<HTMLElement>(
    '[data-resultado-titulo]',
  );

  const resultadoMensaje = contenedor.querySelector<HTMLElement>(
    '[data-resultado-mensaje]',
  );

  const resultadoIcono = contenedor.querySelector<HTMLElement>(
    '.resultado__icono',
  );

  const resultadoPuntos = contenedor.querySelector<HTMLElement>(
    '[data-resultado-puntos]',
  );

  const resultadoTiempo = contenedor.querySelector<HTMLElement>(
    '[data-resultado-tiempo]',
  );

  const resultadoIntentos = contenedor.querySelector<HTMLElement>(
    '[data-resultado-intentos]',
  );

  const resultadoParejas = contenedor.querySelector<HTMLElement>(
    '[data-resultado-parejas]',
  );

  const botonReiniciar = contenedor.querySelector<HTMLButtonElement>(
    '[data-memorama-reiniciar]',
  );

  function formatearTiempo(segundos: number): string {
    const total = Math.max(0, Math.floor(segundos));
    const minutos = Math.floor(total / 60);
    const segundosRestantes = total % 60;

    return `${String(minutos).padStart(2, '0')}:${String(
      segundosRestantes,
    ).padStart(2, '0')}`;
  }

  function detenerReloj(): void {
    if (intervaloReloj !== null) {
      clearInterval(intervaloReloj);
      intervaloReloj = null;
    }
  }

  function cancelarErrorPendiente(): void {
    if (temporizadorError !== null) {
      clearTimeout(temporizadorError);
      temporizadorError = null;
    }
  }

  function mostrarResultado(): void {
    if (!resultado) return;

    const gano = estado.estadoGeneral === EstadoJuegoEnum.Ganado;

    if (resultadoTitulo) {
      resultadoTitulo.textContent = gano
        ? '¡Felicidades, ganaste!'
        : motivoDerrota === 'tiempo'
          ? '¡Se terminó el tiempo!'
          : '¡Se agotaron los intentos!';
    }

    if (resultadoMensaje) {
      resultadoMensaje.textContent = gano
        ? 'Encontraste todas las parejas. ¡Excelente trabajo!'
        : 'No lograste completar el tablero. ¡Inténtalo nuevamente!';
    }

    if (resultadoIcono) {
      resultadoIcono.textContent = gano ? '🏆' : '⌛';
    }

    if (resultadoPuntos) {
      resultadoPuntos.textContent = String(puntuacionFinal ?? 0);
    }

    if (resultadoTiempo) {
      resultadoTiempo.textContent = formatearTiempo(tiempoTranscurrido);
    }

    if (resultadoIntentos) {
      resultadoIntentos.textContent = String(
        estado.intentosRealizados,
      );
    }

    if (resultadoParejas) {
      resultadoParejas.textContent =
        `${estado.paresEncontrados} / ${config.totalPares}`;
    }

    resultado.hidden = false;
    botonReiniciar?.focus();
  }

  function finalizarPartida(): void {
    detenerReloj();

    if (puntuacionFinal !== null) return;

    puntuacionFinal =
      estado.estadoGeneral === EstadoJuegoEnum.Ganado
        ? calcularPuntuacion(estado, {
            modo: config.modoPuntuacion,
            tiempoLimite: config.tiempoLimite,
            maximoIntentos: config.maximoIntentos,
            tiempoTranscurrido,
          })
        : 0;

    renderizar();
    mostrarResultado();
  }

  function renderizar(): void {
    for (const carta of estado.cartas) {
      const boton = botones.get(carta.id);
      if (!boton) continue;

      const visible = carta.estaVolteada || carta.emparejada;

      boton.setAttribute('aria-pressed', String(visible));

      boton.setAttribute(
        'aria-label',
        carta.emparejada
          ? `Carta ${carta.id + 1}, pareja encontrada`
          : visible
            ? `Carta ${carta.id + 1}, descubierta`
            : `Carta ${carta.id + 1}, oculta`,
      );

      boton.disabled =
        carta.emparejada ||
        estado.turnoBloqueado ||
        estado.estadoGeneral !== EstadoJuegoEnum.Jugando;
    }

    if (indicadorIntentos) {
      indicadorIntentos.textContent = String(
        estado.intentosRealizados,
      );
    }

    if (indicadorParejas) {
      indicadorParejas.textContent =
        `${estado.paresEncontrados} / ${config.totalPares}`;
    }

    if (indicadorTiempo) {
      const segundos = config.tiempoLimite > 0
        ? Math.max(0, config.tiempoLimite - tiempoTranscurrido)
        : tiempoTranscurrido;

      indicadorTiempo.textContent = formatearTiempo(
        config.tiempoLimite > 0
          ? Math.ceil(segundos)
          : Math.floor(segundos),
      );
    }

    if (indicadorPuntuacion) {
      indicadorPuntuacion.textContent =
        puntuacionFinal === null ? '—' : String(puntuacionFinal);
    }

    if (indicadorEstado) {
      indicadorEstado.textContent =
        estado.estadoGeneral === EstadoJuegoEnum.Ganado
          ? '¡Felicidades! Encontraste todas las parejas.'
          : estado.estadoGeneral === EstadoJuegoEnum.Perdido
            ? motivoDerrota === 'tiempo'
              ? '¡Se terminó el tiempo!'
              : 'Partida terminada. No quedan intentos.'
            : 'Encuentra las parejas.';
    }
  }

  function actualizarReloj(): void {
    if (
      destruido ||
      estado.estadoGeneral !== EstadoJuegoEnum.Jugando
    ) {
      return;
    }

    tiempoTranscurrido =
      (performance.now() - inicioPartida) / 1000;

    estado = finalizarPorTiempo(
      estado,
      config,
      tiempoTranscurrido,
    );

    if (estado.estadoGeneral === EstadoJuegoEnum.Perdido) {
      motivoDerrota = 'tiempo';
      cancelarErrorPendiente();
      finalizarPartida();
      return;
    }

    renderizar();
  }

  function seleccionarCarta(cartaId: number): void {
    if (destruido) return;

    actualizarReloj();

    if (estado.estadoGeneral !== EstadoJuegoEnum.Jugando) {
      return;
    }

    const seleccion = procesarSeleccionCarta(cartaId, estado);

    if (seleccion.resultadoInmediato !== 'seleccion') {
      return;
    }

    estado = seleccion.nuevoEstado;
    renderizar();

    if (estado.cartasSeleccionadas.length !== 2) {
      return;
    }

    const [primera, segunda] = estado.cartasSeleccionadas;

    const resolucion = resolverTurno(
      primera,
      segunda,
      estado,
      config,
    );

    estado = resolucion.nuevoEstado;

    tiempoTranscurrido =
      (performance.now() - inicioPartida) / 1000;

    if (
      resolucion.resultado.tipo === 'gameover' &&
      resolucion.resultado.razon === 'sinIntentos'
    ) {
      motivoDerrota = 'intentos';
    }

    if (
      estado.estadoGeneral === EstadoJuegoEnum.Ganado ||
      estado.estadoGeneral === EstadoJuegoEnum.Perdido
    ) {
      finalizarPartida();
    } else {
      renderizar();
    }

    if (
      resolucion.resultado.tipo === 'error' ||
      (resolucion.resultado.tipo === 'gameover' &&
        resolucion.resultado.razon === 'sinIntentos')
    ) {
      temporizadorError = setTimeout(() => {
        temporizadorError = null;

        if (destruido) return;

        estado = finalizarTurnoFallido(estado);
        renderizar();
      }, PAUSA_ERROR);
    }
  }

  function reiniciarPartida(): void {
    if (destruido) return;

    cancelarErrorPendiente();
    detenerReloj();

    // Crear una nueva distribución de cartas.
    const cartasMezcladas = barajarCartas(
      generarCartas(config),
    );

    // Sincronizar el orden visual con el nuevo estado.
    for (const carta of cartasMezcladas) {
      const boton = botones.get(carta.id);

      if (!boton) {
        throw new Error(`No se encontró la carta ${carta.id}.`);
      }

      tablero.appendChild(boton);
    }

    estado = comenzarPartida(
      inicializarEstado(cartasMezcladas, config),
    );

    inicioPartida = performance.now();
    tiempoTranscurrido = 0;
    puntuacionFinal = null;
    motivoDerrota = null;

    if (resultado) {
      resultado.hidden = true;
    }

    renderizar();
    const primeraCarta = estado.cartas[0];

    if (primeraCarta) {
      botones.get(primeraCarta.id)?.focus();
    }

    intervaloReloj = setInterval(actualizarReloj, 250);
  }

  function manejarClick(evento: MouseEvent): void {
    const objetivo = evento.target;

    if (!(objetivo instanceof Element)) return;

    const botonReiniciar = objetivo.closest<HTMLButtonElement>(
      '[data-memorama-reiniciar]',
    );

    if (botonReiniciar && contenedor.contains(botonReiniciar)) {
      reiniciarPartida();
      return;
    }

    const botonCarta = objetivo.closest<HTMLButtonElement>(
      '[data-carta-id]',
    );

    if (!botonCarta || !tablero.contains(botonCarta)) {
      return;
    }

    seleccionarCarta(Number(botonCarta.dataset.cartaId));
  }

  contenedor.addEventListener('click', manejarClick);

  renderizar();
  intervaloReloj = setInterval(actualizarReloj, 250);
  actualizarReloj();

  return () => {
    destruido = true;

    contenedor.removeEventListener('click', manejarClick);

    cancelarErrorPendiente();
    detenerReloj();
  };
}
