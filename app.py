from flask import Flask, render_template, jsonify, request
import requests
import json
from datetime import datetime

app = Flask(__name__)


# ==========================================================
# CONFIGURACIÓN
# ==========================================================

API_URL = (
    "https://sganotti.mendoza.gov.ar/digisalud/"
    "WebServices/WebServiciosNotti.asmx/"
    "GetEntornoTurnosPublicosParticular"
)

PAYLOAD = {
    "nombrePlantilla": "PLT_PUBLIC_ESPE_TURNOS_PERRUPATO",
    "dni": ""
}


# ==========================================================
# CONSULTAR API DEL HOSPITAL
# ==========================================================

def consultar_api():
    """
    Consulta la API pública del Hospital Sganotti
    y devuelve todas las especialidades.
    """

    try:

        headers = {
            "Content-Type": "application/json; charset=UTF-8",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36"
            )
        }

        response = requests.post(
            API_URL,
            json=PAYLOAD,
            headers=headers,
            timeout=15
        )

        if response.status_code != 200:

            print(
                f"Error API: {response.status_code}"
            )

            return None


        data = response.json()


        # La API devuelve los datos dentro de "d"
        if "d" not in data:

            print(
                "La respuesta no contiene el campo 'd'"
            )

            return None


        especialidades_json = data["d"]


        # En algunas respuestas puede venir como
        # string JSON.
        if isinstance(especialidades_json, str):

            especialidades = json.loads(
                especialidades_json
            )

        else:

            especialidades = especialidades_json


        return especialidades


    except requests.exceptions.Timeout:

        print(
            "Tiempo de espera agotado al consultar la API."
        )

        return None


    except requests.exceptions.RequestException as error:

        print(
            f"Error de conexión con la API: {error}"
        )

        return None


    except json.JSONDecodeError as error:

        print(
            f"Error al interpretar la respuesta: {error}"
        )

        return None


    except Exception as error:

        print(
            f"Error inesperado: {error}"
        )

        return None


# ==========================================================
# LIMPIAR ESPECIALIDADES
# ==========================================================

def obtener_especialidades():

    datos = consultar_api()

    if not datos:

        return []


    resultado = []


    for especialidad in datos:

        descripcion = (
            especialidad.get(
                "descripcion",
                ""
            )
            or ""
        ).strip()


        if not descripcion:

            continue


        resultado.append({

            "descripcion": descripcion,

            "codigo": especialidad.get(
                "codigo",
                ""
            ),

            "cupo": especialidad.get(
                "cupo",
                0
            ),

            "suspendido": especialidad.get(
                "suspendido",
                False
            )

        })


    # Orden alfabético
    resultado.sort(
        key=lambda x: x["descripcion"].upper()
    )


    return resultado


# ==========================================================
# BUSCAR UNA ESPECIALIDAD
# ==========================================================

def buscar_especialidad(nombre):

    datos = consultar_api()

    if not datos:

        return None


    nombre_buscado = (
        nombre.strip().upper()
    )


    for especialidad in datos:

        descripcion = (
            especialidad.get(
                "descripcion",
                ""
            )
            or ""
        )


        if descripcion.upper() == nombre_buscado:

            return especialidad


    return None


# ==========================================================
# DETERMINAR ESTADO
# ==========================================================

def analizar_especialidad(especialidad):

    if not especialidad:

        return {

            "encontrada": False,

            "disponible": False,

            "cupo": 0,

            "suspendido": False,

            "mensaje":
                "No se encontró la especialidad."

        }


    cupo = especialidad.get(
        "cupo",
        0
    )

    suspendido = especialidad.get(
        "suspendido",
        False
    )


    # Convertimos el cupo a número
    try:

        cupo = int(cupo)

    except (ValueError, TypeError):

        cupo = 0


    disponible = (
        cupo > 0
        and not suspendido
    )


    if suspendido:

        mensaje = (
            "La especialidad se encuentra "
            "temporalmente suspendida."
        )


    elif cupo > 0:

        if cupo <= 5:

            mensaje = (
                f"Hay pocos cupos disponibles: "
                f"{cupo}."
            )

        else:

            mensaje = (
                f"Hay {cupo} cupos disponibles."
            )


    else:

        mensaje = (
            "No hay turnos disponibles "
            "en este momento."
        )


    return {

        "encontrada": True,

        "disponible": disponible,

        "cupo": cupo,

        "suspendido": suspendido,

        "nombre":
            especialidad.get(
                "descripcion",
                ""
            ),

        "codigo":
            especialidad.get(
                "codigo",
                ""
            ),

        "mensaje": mensaje

    }


# ==========================================================
# PÁGINA PRINCIPAL
# ==========================================================

@app.route("/")
def inicio():

    return render_template(
        "index.html"
    )


# ==========================================================
# API: TODAS LAS ESPECIALIDADES
# ==========================================================

@app.route("/api/especialidades")
def api_especialidades():

    especialidades = (
        obtener_especialidades()
    )


    if not especialidades:

        return jsonify({

            "ok": False,

            "mensaje":
                "No se pudieron obtener "
                "las especialidades del hospital.",

            "especialidades": []

        }), 503


    return jsonify({

        "ok": True,

        "cantidad":
            len(especialidades),

        "especialidades":
            especialidades,

        "ultima_actualizacion":
            datetime.now().strftime(
                "%d/%m/%Y %H:%M:%S"
            )

    })


# ==========================================================
# API: CONSULTAR UNA ESPECIALIDAD
# ==========================================================

@app.route("/api/turnos")
def api_turnos():

    nombre = request.args.get(
        "especialidad",
        ""
    ).strip()


    if not nombre:

        return jsonify({

            "ok": False,

            "mensaje":
                "No se indicó una especialidad."

        }), 400


    especialidad = buscar_especialidad(
        nombre
    )


    resultado = analizar_especialidad(
        especialidad
    )


    resultado["ok"] = True

    resultado["ultima_actualizacion"] = (
        datetime.now().strftime(
            "%d/%m/%Y %H:%M:%S"
        )
    )


    return jsonify(resultado)


# ==========================================================
# EJECUCIÓN
# ==========================================================

if __name__ == "__main__":

    print("=" * 60)
    print("🏥 TURNO FÁCIL")
    print("=" * 60)
    print("Servidor iniciado.")
    print("http://127.0.0.1:5000")
    print("=" * 60)

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )