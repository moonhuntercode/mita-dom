// @ts-check
/**
 * 🧱 Constructor Re-usable de Formularios + Controlador Reactivo de Autenticación
 * Portado y evolucionado desde `food-show-1/src/components/FormBuilder.js` a HTML5 semántico puro.
 */
import { crearEstadoCompartido } from '../core/signals.js';
import { renderCondicional } from '../core/render.js';

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Crea un formulario HTML5 semántico, accesible y 100% re-usable para Login, Registro,
 * Contacto, Anuncios o Configuración.
 *
 * Incluye:
 * - Campos `text`, `email`, `password` (con botón `👁️` para mostrar/ocultar), `select`, `textarea` y `checkbox` (ej. Términos y Condiciones).
 * - Validación declarativa por `pattern` (RegExp), `minLength` y `required`.
 * - Mensajes de error granulares en `<output>` por cada campo sin re-renderizar el formulario.
 *
 * @param {Object} opciones
 * @param {string} [opciones.id] ID único del formulario
 * @param {string} [opciones.titulo] Título opcional dentro de `<legend>`
 * @param {string} [opciones.submitText='Enviar'] Texto del botón submit
 * @param {Array<{
 *   name: string,
 *   label: string,
 *   type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox',
 *   placeholder?: string,
 *   required?: boolean,
 *   pattern?: string,
 *   minLength?: number,
 *   errorMsg?: string,
 *   options?: Array<{ value: string, label: string }>,
 *   hidden?: boolean
 * }>} opciones.fields Lista declarativa de campos
 * @param {(datos: Record<string, any>) => void | Promise<void>} [opciones.onSubmit] Callback al validar con éxito
 */
