/* =========================================================
   TURNO FÁCIL
   JavaScript principal
========================================================= */


let especialidades = [];

let especialidadSeleccionada = "";


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        cargarEspecialidades();


        /*
        -----------------------------------------------------
        BUSCADOR
        -----------------------------------------------------
        */

        const buscador =
            document.getElementById(
                "buscador"
            );


        if (buscador) {

            buscador.addEventListener(
                "input",
                filtrarEspecialidades
            );

        }


        /*
        -----------------------------------------------------
        SELECT
        -----------------------------------------------------
        */

        const select =
            document.getElementById(
                "especialidad-select"
            );


        if (select) {

            select.addEventListener(
                "change",
                seleccionarEspecialidad
            );

        }


        /*
        -----------------------------------------------------
        BOTÓN ACTUALIZAR
        -----------------------------------------------------
        */

        const boton =
            document.getElementById(
                "boton-actualizar"
            );


        if (boton) {

            boton.addEventListener(
                "click",
                () => {

                    if (
                        especialidadSeleccionada
                    ) {

                        consultarTurnos(
                            true
                        );

                    } else {

                        cargarEspecialidades(
                            true
                        );

                    }

                }
            );

        }


        /*
        -----------------------------------------------------
        ACTUALIZACIÓN AUTOMÁTICA
        -----------------------------------------------------

        Cada 60 segundos se vuelve a consultar
        la especialidad seleccionada.
        */

        setInterval(
            () => {

                if (
                    especialidadSeleccionada
                ) {

                    consultarTurnos(
                        false
                    );

                }

            },
            60000
        );

    }
);


/* =========================================================
   CARGAR TODAS LAS ESPECIALIDADES
========================================================= */

async function cargarEspecialidades(
    mostrarCarga = false
) {

    const select =
        document.getElementById(
            "especialidad-select"
        );

    const loading =
        document.getElementById(
            "cargando-especialidades"
        );


    if (select) {

        select.disabled = true;

        select.innerHTML = `

            <option value="">
                Cargando especialidades...
            </option>

        `;

    }


    if (loading) {

        loading.style.display =
            "flex";

    }


    try {

        const respuesta =
            await fetch(
                "/api/especialidades"
            );


        if (!respuesta.ok) {

            throw new Error(
                "No se pudieron cargar las especialidades."
            );

        }


        const datos =
            await respuesta.json();


        if (!datos.ok) {

            throw new Error(
                datos.mensaje
            );

        }


        especialidades =
            datos.especialidades || [];


        llenarSelect(
            especialidades
        );


        console.log(
            `Se cargaron ${especialidades.length} especialidades.`
        );


    } catch (error) {

        console.error(
            error
        );


        if (select) {

            select.innerHTML = `

                <option value="">
                    Error al cargar especialidades
                </option>

            `;

        }


        mostrarError(
            "No pudimos cargar las especialidades.",
            "Intentá actualizar nuevamente."
        );


    } finally {

        if (select) {

            select.disabled = false;

        }


        if (loading) {

            loading.style.display =
                "none";

        }

    }

}


/* =========================================================
   LLENAR SELECT
========================================================= */

