// ============================================================
// CONFIGURACIÓN
// ============================================================

const API_ESPECIALIDADES = "/api/especialidades";
const API_TURNOS = "/api/turnos";

const INTERVALO_ACTUALIZACION = 60000; // 60 segundos


// ============================================================
// ELEMENTOS DEL DOM
// ============================================================

const buscador =
    document.getElementById("buscador");

const limpiarBusqueda =
    document.getElementById("limpiarBusqueda");

const listaEspecialidades =
    document.getElementById("listaEspecialidades");

const sinResultados =
    document.getElementById("sinResultados");

const contadorEspecialidades =
    document.getElementById("contadorEspecialidades");

const estadoConexion =
    document.getElementById("estadoConexion");

const resultado =
    document.getElementById("resultado");

const resultadoNombre =
    document.getElementById("resultadoNombre");

const estadoBadge =
    document.getElementById("estadoBadge");

const estadoIcon =
    document.getElementById("estadoIcon");

const estadoTitulo =
    document.getElementById("estadoTitulo");

const estadoMensaje =
    document.getElementById("estadoMensaje");

const cantidadCupos =
    document.getElementById("cantidadCupos");

const ultimaActualizacion =
    document.getElementById("ultimaActualizacion");

const errorApi =
    document.getElementById("errorApi");

const mensajeError =
    document.getElementById("mensajeError");

const reintentar =
    document.getElementById("reintentar");

const whatsappPremium =
    document.getElementById("whatsappPremium");

const premiumMensaje =
    document.getElementById("premiumMensaje");


// ============================================================
// VARIABLES
// ============================================================

let especialidades = [];

let especialidadSeleccionada = "";


// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        cargarEspecialidades();

        configurarEventos();

    }
);


// ============================================================
// EVENTOS
// ============================================================

function configurarEventos() {

    buscador.addEventListener(
        "input",
        filtrarEspecialidades
    );

    limpiarBusqueda.addEventListener(
        "click",
        () => {

            buscador.value = "";

            filtrarEspecialidades();

            buscador.focus();

        }
    );

    reintentar.addEventListener(
        "click",
        cargarEspecialidades
    );

}


// ============================================================
// CARGAR ESPECIALIDADES
// ============================================================

async function cargarEspecialidades() {

    mostrarCargando();

    actualizarConexion(
        "loading",
        "● Conectando..."
    );

    try {

        const respuesta =
            await fetch(API_ESPECIALIDADES);

        const datos =
            await respuesta.json();

        if (!respuesta.ok || !datos.ok) {

            throw new Error(
                datos.error ||
                "No se pudo obtener la información."
            );

        }

        especialidades =
            datos.especialidades || [];

        actualizarConexion(
            "online",
            "● API conectada"
        );

        contadorEspecialidades.textContent =
            `${especialidades.length} especialidades disponibles`;

        ocultarError();

        renderizarEspecialidades(
            especialidades
        );

        restaurarEspecialidad();

    } catch (error) {

        console.error(error);

        actualizarConexion(
            "offline",
            "● Servicio no disponible"
        );

        mostrarError(
            "No pudimos obtener las especialidades. "
            + "El servicio del hospital puede estar temporalmente "
            + "no disponible."
        );

    }

}


// ============================================================
// RENDERIZAR ESPECIALIDADES
// ============================================================

function renderizarEspecialidades(
    lista
) {

    listaEspecialidades.innerHTML = "";

    sinResultados.classList.add(
        "hidden"
    );

    if (!lista.length) {

        sinResultados.classList.remove(
            "hidden"
        );

        return;

    }

    lista.forEach(
        especialidad => {

            const card =
                crearTarjetaEspecialidad(
                    especialidad
                );

            listaEspecialidades.appendChild(
                card
            );

        }
    );

}


// ============================================================
// CREAR TARJETA
// ============================================================

function crearTarjetaEspecialidad(
    especialidad
) {

    const card =
        document.createElement("button");

    card.type = "button";

    card.className =
        "specialty-card";

    if (
        especialidadSeleccionada &&
        especialidad.descripcion ===
        especialidadSeleccionada
    ) {

        card.classList.add(
            "active"
        );

    }

    const estado =
        obtenerEstadoEspecialidad(
            especialidad
        );

    card.innerHTML = `

        <div class="specialty-card-name">
            ${escaparHTML(
                especialidad.descripcion
            )}
        </div>

        <div class="specialty-card-status">

            <span
                class="status-dot ${estado.clase}"
            ></span>

            <span>
                ${estado.texto}
            </span>

        </div>

    `;

    card.addEventListener(
        "click",
        () => {

            seleccionarEspecialidad(
                especialidad.descripcion
            );

        }
    );

    return card;

}


// ============================================================
// ESTADO DE ESPECIALIDAD
// ============================================================

function obtenerEstadoEspecialidad(
    especialidad
) {

    if (especialidad.suspendido) {

        return {
            texto: "Suspendida",
            clase: "suspended"
        };

    }

    if (
        Number(especialidad.cupo) > 0
    ) {

        if (
            Number(especialidad.cupo) <= 5
        ) {

            return {
                texto: "Pocos cupos",
                clase: "warning"
            };

        }

        return {
            texto: "Disponibilidad",
            clase: "available"
        };

    }

    return {
        texto: "Sin cupos",
        clase: ""
    };

}


// ============================================================
// FILTRAR
// ============================================================

function filtrarEspecialidades() {

    const texto =
        buscador.value
            .trim()
            .toLowerCase();

    const filtradas =
        especialidades.filter(
            especialidad =>
                especialidad.descripcion
                    .toLowerCase()
                    .includes(texto)
        );

    renderizarEspecialidades(
        filtradas
    );

}


// ============================================================
// SELECCIONAR ESPECIALIDAD
// ============================================================

async function seleccionarEspecialidad(
    nombre
) {

    especialidadSeleccionada =
        nombre;

    localStorage.setItem(
        "turnoFacilEspecialidad",
        nombre
    );

    actualizarTarjetasActivas();

    buscador.value =
        nombre;

    ocultarError();

    resultado.classList.remove(
        "hidden"
    );

    resultado.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    mostrarResultadoCargando();

    actualizarWhatsApp(
        nombre
    );

    await consultarTurnos(
        nombre
    );

}


// ============================================================
// CONSULTAR TURNOS
// ============================================================

async function consultarTurnos(
    nombre
) {

    try {

        const url =
            `${API_TURNOS}?especialidad=${encodeURIComponent(
                nombre
            )}`;

        const respuesta =
            await fetch(url);

        const datos =
            await respuesta.json();

        if (
            !respuesta.ok ||
            !datos.ok
        ) {

            throw new Error(
                datos.mensaje ||
                datos.error ||
                "No se pudo consultar."
            );

        }

        mostrarResultado(
            datos
        );

    } catch (error) {

        console.error(error);

        mostrarResultadoError(
            error.message
        );

    }

}


// ============================================================
// MOSTRAR RESULTADO
// ============================================================

function mostrarResultado(
    datos
) {

    resultado.classList.remove(
        "hidden"
    );

    resultadoNombre.textContent =
        datos.nombre;

    cantidadCupos.textContent =
        datos.cupo;

    ultimaActualizacion.textContent =
        datos.actualizado;


    // Limpiar clases

    estadoBadge.className =
        "status-badge";


    // DISPONIBLE

    if (
        datos.estado ===
        "disponible"
    ) {

        estadoBadge.classList.add(
            "available"
        );

        estadoBadge.textContent =
            "Disponible";

        estadoIcon.textContent =
            "🎫";

        estadoTitulo.textContent =
            "Hay turnos disponibles";

        estadoMensaje.textContent =
            datos.mensaje;

    }


    // POCOS CUPOS

    else if (
        datos.estado ===
        "pocos"
    ) {

        estadoBadge.classList.add(
            "warning"
        );

        estadoBadge.textContent =
            "Pocos cupos";

        estadoIcon.textContent =
            "⚠️";

        estadoTitulo.textContent =
            "Hay pocos turnos";

        estadoMensaje.textContent =
            datos.mensaje;

    }


    // SIN CUPOS

    else if (
        datos.estado ===
        "sin_cupos"
    ) {

        estadoBadge.classList.add(
            "empty"
        );

        estadoBadge.textContent =
            "Sin cupos";

        estadoIcon.textContent =
            "📭";

        estadoTitulo.textContent =
            "No hay turnos disponibles";

        estadoMensaje.textContent =
            datos.mensaje;

    }


    // SUSPENDIDO

    else if (
        datos.estado ===
        "suspendido"
    ) {

        estadoBadge.classList.add(
            "suspended"
        );

        estadoBadge.textContent =
            "Suspendida";

        estadoIcon.textContent =
            "⏸️";

        estadoTitulo.textContent =
            "Especialidad suspendida";

        estadoMensaje.textContent =
            datos.mensaje;

    }

}