export function crearFormularioReusable(opciones) {
  const formId = opciones.id || `mita-form-${Date.now()}`;
  const campos = (opciones.fields || []).filter((f) => !f.hidden);
  const submitText = opciones.submitText || 'Enviar';
  const onSubmit = opciones.onSubmit || (() => {});

  function renderCampo(field) {
    const type = field.type || 'text';
    const inputId = `${formId}-${field.name}`;
    const errId = `err-${formId}-${field.name}`;
    const reqAttr = field.required ? 'required' : '';
    const placeholder = escaparHtml(field.placeholder || '');

    if (type === 'checkbox') {
      return `
        <label class="mita-form-check" for="${inputId}">
          <input type="checkbox" id="${inputId}" name="${escaparHtml(field.name)}" ${reqAttr} />
          <span>${escaparHtml(field.label)}</span>
        </label>
        <output id="${errId}" class="mita-form-error" aria-live="polite" hidden></output>
      `;
    }

    if (type === 'select') {
      const optsHtml = (field.options || [])
        .map((o) => `<option value="${escaparHtml(o.value)}">${escaparHtml(o.label)}</option>`)
        .join('');
      return `
        <label class="mita-form-field" for="${inputId}">
          <span class="mita-form-label">${escaparHtml(field.label)}</span>
          <select id="${inputId}" name="${escaparHtml(field.name)}" class="mita-form-input" ${reqAttr}>
            ${optsHtml}
          </select>
          <output id="${errId}" class="mita-form-error" aria-live="polite" hidden></output>
        </label>
      `;
    }

    if (type === 'textarea') {
      return `
        <label class="mita-form-field" for="${inputId}">
          <span class="mita-form-label">${escaparHtml(field.label)}</span>
          <textarea id="${inputId}" name="${escaparHtml(field.name)}" class="mita-form-input" placeholder="${placeholder}" ${reqAttr}></textarea>
          <output id="${errId}" class="mita-form-error" aria-live="polite" hidden></output>
        </label>
      `;
    }

    if (type === 'password') {
      return `
        <label class="mita-form-field" for="${inputId}">
          <span class="mita-form-label">${escaparHtml(field.label)}</span>
          <span class="mita-form-pwd-group">
            <input type="password" id="${inputId}" name="${escaparHtml(field.name)}" class="mita-form-input" placeholder="${placeholder}" autocomplete="current-password" ${reqAttr} />
            <button type="button" class="mita-toggle-pwd" data-target="${inputId}" aria-label="Mostrar u ocultar contraseña">👁️</button>
          </span>
          <output id="${errId}" class="mita-form-error" aria-live="polite" hidden></output>
        </label>
      `;
    }

    const autoComplete = type === 'email' ? 'autocomplete="username"' : '';
    return `
      <label class="mita-form-field" for="${inputId}">
        <span class="mita-form-label">${escaparHtml(field.label)}</span>
        <input type="${escaparHtml(type)}" id="${inputId}" name="${escaparHtml(field.name)}" class="mita-form-input" placeholder="${placeholder}" ${autoComplete} ${reqAttr} />
        <output id="${errId}" class="mita-form-error" aria-live="polite" hidden></output>
      </label>
    `;
  }

  function render() {
    const legendHtml = opciones.titulo ? `<legend class="mita-form-legend">${escaparHtml(opciones.titulo)}</legend>` : '';
    return `
      <form id="${escaparHtml(formId)}" class="mita-reusable-form" novalidate>
        <fieldset class="mita-form-fieldset">
          ${legendHtml}
          ${campos.map(renderCampo).join('')}
          <button type="submit" class="mita-form-submit">${escaparHtml(submitText)}</button>
        </fieldset>
      </form>
    `;
  }

  function validarCampo(field, rootNode) {
    const input = rootNode.querySelector(`#${formId}-${field.name}`);
    const errOut = rootNode.querySelector(`#err-${formId}-${field.name}`);
    if (!input) return true;

    let esValido = true;
    let mensaje = '';

    if (field.type === 'checkbox') {
      if (field.required && !input.checked) {
        esValido = false;
        mensaje = field.errorMsg || 'Debes aceptar este campo obligatorio.';
      }
    } else {
      const valor = String(input.value ?? '').trim();
      if (field.required && !valor) {
        esValido = false;
        mensaje = field.errorMsg || `El campo "${field.label}" es obligatorio.`;
      } else if (field.minLength && valor.length < field.minLength) {
        esValido = false;
        mensaje = field.errorMsg || `Mínimo ${field.minLength} caracteres.`;
      } else if (field.pattern && !new RegExp(field.pattern).test(valor)) {
        esValido = false;
        mensaje = field.errorMsg || 'Formato inválido.';
      }
    }

    if (errOut) {
      errOut.hidden = esValido;
      errOut.textContent = esValido ? '' : mensaje;
    }
    input.setAttribute('aria-invalid', String(!esValido));
    return esValido;
  }

  function hydrate(contenedor = typeof document !== 'undefined' ? document : null) {
    if (!contenedor) return () => {};
    const formEl = contenedor.querySelector(`#${formId}`);
    if (!formEl) return () => {};

    const onClick = (e) => {
      const btn = e.target.closest('.mita-toggle-pwd');
      if (!btn) return;
      const targetId = btn.getAttribute('data-target');
      const input = formEl.querySelector(`#${targetId}`);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    };

    const onSubmitForm = async (e) => {
      e.preventDefault();
      let todoValido = true;
      /** @type {Record<string, any>} */
      const datos = {};

      campos.forEach((field) => {
        const input = formEl.querySelector(`#${formId}-${field.name}`);
        if (!validarCampo(field, formEl)) {
          todoValido = false;
        }
        if (input) {
          datos[field.name] = field.type === 'checkbox' ? Boolean(input.checked) : String(input.value ?? '').trim();
        }
      });

      if (todoValido) {
        await onSubmit(datos);
      }
    };

    formEl.addEventListener('click', onClick);
    formEl.addEventListener('submit', onSubmitForm);

    return () => {
      formEl.removeEventListener('click', onClick);
      formEl.removeEventListener('submit', onSubmitForm);
    };
  }

  function montarEn(contenedor) {
    if (!contenedor) return () => {};
    contenedor.innerHTML = render();
    return hydrate(contenedor);
  }

  return {
    id: formId,
    render,
    hydrate,
    montarEn,
    validarCampo
  };
}

