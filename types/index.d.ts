// MitaDOM Type Definitions para Autocompletado (DX)
export interface SignalOptions<T> {
  immutable?: boolean;
  persistKey?: string | null;
  storageAdapter?: {
    getItem(key: string): any;
    setItem(key: string, val: string): any;
    removeItem(key: string): any;
  } | null;
  guard?: (newValue: T, oldValue: T) => boolean;
  onMutate?: (newValue: T, oldValue: T) => void;
}

export interface SharedStateOptions<T> extends SignalOptions<T> {
  persistirLocal?: boolean;
  descripcion?: string;
  reglas?: string;
}

export class Signal<T> {
  constructor(initialValue: T, options?: SignalOptions<T>);
  get(): T;
  set(newValue: T): boolean;
  update(fn: (currentValue: T) => T): boolean;
  patch(partialValue: Partial<T>): boolean;
  reset(): void;
  destroy(): void;
  suscribir(callback: (value: T) => void): () => void;
  desuscribir(callback: (value: T) => void): void;
  derivar<U>(fn: (value: T) => U): SignalDerivado<U>;
}

export class SignalDerivado<T> extends Signal<T> {
  constructor(parentSignal: Signal<any>, computeFn: (val: any) => T);
}

export function crearEstadoLocal<T>(valorInicial: T, options?: SignalOptions<T>): Signal<T>;
export function crearEstadoGlobal<T>(valorInicial: T, options?: SignalOptions<T>): Signal<T>;
export function crearEfecto(fn: () => void): () => void;
export function sinRastrear<T>(fn: () => T): T;
export function crearEstadoCompartido<T>(
  nombreUnico: string,
  valorInicial: T,
  opciones?: SharedStateOptions<T>
): Signal<T>;
export function obtenerEstadoCompartido<T = any>(nombreUnico: string): Signal<T> | null;
export function listarEstadosCompartidos(): Array<{
  nombre: string;
  descripcion: string;
  reglas: string;
  persistKey: string | null;
  valorActual: any;
  suscriptores: number;
}>;
export function eliminarEstadoCompartido(nombreUnico: string): void;

export interface RenderCondicionalConfig<T> {
  estado: Signal<T>;
  contenedor: HTMLElement | null;
  cuando: (state: T) => boolean;
  mostrar: (state: T) => string;
  sino?: (state: T) => string;
  siempreActualizar?: boolean;
}

export function renderCondicional<T>(config: RenderCondicionalConfig<T>): () => void;
export function renderCondicional<T>(
  signal: Signal<T>,
  mountNode: HTMLElement | null,
  conditionFn: (state: T) => boolean,
  trueTemplate: (state: T) => string,
  falseTemplate?: (state: T) => string
): () => void;

export function vincularTexto<T>(
  signal: Signal<T>,
  nodo: HTMLElement | null,
  formateador?: (valor: T) => string
): () => void;

export class MitaElement extends HTMLElement {
  alCrear?(): void;
  alAntesDeRenderizar?(): void;
  alMontar?(): void | Promise<void>;
  alCambiarAtributo?(nombre: string, valorAnterior: string | null, valorNuevo: string | null): void;
  alCambiarProp?(nombreProp: string, valorAnterior: string | null, valorNuevo: string | null): void;
  alActualizar?(motivo: string): void;
  alDesmontar?(): void | Promise<void>;
  alError?(error: Error, fase: string): void;
  render?(): string | void | Promise<string | void>;
  fallbackUI?(error: Error): string;
  registrarLimpieza(limpiarFn: () => void): void;
  escucharEstado<T>(signal: Signal<T>, callback: (val: T) => void): () => void;
  mostrarSi<T>(configuracion: RenderCondicionalConfig<T>): () => void;
  vincularTexto<T>(
    signal: Signal<T>,
    selectorONodo: string | HTMLElement | null,
    formateador?: (valor: T) => string
  ): () => void;
  solicitarActualizacion(motivo?: string): void;
  obtenerCicloDeVida(): {
    componente: string;
    faseActual: string;
    montado: boolean;
    renders: number;
    limpiezasPendientes: number;
  };
}

