from flask import Flask, render_template, jsonify, request
import requests
import json
from datetime import datetime

app = Flask(__name__)

# ============================================================
# CONFIGURACIÓN
# ============================================================

API_URL = "https://sganotti.mendoza.gov.ar/digisalud/WebServices/WebServiciosNotti.asmx/GetEntornoTurnosPublicosParticular"

PAYLOAD = {
    "nombrePlantilla": "PLT_PUBLIC_ESPE_TURNOS_PERRUPATO",
    "dni": ""
}

HOSPITAL_NOMBRE = "Hospital Perrupato"

# Número de WhatsApp para Premium
WHATSAPP_NUMERO = "542634953664"

# Página oficial para solicitar turnos
URL_TURNOS_OFICIAL = (
    "https://sganotti.mendoza.gov.ar/digisalud/comunicacion/"
    "solicitudturnosweb.aspx?"
    "plantilla=PLT_PUBLIC_ESPE_TURNOS_PERRUPATO"
    "&multiempresa=837328"
)


# ============================================================
# CONSULTAR API
# ============================================================

def consultar_api():
    """
    Consulta la API pública del hospital y devuelve
    todas las especialidades disponibles.
    """

    headers = {
        "Content-Type": "application/json; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36"
        )
    }

    try:
        response = requests.post(
            API_URL,
            json=PAYLOAD,
            headers=headers,
            timeout=15
        )

        response.raise_for_status()

        data = response.json()

        if "d" not in data:
            raise ValueError("La respuesta de la API no contiene el campo 'd'.")

        especialidades_json = data["d"]

        if isinstance(especialidades_json, str):
            especialidades = json.loads(especialidades_json)
        else:
            especialidades = especialidades_json

        if not isinstance(especialidades, list):
            raise ValueError("La respuesta de la API no tiene el formato esperado.")

        return especialidades

    except requests.exceptions.Timeout:
        print("ERROR: Tiempo de espera agotado al consultar la API.")
        return None

    except requests.exceptions.RequestException as e:
        print(f"ERROR HTTP al consultar la API: {e}")
        return None

    except json.JSONDecodeError as e:
        print(f"ERROR al interpretar JSON: {e}")
        return None

    except Exception as e:
        print(f"ERROR inesperado: {e}")
        return None


# ============================================================
# OBTENER ESPECIALIDADES
# ============================================================

def obtener_especialidades():
    """
    Obtiene las especialidades y las ordena alfabéticamente.
    """

    especialidades = consultar_api()

    if especialidades is None:
        return None

    resultado = []

    for especialidad in especialidades:

        nombre = str(
            especialidad.get("descripcion", "")
        ).strip()

        if not nombre:
            continue

        cupo = especialidad.get("cupo", 0)

        try:
            cupo = int(cupo)
        except (ValueError, TypeError):
            cupo = 0

        suspendido = especialidad.get(
            "suspendido",
            False
        )

        resultado.append({
            "descripcion": nombre,
            "cupo": cupo,
            "suspendido": bool(suspendido),
            "codigo": especialidad.get("codigo")
        })

    resultado.sort(
        key=lambda x: x["descripcion"].upper()
    )

    return resultado


# ============================================================
# BUSCAR ESPECIALIDAD
# ============================================================

def buscar_especialidad(nombre):
    """
    Busca una especialidad por nombre.
    """

    especialidades = obtener_especialidades()

    if especialidades is None:
        return None, "error"

    for especialidad in especialidades:

        if (
            especialidad["descripcion"].strip().upper()
            == nombre.strip().upper()
        ):
            return especialidad, None

    return None, "no_encontrada"


# ============================================================
# ANALIZAR DISPONIBILIDAD
# ============================================================

