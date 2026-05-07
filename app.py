from flask import Flask, render_template, jsonify, request
from config import Config
from models import (
    db,
    obtener_filtros,
    obtener_kpis,
    ventas_por_anio,
    ventas_por_genero,
    ventas_por_plataforma,
    ventas_por_region,
    top_videojuegos,
    obtener_tabla,
)

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)


# ── Vistas HTML ──────────────────────────────────────────────

@app.route("/")
def inicio():
    return render_template("inicio.html")


@app.route("/dashboard")
def dashboard():
    return render_template("index.html")


# ── API: Filtros ─────────────────────────────────────────────

@app.route("/api/filtros")
def api_filtros():
    try:
        return jsonify(obtener_filtros())
    except Exception as e:
        return jsonify({"error": "Error al obtener filtros", "detalle": str(e)}), 500


# ── API: Dashboard ───────────────────────────────────────────

@app.route("/api/dashboard")
def api_dashboard():
    try:
        filtros = {
            "year":      request.args.get("year"),
            "genre":     request.args.get("genre"),
            "platform":  request.args.get("platform"),
            "publisher": request.args.get("publisher"),
        }
        data = {
            "kpis":              obtener_kpis(filtros),
            "ventas_anio":       ventas_por_anio(filtros),
            "ventas_genero":     ventas_por_genero(filtros),
            "ventas_plataforma": ventas_por_plataforma(filtros),
            "ventas_region":     ventas_por_region(filtros),
            "top_videojuegos":   top_videojuegos(filtros),
            "tabla":             obtener_tabla(filtros),
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": "Error al cargar dashboard", "detalle": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