function llenarSelect(
    lista
) {

    const select =
        document.getElementById(
            "especialidad-select"
        );


    if (!select) {

        return;

    }


    select.innerHTML = "";


    /*
    ---------------------------------------------------------
    OPCIÓN INICIAL
    ---------------------------------------------------------
    */

    const opcionInicial =
        document.createElement(
            "option"
        );


    opcionInicial.value = "";

    opcionInicial.textContent =
        "Seleccioná una especialidad";


    select.appendChild(
        opcionInicial
    );


    /*
    ---------------------------------------------------------
    AGREGAR ESPECIALIDADES
    ---------------------------------------------------------
    */

    lista.forEach(
        especialidad => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                especialidad.descripcion;


            option.textContent =
                capitalizarTexto(
                    especialidad.descripcion
                );


            select.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   FILTRAR ESPECIALIDADES
========================================================= */

function filtrarEspecialidades(
    evento
) {

    const texto =
        evento.target.value
            .trim()
            .toLowerCase();


    const resultados =
        especialidades.filter(
            especialidad => {

                return especialidad.descripcion
                    .toLowerCase()
                    .includes(texto);

            }
        );


    llenarSelect(
        resultados
    );


    /*
    Si hay exactamente una coincidencia,
    la seleccionamos automáticamente.
    */

    if (
        resultados.length === 1 &&
        texto.length >= 3
    ) {

        const select =
            document.getElementById(
                "especialidad-select"
            );


        select.value =
            resultados[0].descripcion;

    }

}


/* =========================================================
   SELECCIONAR ESPECIALIDAD
========================================================= */

function seleccionarEspecialidad(
    evento
) {

    const nombre =
        evento.target.value;


    especialidadSeleccionada =
        nombre;


    if (!nombre) {

        mostrarEstadoInicial();

        return;

    }


    consultarTurnos(
        true
    );

}


/* =========================================================
   CONSULTAR TURNOS
========================================================= */

async function consultarTurnos(
    mostrarCarga = true
) {

    if (!especialidadSeleccionada) {

        return;

    }


    const estado =
        document.getElementById(
            "estado-container"
        );


    const cupos =
        document.getElementById(
            "cupos"
        );


    const ultima =
        document.getElementById(
            "ultima-actualizacion"
        );


    const boton =
        document.getElementById(
            "boton-turno"
        );


    const refresh =
        document.getElementById(
            "refresh-icon"
        );


    /*
    ---------------------------------------------------------
    ANIMACIÓN
    ---------------------------------------------------------
    */

    if (refresh) {

        refresh.classList.add(
            "rotating"
        );

    }


    /*
    ---------------------------------------------------------
    MOSTRAR CARGA
    ---------------------------------------------------------
    */

    if (
        mostrarCarga &&
        estado
    ) {

        estado.className =
            "status-box neutral";

        estado.innerHTML = `

            <div class="status-icon">
                🔎
            </div>

            <div>

                <strong>
                    Consultando disponibilidad...
                </strong>

                <span>
                    Estamos verificando los turnos.
                </span>

            </div>

        `;

    }


    try {

        const url =
            "/api/turnos?especialidad="
            +
            encodeURIComponent(
                especialidadSeleccionada
            );


        const respuesta =
            await fetch(url);


        if (!respuesta.ok) {

            throw new Error(
                "Error al consultar turnos."
            );

        }


        const datos =
            await respuesta.json();


        if (!datos.ok) {

            throw new Error(
                datos.mensaje
            );

        }


        /*
        -----------------------------------------------------
        CUPOS
        -----------------------------------------------------
        */

        if (cupos) {

            cupos.textContent =
                datos.cupo ?? 0;

        }


        /*
        -----------------------------------------------------
        HORA
        -----------------------------------------------------
        */

        if (ultima) {

            ultima.textContent =
                obtenerHora(
                    datos.ultima_actualizacion
                );

        }


        /*
        -----------------------------------------------------
        ESTADO
        -----------------------------------------------------
        */

        mostrarEstado(
            datos
        );


        /*
        -----------------------------------------------------
        BOTÓN
        -----------------------------------------------------
        */

        if (boton) {

            boton.classList.remove(
                "disabled"
            );

        }


    } catch (error) {

        console.error(
            error
        );


        mostrarError(
            "No pudimos consultar los turnos.",
            "Intentá actualizar nuevamente."
        );


        if (cupos) {

            cupos.textContent =
                "—";

        }


    } finally {

        if (refresh) {

            refresh.classList.remove(
                "rotating"
            );

        }

    }

}


/* =========================================================
   MOSTRAR ESTADO
========================================================= */

function mostrarEstado(
    datos
) {

    const container =
        document.getElementById(
            "estado-container"
        );


    if (!container) {

        return;

    }


    /*
    ---------------------------------------------------------
    SUSPENDIDO
    ---------------------------------------------------------
    */

    if (datos.suspendido) {

        container.className =
            "status-box warning";

        container.innerHTML = `

            <div class="status-icon">
                ⚠️
            </div>

            <div>

                <strong>
                    Especialidad suspendida
                </strong>

                <span>
                    Por el momento no hay turnos disponibles.
                </span>

            </div>

        `;

        return;

    }


    /*
    ---------------------------------------------------------
    DISPONIBLE
    ---------------------------------------------------------
    */

    if (datos.disponible) {

        container.className =
            "status-box success";

        container.innerHTML = `

            <div class="status-icon">
                ✓
            </div>

            <div>

                <strong>
                    ¡Hay turnos disponibles!
                </strong>

                <span>
                    ${datos.mensaje}
                </span>

            </div>

        `;

        return;

    }


    /*
    ---------------------------------------------------------
    SIN TURNOS
    ---------------------------------------------------------
    */

    container.className =
        "status-box danger";

    container.innerHTML = `

        <div class="status-icon">
            ×
        </div>

        <div>

            <strong>
                No hay turnos disponibles
            </strong>

            <span>
                El sistema continúa verificando.
            </span>

        </div>

    `;

}


/* =========================================================
   ESTADO INICIAL
========================================================= */

function mostrarEstadoInicial() {

    const container =
        document.getElementById(
            "estado-container"
        );


    const cupos =
        document.getElementById(
            "cupos"
        );


    const ultima =
        document.getElementById(
            "ultima-actualizacion"
        );


    const boton =
        document.getElementById(
            "boton-turno"
        );


    if (container) {

        container.className =
            "status-box neutral";

        container.innerHTML = `

            <div class="status-icon">
                🔎
            </div>

            <div>

                <strong>
                    Seleccioná una especialidad
                </strong>

                <span>
                    Te mostraremos si hay turnos disponibles.
                </span>

            </div>

        `;

    }


    if (cupos) {

        cupos.textContent =
            "—";

    }


    if (ultima) {

        ultima.textContent =
            "—";

    }


    if (boton) {

        boton.classList.add(
            "disabled"
        );

    }

}


/* =========================================================
   ERROR
========================================================= */

function mostrarError(
    titulo,
    mensaje
) {

    const container =
        document.getElementById(
            "estado-container"
        );


    if (!container) {

        return;

    }


    container.className =
        "status-box danger";


    container.innerHTML = `

        <div class="status-icon">
            ⚠️
        </div>

        <div>

            <strong>
                ${titulo}
            </strong>

            <span>
                ${mensaje}
            </span>

        </div>

    `;

}


/* =========================================================
   OBTENER HORA
========================================================= */

function obtenerHora(
    fecha
) {

    if (!fecha) {

        return "—";

    }


    const partes =
        fecha.split(" ");


    if (
        partes.length >= 2
    ) {

        return partes[1]
            .substring(0, 5);

    }


    return fecha;

}


/* =========================================================
   CAPITALIZAR
========================================================= */

function capitalizarTexto(
    texto
) {

    if (!texto) {

        return "";

    }


    /*
    Mantiene siglas y palabras especiales
    razonablemente legibles.
    */

    return texto
        .toLowerCase()
        .replace(
            /(^|\s)\S/g,
            letra => letra.toUpperCase()
        );

}