def analizar_especialidad(especialidad):
    """
    Determina el estado de una especialidad.
    """

    if especialidad is None:
        return {
            "estado": "error",
            "disponible": False,
            "mensaje": "No se pudo consultar la especialidad.",
            "cupo": 0
        }

    cupo = especialidad.get("cupo", 0)
    suspendido = especialidad.get("suspendido", False)

    if suspendido:

        return {
            "estado": "suspendido",
            "disponible": False,
            "mensaje": "Esta especialidad se encuentra suspendida.",
            "cupo": cupo
        }

    if cupo > 0:

        if cupo <= 5:

            mensaje = (
                f"Hay pocos cupos disponibles. "
                f"Actualmente quedan {cupo}."
            )

            estado = "pocos"

        else:

            mensaje = (
                f"Hay {cupo} cupos disponibles."
            )

            estado = "disponible"

        return {
            "estado": estado,
            "disponible": True,
            "mensaje": mensaje,
            "cupo": cupo
        }

    return {
        "estado": "sin_cupos",
        "disponible": False,
        "mensaje": "Actualmente no hay cupos disponibles.",
        "cupo": 0
    }


# ============================================================
# PÁGINA PRINCIPAL
# ============================================================

@app.route("/")
def index():

    return render_template(
        "index.html",
        hospital=HOSPITAL_NOMBRE,
        url_turnos=URL_TURNOS_OFICIAL
    )


# ============================================================
# API: TODAS LAS ESPECIALIDADES
# ============================================================

@app.route("/api/especialidades")
def api_especialidades():

    especialidades = obtener_especialidades()

    if especialidades is None:

        return jsonify({
            "ok": False,
            "error": "No se pudo conectar con la API del hospital.",
            "mensaje": (
                "El sistema no pudo obtener las especialidades "
                "en este momento."
            )
        }), 503

    return jsonify({
        "ok": True,
        "total": len(especialidades),
        "especialidades": especialidades,
        "actualizado": datetime.now().strftime(
            "%d/%m/%Y %H:%M:%S"
        )
    })


# ============================================================
# API: CONSULTAR UNA ESPECIALIDAD
# ============================================================

@app.route("/api/turnos")
def api_turnos():

    nombre = request.args.get(
        "especialidad",
        ""
    ).strip()

    if not nombre:

        return jsonify({
            "ok": False,
            "error": "No se indicó una especialidad."
        }), 400

    especialidad, error = buscar_especialidad(nombre)

    if error == "error":

        return jsonify({
            "ok": False,
            "error": "No se pudo consultar la API.",
            "mensaje": (
                "El servicio del hospital no respondió. "
                "Intentá nuevamente en unos momentos."
            )
        }), 503

    if error == "no_encontrada":

        return jsonify({
            "ok": False,
            "error": "Especialidad no encontrada.",
            "mensaje": (
                "La especialidad seleccionada ya no "
                "aparece en la información disponible."
            )
        }), 404

    resultado = analizar_especialidad(
        especialidad
    )

    return jsonify({
        "ok": True,
        "nombre": especialidad["descripcion"],
        "codigo": especialidad.get("codigo"),
        "cupo": resultado["cupo"],
        "suspendido": especialidad.get(
            "suspendido",
            False
        ),
        "estado": resultado["estado"],
        "disponible": resultado["disponible"],
        "mensaje": resultado["mensaje"],
        "actualizado": datetime.now().strftime(
            "%d/%m/%Y %H:%M:%S"
        )
    })


# ============================================================
# API: INFORMACIÓN PREMIUM
# ============================================================

@app.route("/api/premium")
def api_premium():

    return jsonify({
        "ok": True,
        "servicio": "Turno Fácil Premium",
        "whatsapp": WHATSAPP_NUMERO,
        "descripcion": (
            "Servicio de monitoreo automático "
            "de disponibilidad de turnos."
        )
    })


# ============================================================
# MANEJO DE ERRORES
# ============================================================

@app.errorhandler(404)
def pagina_no_encontrada(error):

    return render_template(
        "index.html",
        hospital=HOSPITAL_NOMBRE,
        url_turnos=URL_TURNOS_OFICIAL
    ), 404


@app.errorhandler(500)
def error_servidor(error):

    return jsonify({
        "ok": False,
        "error": "Error interno del servidor."
    }), 500


# ============================================================
# EJECUTAR
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("🏥 TURNO FÁCIL")
    print("=" * 60)
    print(f"Hospital: {HOSPITAL_NOMBRE}")
    print("Servidor: http://127.0.0.1:5000")
    print("=" * 60)

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )