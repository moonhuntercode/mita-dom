// @ts-check
import { rutaActual } from '../../core/router.js';
import { crearRecurso } from '../../core/resource.js';
import templateHTML from './perfil.html?raw';
import templateCSS from './perfil.css?raw';

export class MitaPerfil extends HTMLElement {
    constructor() {
        super();
        this._callbackRuta = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <style>${templateCSS}</style>
            ${templateHTML}
        `;

        this.$estado = this.querySelector('#perfil-estado');
        this.$contenido = this.querySelector('#perfil-contenido');
        this.$error = this.querySelector('#perfil-error');
        this.$nombre = this.querySelector('#perfil-nombre');
        this.$email = this.querySelector('#perfil-email');

        // 1. Suscripción al Enrutador
        this._callbackRuta = (/** @type {string} */ ruta) => {
            // Este componente solo será visible cuando la ruta sea /perfil
            this.style.display = (ruta === '/perfil') ? 'block' : 'none';
        };
        rutaActual.suscribir(this._callbackRuta);

        // 2. Fetch Granular Reactivo (simulamos un retardo de red de 1.5s)
        const fetchFakeUser = () => new Promise((resolve, reject) => {
            setTimeout(() => {
                // @ts-ignore
                resolve({ nombre: 'Jane Doe', email: 'jane.doe@example.com' });
                // Descomenta la siguiente línea para probar el flujo de error:
                // reject(new Error('Servidor caído'));
            }, 1500); 
        });

        const recurso = crearRecurso(fetchFakeUser);

        // 3. Conectamos los Signals del recurso al DOM de forma atómica
        recurso.loading.suscribir((cargando) => {
            if (this.$estado && this.$contenido && this.$error) {
                this.$estado.style.display = cargando ? 'block' : 'none';
                if (!cargando && !recurso.error.value) {
                    this.$contenido.style.display = 'block';
                }
            }
        });

        recurso.data.suscribir((data) => {
            if (data && this.$nombre && this.$email) {
                this.$nombre.textContent = data.nombre;
                this.$email.textContent = data.email;
            }
        });

        recurso.error.suscribir((err) => {
            if (err && this.$error && this.$contenido && this.$estado) {
                this.$estado.style.display = 'none';
                this.$contenido.style.display = 'none';
                this.$error.style.display = 'block';
                this.$error.textContent = 'Error: ' + err.message;
            }
        });
    }

    disconnectedCallback() {
        // Prevenir Memory Leaks
        if (this._callbackRuta) {
            rutaActual.desuscribir(this._callbackRuta);
        }
    }
}

if (!customElements.get('mita-perfil')) {
    customElements.define('mita-perfil', MitaPerfil);
}