export function definirComponente(nombre: string, configuracion: any): void;

export interface ControlSpamOptions {
  cooldownMs?: number;
  maxLongitud?: number;
  palabrasProhibidas?: string[];
  bloquearLinks?: boolean;
  bloquearDuplicados?: boolean;
}

export function crearControlSpam(opciones?: ControlSpamOptions): {
  evaluarMensaje(texto: string, usuario?: string): {
    permitido: boolean;
    motivo: string | null;
    textoLimpio: string;
    esperaMs: number;
  };
  reiniciar(): void;
};

export function filtrarColeccion<T>(
  coleccion: T[],
  filtros?: {
    busqueda?: string;
    categoria?: string;
    campoCategoria?: string;
    camposTexto?: string[];
  }
): T[];

export const MitaMeta: {
  useHead(config: { title?: string; meta?: Array<Record<string, string>> }): void;
  applyToDOM(): void;
  renderSSRHead(): string;
  obtenerEstado(): { title: string; meta: Array<Record<string, string>> };
};

export function renderizarVistaUniversal(
  VistaOClase: any,
  opciones?: {
    url?: string;
    modo?: 'ssr' | 'ssg' | 'hybrid' | 'csr' | 'spa';
    contexto?: Record<string, any>;
  }
): Promise<{
  modoAplicado: string;
  head: string;
  body: string;
  htmlDocumento: string;
}>;

export function crearFormularioReusable(opciones: {
  id?: string;
  titulo?: string;
  submitText?: string;
  fields: Array<{
    name: string;
    label: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox';
    placeholder?: string;
    required?: boolean;
    pattern?: string;
    minLength?: number;
    errorMsg?: string;
    options?: Array<{ value: string; label: string }>;
    hidden?: boolean;
  }>;
  onSubmit?: (datos: Record<string, any>) => void | Promise<void>;
}): {
  id: string;
  render(): string;
  hydrate(contenedor?: HTMLElement | Document | null): () => void;
  montarEn(contenedor: HTMLElement | null): () => void;
};

export function crearControladorAuth(opciones?: {
  nombreEstado?: string;
  persistirLocal?: boolean;
}): {
  estado: Signal<any>;
  cambiarModo(modo: 'login' | 'registro'): void;
  iniciarSesion(credenciales: { email: string; password: string }): any;
  registrar(datos: { fullname: string; email: string; password: string; aceptoTerminos: boolean }): any;
  cerrarSesion(): void;
  montarFlujoCondicional(contenedor: HTMLElement | null): () => void;
};

export function crearGestorConsentimiento(opciones?: {
  nombreEstado?: string;
  persistirLocal?: boolean;
}): {
  estado: Signal<any>;
  aceptarTodo(): any;
  soloEsenciales(): any;
  guardarPreferencias(prefs: {
    terminosAceptados: boolean;
    cookiesPreferencias?: boolean;
    cookiesAnaliticas?: boolean;
  }): any;
  revocarConsentimiento(): void;
  actualizarTerminosYPoliticas(nuevasPoliticas?: {
    textoTerminos?: string;
    versionTerminos?: string;
    reglasAnalitica?: string;
    urlGuiaNube?: string;
  }): any;
  exportarSnapshotNube(): Record<string, any>;
  importarSnapshotNube(snapshot: Record<string, any>): any;
  registrarAnalitica(nombreEvento: string, metadata?: Record<string, any>): {
    enviado: boolean;
    motivo?: string;
    evento?: any;
  };
};

export function congelarProfundamenteInmutable<T>(valor: T): Readonly<T>;
export function crearEstadoReactivoInmutable<T>(
  nombreIdentificador: string,
  valorInicial: T,
  opciones?: {
    compartidoEntreComponentes?: boolean;
    persistirEnLocalStorage?: boolean;
    descripcionDelEstado?: string;
    reglasDeNegocio?: string;
    maximoSuscriptoresPermitidos?: number;
  }
): Signal<T>;
export function leerEstadoInmutable<T>(signal: Signal<T>): Readonly<T>;
export function mutarEstadoConHistorial<T>(
  signal: Signal<T>,
  nuevosDatosOMutador: Partial<T> | ((actual: Readonly<T>) => T),
  motivoDelCambio?: string
): Readonly<T>;
export function obtenerHistorialDeMutaciones(signal: Signal<any>): Array<{
  fecha: string;
  motivo: string;
  valorAnterior: any;
  valorNuevo: any;
}>;
export function renderizarSiSeCumpleCondicion<T>(config: {
  estadoReactivo: Signal<T>;
  contenedorDom: HTMLElement | null;
  condicionParaMostrar: (valorEstado: T) => boolean;
  plantillaHtmlSiSeCumple: (valorEstado: T) => string;
  plantillaHtmlSiNoSeCumple?: (valorEstado: T) => string;
}): () => void;
export function medirPresupuestoDeRenderizado<T>(
  nombreOperacion: string,
  operacionFn: () => T,
  presupuestoMaximoMs?: number
): {
  resultado: T;
  duracionMs: number;
  dentroDePresupuesto: boolean;
  alerta: string | null;
};
export function crearAmbitoConLimpiezaAutomatica(
  nombrePropietario: string,
  opciones?: { maxRecursos?: number }
): {
  nombrePropietario: string;
  vincularSignalConLimpieza<T>(signal: Signal<T>, callback: (val: Readonly<T>) => void, etiqueta?: string): () => void;
  ejecutarEfectoConLimpieza(efectoFn: () => void, etiqueta?: string): () => void;
  escucharEventoDomConLimpieza(elemento: EventTarget | null, nombreEvento: string, manejador: any): () => void;
  programarIntervaloConLimpieza(fn: () => void, milisegundos: number): () => void;
  liberarMemoriaCompleta(): number;
  reiniciarAmbitoParaNuevoRender(): void;
  auditarSaludDeMemoria(): {
    propietario: string;
    ambitoLiberado: boolean;
    recursosActivosCount: number;
    totalLiberadosHistorico: number;
    detalleRecursos: string[];
    posibleFugaDetectada: boolean;
    mensajeDiagnostico: string;
  };
};
export function ejecutarSuiteVerificacionMita(): {
  fecha: string;
  totalTests: number;
  totalAprobados: number;
  todoVerde: boolean;
  resultados: Array<{ id: string; nombre: string; aprobado: boolean; detalle: string }>;
};
export function simularComandoCliMita(comandoRaw: string): {
  comando: string;
  tipo: string;
  resumen: string;
  archivos: Array<{ ruta: string; contenido: string }>;
};

export function crearControladorCrudCategorias(opciones?: {
  nombreEstado?: string;
  persistirEnLocalStorage?: boolean;
  registrosIniciales?: Array<Record<string, any>>;
  categoriasPermitidas?: string[];
}): {
  estado: Signal<any>;
  leerEstadoInmutable(): any;
  aplicarFiltrosDeBusqueda(nuevosFiltros?: {
    textoBusqueda?: string;
    categoriaActiva?: string;
    soloDestacados?: boolean;
  }): any;
  listarRegistrosFiltrados(filtrosOverride?: {
    textoBusqueda?: string;
    categoriaActiva?: string;
    soloDestacados?: boolean;
  }): Array<Record<string, any>>;
  crearNuevoRegistro(datos: {
    titulo: string;
    categoria: string;
    descripcion?: string;
    valorNumerico?: number;
    destacado?: boolean;
  }): Record<string, any>;
  actualizarRegistroExistente(idRegistro: string, cambiosParciales: Record<string, any>, motivo?: string): any;
  alternarDestacadoPorId(idRegistro: string): any;
  eliminarRegistroPorId(idRegistro: string, motivo?: string): boolean;
  obtenerEstadisticasPorCategoria(): {
    totalRegistros: number;
    totalDestacados: number;
    conteoPorCategoria: Record<string, number>;
    historialCambios: any[];
  };
  reiniciarDatosDeFabrica(): any;
};

export function crearControladorEstrategiaPorVista(opciones?: {
  nombreEstado?: string;
}): {
  estado: Signal<any>;
  obtenerConfiguracionDeVista(ruta: string): any;
  cambiarModoDeVistaEnCaliente(ruta: string, nuevoModo: 'hybrid' | 'ssr' | 'ssg' | 'csr'): any;
  activarODesactivarVista(ruta: string, habilitada: boolean): any;
  listarMapaDeVistas(): any[];
  renderizarVistaConConfiguracion(ruta: string, VistaOClase: any): Promise<any>;
};

export function crearGestorGamificacionLectura(opciones?: {
  nombreEstado?: string;
}): {
  estado: Signal<any>;
  marcarDocumentoComoLeido(idDoc: string, segundosInvertidos?: number): any;
  agregarResaltadoDeTexto(idDoc: string, textoResaltado: string, color?: 'amarillo' | 'verde' | 'azul'): any;
  eliminarResaltadoDeTexto(idResaltado: string): any;
  aplicarResaltadosEnHtml(idDoc: string, htmlRenderizado: string): string;
  obtenerResumenGamificacion(totalCatalogoDocs?: number, gestorConsentimiento?: any): {
    leidosCount: number;
    totalCatalogoDocs: number;
    porcentajeProgreso: number;
    puntosXP: number;
    nivelActual: string;
    totalResaltados: number;
    segundosLecturaAcumulados: number;
    analiticaPrecisionEnviada: boolean;
  };
};

export function obtenerHuellaDispositivoLocal(): string;
export function crearControladorPaginacion(opciones?: {
  nombreEstado?: string;
  tamanoPaginaInicial?: number;
}): any;
export function crearFetcherConCacheYEstados(opciones?: {
  nombreEstado?: string;
  tiempoCacheMs?: number;
}): any;
export function crearGestorPerfilesYDispositivo(opciones?: {
  nombreEstado?: string;
}): any;
export function crearControladorSalaChatYGrupos(opciones?: {
  nombreEstado?: string;
  intervaloSegundosInicial?: number;
}): any;
export function crearSistemaModeracionAnuncios(opciones?: {
  nombreEstado?: string;
  gestorPerfiles?: any;
}): any;

export function obtenerUrlImagenCientifico(
  person: { name?: string; nombre?: string; imageId: string },
  size?: 's' | 'b' | string
): string;
export const CIENTIFICOS_DEMO: ReadonlyArray<{
  readonly name: string;
  readonly imageId: string;
  readonly size: number;
  readonly profesion: string;
  readonly logro: string;
}>;
export function pasarPropsAElemento(elemento: Element | null, nuevasProps: Record<string, any>): Record<string, any>;
export function leerPropsDeElemento<T extends Record<string, any>>(
  elemento: Element | null,
  valoresPorDefecto?: T
): Readonly<T>;
export function renderizarVistaDiferida(config: {
  contenedor: HTMLElement | null;
  disparador?: 'interaccion' | 'temporizador' | 'inmediato';
  demoraMs?: number;
  plantillaPlaceholder: () => string;
  plantillaCargando?: () => string;
  cargarContenidoDiferido: () => Promise<string> | string;
  plantillaError?: (err: Error) => string;
}): {
  estado: Signal<any> | null;
  dispararCargaAhora(): Promise<void>;
  reiniciarAPlaceholder(): void;
  limpiar(): void;
};
export function crearFormularioReactivoConSignals(
  definicionCampos: Record<
    string,
    {
      valorInicial?: any;
      requerido?: boolean;
      minLongitud?: number;
      patronRegex?: string;
      validadorPersonalizado?: (valor: any) => string | null;
    }
  >,
  nombreEstado?: string
): {
  estado: Signal<any>;
  establecerValorCampo(nombreCampo: string, nuevoValor: any): any;
  obtenerValoresInmutables(): Readonly<Record<string, any>>;
  procesarEnvio(): { ok: boolean; erroresPresentes?: boolean; motivo?: string; valores?: any };
  reiniciarFormulario(): any;
};

export function crearControladorFetchingPorModo(opciones: {
  nombreEstado?: string;
  modoDisparo?: 'al-hacer-click' | 'automatico-al-entrar';
  tiempoCacheMs?: number;
  cargadorAsyncFn: () => Promise<any>;
}): any;
export function crearAccionServidorIsomorfica(
  nombreAccion: string,
  controladorServidorORMFn: (payload: Record<string, any>) => Promise<any> | any,
  opciones?: {
    validarPayload?: (payload: Record<string, any>) => string | null;
    signalsAInvalidar?: Array<any>;
  }
): any;
export function ejecutarConsejeroMitaDoc(contexto?: {
  raizDom?: ParentNode | null;
  latenciaUltimoRenderMs?: number;
}): {
  puntajeSalud: number;
  estadoGeneral: string;
  aciertos: string[];
  consejosMejora: string[];
};
export function calcularRecomendacionSemVer(criterios?: {
  versionActual?: string;
  hayCambiosEnCodigo?: boolean;
  rompeCompatibilidadAnterior?: boolean;
  agregaNuevaFuncionalidadOExport?: boolean;
  corrigeBugODocumentacion?: boolean;
}): {
  versionActual: string;
  versionRecomendada: string;
  tipoSubida: string;
  motivo: string;
  comandosPublicacion: string[];
};
export const PALETAS_COLORES_MITA: Record<string, any>;
export function crearGestorTemaYAnimacionNavegacion(opciones?: { nombreEstado?: string }): any;
export function crearGestorBitacoraPorHora(opciones?: { nombreEstado?: string }): any;

/** Activa el modo para IA: Los errores se expulsan en JSON estructurado */
export function enableAIDevMode(): void;


// ============================================================================
// Async Graph (Solid 2.0), linkedSignal (Angular 20), Live SSE & Agent Diagnostics
// ============================================================================
export const CATALOGO_DIAGNOSTICOS_AGENTE: Readonly<
  Record<
    | 'MITA_LECTURA_SIN_RASTREO'
    | 'MITA_ESPERA_PROLONGADA'
    | 'MITA_CASCADA_ASINCRONA'
    | 'MITA_BUCLE_EFECTO'
    | 'MITA_SIN_LIMPIEZA_DOM'
    | 'MITA_RENDER_DUPLICADO',
    {
      codigo: string;
      equivalenteSolid2: string;
      severidad: string;
      mensaje: string;
      solucion: string;
      guiaAgente: string;
    }
  >
>;

export function emitirDiagnosticoAgente(
  codigo: keyof typeof CATALOGO_DIAGNOSTICOS_AGENTE,
  contexto?: { origen?: string; detalle?: string; silencioso?: boolean }
): {
  codigo: string;
  equivalenteSolid2: string;
  severidad: string;
  origen: string;
  detalle: string;
  mensaje: string;
  solucion: string;
  guiaAgente: string;
  timestamp: string;
};

export function obtenerDiagnosticosAgente(): Array<ReturnType<typeof emitirDiagnosticoAgente>>;
export function limpiarDiagnosticosAgente(): void;