// ============================================================
// CARGANDO RESULTADO
// ============================================================

function mostrarResultadoCargando() {

    resultadoNombre.textContent =
        especialidadSeleccionada;

    estadoBadge.className =
        "status-badge warning";

    estadoBadge.textContent =
        "Consultando...";

    estadoIcon.textContent =
        "⏳";

    estadoTitulo.textContent =
        "Consultando disponibilidad...";

    estadoMensaje.textContent =
        "Estamos obteniendo la información actual.";

    cantidadCupos.textContent =
        "...";

    ultimaActualizacion.textContent =
        "...";

}


// ============================================================
// ERROR RESULTADO
// ============================================================

function mostrarResultadoError(
    mensaje
) {

    resultado.classList.remove(
        "hidden"
    );

    estadoBadge.className =
        "status-badge empty";

    estadoBadge.textContent =
        "Error";

    estadoIcon.textContent =
        "⚠️";

    estadoTitulo.textContent =
        "No se pudo consultar";

    estadoMensaje.textContent =
        mensaje;

    cantidadCupos.textContent =
        "-";

    ultimaActualizacion.textContent =
        "-";

}


// ============================================================
// MOSTRAR ERROR GENERAL
// ============================================================

function mostrarError(
    mensaje
) {

    errorApi.classList.remove(
        "hidden"
    );

    mensajeError.textContent =
        mensaje;

    listaEspecialidades.innerHTML =
        "";

    sinResultados.classList.add(
        "hidden"
    );

}


// ============================================================
// OCULTAR ERROR
// ============================================================

function ocultarError() {

    errorApi.classList.add(
        "hidden"
    );

}


// ============================================================
// MOSTRAR CARGANDO
// ============================================================

function mostrarCargando() {

    listaEspecialidades.innerHTML = `

        <div class="loading-card">

            <div class="spinner"></div>

            <p>
                Cargando especialidades...
            </p>

        </div>

    `;

}


// ============================================================
// CONEXIÓN
// ============================================================

function actualizarConexion(
    clase,
    texto
) {

    estadoConexion.className =
        `connection-status ${clase}`;

    estadoConexion.textContent =
        texto;

}


// ============================================================
// TARJETAS ACTIVAS
// ============================================================

function actualizarTarjetasActivas() {

    const tarjetas =
        document.querySelectorAll(
            ".specialty-card"
        );

    tarjetas.forEach(
        tarjeta => {

            tarjeta.classList.remove(
                "active"
            );

            const nombre =
                tarjeta.querySelector(
                    ".specialty-card-name"
                );

            if (
                nombre &&
                nombre.textContent ===
                especialidadSeleccionada
            ) {

                tarjeta.classList.add(
                    "active"
                );

            }

        }
    );

}


// ============================================================
// RESTAURAR ESPECIALIDAD
// ============================================================

function restaurarEspecialidad() {

    const guardada =
        localStorage.getItem(
            "turnoFacilEspecialidad"
        );

    if (!guardada) {
        return;
    }

    const existe =
        especialidades.some(
            especialidad =>
                especialidad.descripcion ===
                guardada
        );

    if (existe) {

        especialidadSeleccionada =
            guardada;

        actualizarTarjetasActivas();

    }

}


// ============================================================
// WHATSAPP PREMIUM
// ============================================================

function actualizarWhatsApp(
    especialidad
) {

    const mensaje =
        `Hola, quiero información sobre ` +
        `Turno Fácil Premium. ` +
        `Me interesa monitorear la especialidad: ` +
        `${especialidad}.`;

    const url =
        `https://wa.me/542634953664?text=` +
        encodeURIComponent(
            mensaje
        );

    whatsappPremium.href =
        url;

    premiumMensaje.textContent =
        `Podés consultarnos por WhatsApp ` +
        `indicando que querés monitorear ` +
        `"${especialidad}".`;

}


// ============================================================
// ACTUALIZACIÓN AUTOMÁTICA
// ============================================================

setInterval(
    async () => {

        if (
            especialidadSeleccionada
        ) {

            await consultarTurnos(
                especialidadSeleccionada
            );

        }

    },
    INTERVALO_ACTUALIZACION
);


// ============================================================
// ESCAPAR HTML
// ============================================================

function escaparHTML(
    texto
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        texto;

    return div.innerHTML;

}