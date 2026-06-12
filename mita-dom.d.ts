// @ts-check

export interface SignalOptions<T> {
  immutable?: boolean;
  persistKey?: string;
  storageAdapter?: {
    getItem: (key: string) => any;
    setItem: (key: string, val: string) => any;
    removeItem: (key: string) => any;
  };
  guard?: (newValue: T, oldValue: T) => boolean;
  onMutate?: (newValue: T, oldValue: T) => void;
}

export class Signal<T> {
  constructor(valorInicial: T, options?: SignalOptions<T>);
  
  /** @deprecated Usa .get() o .set() */
  value: T;

  get(): T;
  set(nuevoValor: T): boolean;
  update(updaterFn: (estadoAnterior: T) => T): boolean;
  patch(partialValue: Partial<T>): boolean;
  reset(): void;
  destroy(): void;

  suscribir(callback: (valor: T) => void): void;
  desuscribir(callback: (valor: T) => void): void;
  notificar(): void;
}

// El estadoAppGlobal fue retirado de la librería en v2.1.6
// export const estadoAppGlobal: Signal<any>;

// Enrutador
export interface RutaCallback {
  (ruta: string): void;
}

export const rutaActual: Signal<string>;
export function navegarA(ruta: string): void;

// Recursos
export interface Resource<T> {
  data: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
  refetch: () => Promise<void>;
}

export function crearRecurso<T>(fetcherFn: () => Promise<T>): Resource<T>;

// Seguridad
export function sanitizarTexto(htmlPeligroso: string): string;

// Plugins
export function mitaHmrPlugin(): any;