/**
 * 🔐 Controlador Reactivo de Autenticación con Render Condicional (Login / Registro / Logout).
 * Permite montar en cualquier contenedor un flujo completo que cambia dinámicamente entre:
 * 1) Vista de Sesión Iniciada (Perfil + Botón Cerrar Sesión)
 * 2) Formulario Re-usable de Login o Registro (con aceptación obligatoria de Términos)
 *
 * @param {Object} [opciones={}]
 * @param {string} [opciones.nombreEstado='auth:flujo_global'] Nombre del Signal compartido
 * @param {boolean} [opciones.persistirLocal=true] Guardar sesión en localStorage
 */
export function crearControladorAuth(opciones = {}) {
  const nombreEstado = opciones.nombreEstado || 'auth:flujo_global';

  const estadoAuth = crearEstadoCompartido(
    nombreEstado,
    {
      autenticado: false,
      modoFormulario: 'login', // 'login' | 'registro'
      usuario: null,
      ultimoMensaje: 'Sesión no iniciada'
    },
    {
      persistirLocal: opciones.persistirLocal ?? true,
      descripcion: 'Estado compartido de autenticación (Login, Registro con Términos y Logout).',
      reglas: 'Solo permite registro cuando aceptoTerminos === true.'
    }
  );

  return {
    estado: estadoAuth,

    cambiarModo(modo) {
      estadoAuth.patch({
        modoFormulario: modo === 'registro' ? 'registro' : 'login',
        ultimoMensaje: `Cambiado a formulario de ${modo}`
      });
    },

    iniciarSesion({ email, password }) {
      if (!email || !password || String(password).length < 4) {
        throw new Error('Credenciales inválidas (contraseña mínimo 4 caracteres).');
      }
      const usuario = {
        nombre: String(email).split('@')[0],
        email: String(email),
        rol: String(email).includes('admin') ? 'ADMIN' : 'USUARIO'
      };
      estadoAuth.patch({
        autenticado: true,
        usuario,
        ultimoMensaje: `Sesión iniciada como ${usuario.email} (${usuario.rol})`
      });
      return usuario;
    },

    registrar({ fullname, email, password, aceptoTerminos }) {
      if (aceptoTerminos !== true) {
        throw new Error('Debes aceptar los Términos y Condiciones para crear tu cuenta.');
      }
      if (!fullname || !email || !password || String(password).length < 6) {
        throw new Error('Completa todos los campos (contraseña mínimo 6 caracteres).');
      }
      const usuario = {
        nombre: String(fullname).trim(),
        email: String(email).trim(),
        rol: 'USUARIO'
      };
      estadoAuth.patch({
        autenticado: true,
        usuario,
        ultimoMensaje: `Cuenta registrada y sesión activa para ${usuario.nombre}`
      });
      return usuario;
    },

    cerrarSesion() {
      estadoAuth.patch({
        autenticado: false,
        usuario: null,
        modoFormulario: 'login',
        ultimoMensaje: 'Sesión cerrada correctamente.'
      });
    },

    /**
     * Monta automáticamente el flujo condicional (Login <-> Registro <-> Sesión Activa) en un contenedor DOM.
     * @param {HTMLElement | null} contenedor
     */
    montarFlujoCondicional(contenedor) {
      if (!contenedor) return () => {};
      let limpiarFormActivo = () => {};

      const formLogin = crearFormularioReusable({
        id: 'mita-auth-login-form',
        titulo: '🔐 Iniciar Sesión',
        submitText: 'Entrar a mi Cuenta',
        fields: [
          {
            name: 'email',
            label: 'Correo Electrónico',
            type: 'email',
            placeholder: 'admin@mita.bo',
            required: true,
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            errorMsg: 'Ingresa un correo electrónico válido.'
          },
          {
            name: 'password',
            label: 'Contraseña (PIN)',
            type: 'password',
            placeholder: 'Mínimo 4 caracteres',
            required: true,
            minLength: 4,
            errorMsg: 'La contraseña debe tener al menos 4 caracteres.'
          }
        ],
        onSubmit: (datos) => {
          this.iniciarSesion(datos);
        }
      });

      const formRegistro = crearFormularioReusable({
        id: 'mita-auth-register-form',
        titulo: '📝 Crear Cuenta Nueva',
        submitText: 'Completar Registro Seguro',
        fields: [
          {
            name: 'fullname',
            label: 'Nombre Completo',
            type: 'text',
            placeholder: 'Victor Code',
            required: true,
            minLength: 2,
            errorMsg: 'Ingresa tu nombre completo.'
          },
          {
            name: 'email',
            label: 'Correo Electrónico',
            type: 'email',
            placeholder: 'victor@mita.bo',
            required: true,
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            errorMsg: 'Ingresa un correo electrónico válido.'
          },
          {
            name: 'password',
            label: 'Contraseña Segura',
            type: 'password',
            placeholder: 'Mínimo 6 caracteres',
            required: true,
            minLength: 6,
            errorMsg: 'La contraseña debe tener al menos 6 caracteres.'
          },
          {
            name: 'aceptoTerminos',
            label: 'Acepto los Términos y Condiciones y la Política de Privacidad',
            type: 'checkbox',
            required: true,
            errorMsg: 'Es obligatorio aceptar los Términos y Condiciones.'
          }
        ],
        onSubmit: (datos) => {
          this.registrar(datos);
        }
      });

      const detenerCondicional = renderCondicional({
        estado: estadoAuth,
        contenedor,
        cuando: (st) => st.autenticado === true,
        mostrar: (st) => `
          <article class="mita-auth-session-box" data-auth-estado="autenticado">
            <header>
              <strong>🟢 Sesión Activa: ${escaparHtml(st.usuario?.nombre)}</strong>
              <span>(${escaparHtml(st.usuario?.rol)})</span>
            </header>
            <p>Correo: <code>${escaparHtml(st.usuario?.email)}</code></p>
            <button type="button" data-auth-action="logout" class="mita-auth-logout-btn">🚪 Cerrar Sesión</button>
          </article>
        `,
        sino: (st) => {
          const esLogin = st.modoFormulario !== 'registro';
          return `
            <article class="mita-auth-forms-box" data-auth-estado="invitado">
              <section id="mita-auth-active-form-slot">
                ${esLogin ? formLogin.render() : formRegistro.render()}
              </section>
              <footer>
                <button type="button" data-auth-action="toggle-mode" class="mita-auth-switch-btn">
                  ${esLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia Sesión'}
                </button>
              </footer>
            </article>
          `;
        },
        siempreActualizar: true
      });

      const rehidratarFormulario = (st) => {
        limpiarFormActivo();
        if (!st.autenticado) {
          const formActivo = st.modoFormulario === 'registro' ? formRegistro : formLogin;
          limpiarFormActivo = formActivo.hydrate(contenedor);
        }
      };

      const detenerSub = estadoAuth.suscribir(rehidratarFormulario);

      const onClickDelegado = (e) => {
        const btn = e.target.closest('button[data-auth-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-auth-action');
        if (action === 'logout') {
          this.cerrarSesion();
        } else if (action === 'toggle-mode') {
          const actual = estadoAuth.get().modoFormulario;
          this.cambiarModo(actual === 'login' ? 'registro' : 'login');
        }
      };

      contenedor.addEventListener('click', onClickDelegado);

      return () => {
        limpiarFormActivo();
        detenerCondicional();
        detenerSub();
        contenedor.removeEventListener('click', onClickDelegado);
      };
    }
  };
}
