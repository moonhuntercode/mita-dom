// @ts-check
import { Signal } from './signals.js';

/**
 * Motor de Renderizado Condicional Granular para MitaDOM.
 *
 * Evalúa un Signal y decide qué template insertar dentro del nodo contenedor.
 * Evita re-rendereos masivos y muta únicamente el fragmento involucrado.
 *
 * Soporta DOS formas de llamada:
 * 1) Forma declarativa (RECOMENDADA por claridad y legibilidad):
 *    renderCondicional({
 *      estado: miSignal,
 *      contenedor: this.querySelector('#zona'),
 *      cuando: (valor) => valor.habilitado === true,
 *      mostrar: (valor) => `<div>Activo: ${valor.titulo}</div>`,
 *      sino: () => `<p>Desactivado</p>`
 *    });
 *
 * 2) Forma posicional (retro-compatible):
 *    renderCondicional(signal, mountNode, conditionFn, trueTemplate, falseTemplate);
 *
 * @param {any} signalOConfig Instancia de Signal o configuracion declarativa `{ estado, contenedor, cuando, mostrar, sino }`
 * @param {HTMLElement} [mountNodeArg] Contenedor DOM (modo posicional)
 * @param {(state: any) => boolean} [conditionFnArg] Función evaluadora (modo posicional)
 * @param {(state: any) => string} [trueTemplateArg] Generador HTML si es TRUE (modo posicional)
 * @param {(state: any) => string} [falseTemplateArg] Generador HTML si es FALSE (modo posicional)
 * @returns {() => void} Función `detener()` para desuscribir y liberar memoria
 */
export const renderCondicional = (
    signalOConfig,
    mountNodeArg,
    conditionFnArg,
    trueTemplateArg,
    falseTemplateArg
) => {
    const esObjetoConfig =
        signalOConfig &&
        typeof signalOConfig === 'object' &&
        !(signalOConfig instanceof Signal) &&
        'estado' in signalOConfig;

    const signal = esObjetoConfig ? signalOConfig.estado : signalOConfig;
    const mountNode = esObjetoConfig ? signalOConfig.contenedor : mountNodeArg;
    const conditionFn = esObjetoConfig ? signalOConfig.cuando : conditionFnArg;
    const trueTemplate = esObjetoConfig ? signalOConfig.mostrar : trueTemplateArg;
    const falseTemplate = esObjetoConfig
        ? (signalOConfig.sino || (() => ''))
        : (falseTemplateArg || (() => ''));
    const forzarActualizacionEnCambio = esObjetoConfig ? Boolean(signalOConfig.siempreActualizar) : false;

    if (!(signal instanceof Signal)) {
        console.error('⚠️ [MitaDOM] renderCondicional requiere una instancia de Signal válida.');
        return () => {};
    }
    if (!mountNode || typeof mountNode.innerHTML === 'undefined') {
        console.error('⚠️ [MitaDOM] renderCondicional requiere un nodo DOM válido para montar (contenedor/mountNode).');
        return () => {};
    }
    if (typeof conditionFn !== 'function' || typeof trueTemplate !== 'function') {
        console.error('⚠️ [MitaDOM] renderCondicional requiere funciones válidas para evaluar y renderizar.');
        return () => {};
    }

    /** @type {boolean | null} */
    let currentConditionState = null;

    const actualizarDominio = (state) => {
        const nextConditionState = Boolean(conditionFn(state));

        // Evitamos tocar el DOM si el estado booleano de la condición no cambió
        if (!forzarActualizacionEnCambio && currentConditionState === nextConditionState) {
            return;
        }
        currentConditionState = nextConditionState;

        // Inyectamos de forma granular únicamente dentro del nodo asignado
        mountNode.innerHTML = nextConditionState
            ? trueTemplate(state)
            : falseTemplate(state);
    };

    // Suscribir al signal y retornar función de limpieza
    return signal.suscribir(actualizarDominio);
};

/**
 * 🎯 Enlaza un Signal directamente al `textContent` de un nodo DOM (Granular Light DOM).
 * Nunca usa `innerHTML`, previniendo XSS y preservando 100% la referencia del nodo.
 *
 * @template T
 * @param {Signal<T>} signal Signal a observar
 * @param {HTMLElement | null} nodo Elemento DOM cuyo texto se actualizará
 * @param {(valor: T) => string} [formateador] Función opcional para transformar el valor a texto
 * @returns {() => void} Función de limpieza para desuscribir
 */
export const vincularTexto = (signal, nodo, formateador = (val) => String(val ?? '')) => {
    if (!(signal instanceof Signal)) {
        console.error('⚠️ [MitaDOM] vincularTexto requiere una instancia de Signal válida.');
        return () => {};
    }
    if (!nodo) {
        console.warn('⚠️ [MitaDOM] vincularTexto recibió un nodo nulo.');
        return () => {};
    }

    return signal.suscribir((valor) => {
        nodo.textContent = formateador(valor);
    });
};