export function crearMemoAsincrono<T>(
  fnAsincrona: (ctx: { signal: AbortSignal }) => Promise<T> | T,
  opciones?: {
    valorInicial?: T | null;
    umbralEsperaProlongadaMs?: number;
    nombre?: string;
    silenciosoDiagnostico?: boolean;
  }
): {
  estado: Signal<{
    valor: T | null;
    pendiente: boolean;
    error: string | null;
    esperaProlongada: boolean;
    version: number;
    latenciaMs: number;
  }>;
  valor(): T | null;
  estaPendiente(): boolean;
  esperaProlongada(): boolean;
  error(): string | null;
  reintentar(): void;
  destruir(): void;
};

export function crearEstadoVinculado<TFuente, TValor>(
  leerFuente: () => TFuente,
  calcularValor: (valorFuente: TFuente, valorAnterior: TValor | undefined) => TValor
): {
  estado: Signal<TValor>;
  get(): TValor;
  set(nuevoValor: TValor): boolean;
  suscribir(cb: (val: TValor) => void): () => void;
  destruir(): void;
};

export function crearEstadoOptimistaConRollback<T>(valorInicial: T): {
  estado: Signal<{
    valor: T;
    valorConfirmado: T;
    estaConfirmando: boolean;
    seHizoRollback: boolean;
    ultimoError: string | null;
  }>;
  valor(): T;
  aplicarConServidor(
    valorOptimista: T,
    mutacionServidor: () => Promise<T | void>
  ): Promise<{ ok: boolean; valor: T; rollback: boolean; error?: string }>;
  destruir(): void;
};

export function crearFuncionServidor<TPayload, TResultado>(
  nombre: string,
  handlerServidor: (payload: TPayload) => Promise<TResultado> | TResultado,
  opciones?: { validar?: (payload: TPayload) => string | null; endpoint?: string }
): {
  nombre: string;
  endpoint: string;
  estado: Signal<{
    nombre: string;
    endpoint: string;
    pendiente: boolean;
    datos: TResultado | null;
    error: string | null;
    latenciaMs: number;
    invocaciones: number;
  }>;
  ejecutar(
    payload: TPayload
  ): Promise<{ ok: boolean; datos: TResultado | null; error: string | null; latenciaMs: number }>;
  destruir(): void;
};

export function crearFuncionServidorEnVivo<T>(
  nombre: string,
  generadorAsync: (...args: any[]) => AsyncGenerator<T, void, unknown>
): {
  nombre: string;
  estado: Signal<{
    nombre: string;
    conectado: boolean;
    valor: T | null;
    ticks: number;
    error: string | null;
  }>;
  ultimoValor(): T | null;
  iniciar(...args: any[]): Promise<void>;
  detener(): Promise<void>;
  destruir(): void;
};

export type EstrategiaRenderMita = 'CSR' | 'SSR' | 'SSG' | 'HYBRID' | 'RESUMABLE';

export const ESTRATEGIAS_RENDER_MITA: Readonly<
  Record<
    EstrategiaRenderMita,
    {
      codigo: EstrategiaRenderMita;
      titulo: string;
      servidorExpress: string;
      hidratacion: string;
      idealPara: string;
    }
  >
>;

export function definirEstrategiaRenderRuta(
  ruta: string,
  estrategia: EstrategiaRenderMita,
  opciones?: { cacheSegundos?: number }
): {
  ruta: string;
  estrategia: EstrategiaRenderMita;
  cacheSegundos: number;
  descripcion: string;
  detalles: (typeof ESTRATEGIAS_RENDER_MITA)[EstrategiaRenderMita];
};

export function cambiarEstrategiaRender(
  ruta: string,
  nuevaEstrategia: EstrategiaRenderMita,
  opciones?: { cacheSegundos?: number }
): ReturnType<typeof definirEstrategiaRenderRuta>;

export function obtenerMapaEstrategiasRender(): Array<ReturnType<typeof definirEstrategiaRenderRuta>>;
