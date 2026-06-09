import './style.css'
import { Signal } from 'mita-dom'

// Prueba 1: Inferencia de tipos estricta (Genéricos)
// TS infiere que este Signal solo acepta y devuelve números
const contador = new Signal<number>(0);

// Prueba 2: Tipado en las suscripciones
contador.suscribir((valor) => {
    // valor es estrictamente de tipo number
    const p = document.querySelector<HTMLParagraphElement>('#valor-contador');
    if (p) p.textContent = `Valor: ${valor}`;
});

// El HTML se encuentra estructurado limpiamente en index.html

document.querySelector<HTMLButtonElement>('#btn-incrementar')?.addEventListener('click', () => {
    // Si un desarrollador intenta hacer esto:
    // contador.value = "hola"; 
    // TypeScript arrojará inmediatamente: "Type 'string' is not assignable to type 'number'"
    
    contador.value += 1;
});
