from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

db = SQLAlchemy()


# ── ORM Model ────────────────────────────────────────────────

class Videojuego(db.Model):
    """
    Modelo ORM que mapea la tabla principal de videojuegos.
    Ajusta el nombre de tabla/columnas según tu base de datos.
    """
    __tablename__ = "videojuegos_ventas"

    id           = db.Column(db.Integer, primary_key=True)
    name         = db.Column(db.String(255))
    platform     = db.Column(db.String(50))
    year         = db.Column(db.Integer)
    genre        = db.Column(db.String(100))
    publisher    = db.Column(db.String(255))
    na_sales     = db.Column(db.Numeric(10, 2))
    eu_sales     = db.Column(db.Numeric(10, 2))
    jp_sales     = db.Column(db.Numeric(10, 2))
    other_sales  = db.Column(db.Numeric(10, 2))
    global_sales = db.Column(db.Numeric(10, 2))

    def to_dict(self):
        return {
            "name":         self.name,
            "platform":     self.platform,
            "year":         self.year,
            "genre":        self.genre,
            "publisher":    self.publisher,
            "na_sales":     float(self.na_sales     or 0),
            "eu_sales":     float(self.eu_sales     or 0),
            "jp_sales":     float(self.jp_sales     or 0),
            "other_sales":  float(self.other_sales  or 0),
            "global_sales": float(self.global_sales or 0),
        }


# ── Vista OLAP ───────────────────────────────────────────────
# Se accede a través de la vista vw_videojuegos_olap.
# Si no existe, puedes crearla con:
#   CREATE VIEW vw_videojuegos_olap AS
#   SELECT * FROM videojuegos_ventas WHERE global_sales IS NOT NULL;
VISTA = "vw_videojuegos_olap"


# ── Filtros dinámicos ─────────────────────────────────────────

def _aplicar_filtros(sql: str, filtros: dict):
    """Agrega cláusulas WHERE dinámicas según los filtros activos."""
    conds  = []
    params = {}

    if filtros.get("year"):
        conds.append("year = :year")
        params["year"] = int(filtros["year"])

    if filtros.get("genre"):
        conds.append("genre = :genre")
        params["genre"] = filtros["genre"]

    if filtros.get("platform"):
        conds.append("platform = :platform")
        params["platform"] = filtros["platform"]

    if filtros.get("publisher"):
        conds.append("publisher = :publisher")
        params["publisher"] = filtros["publisher"]

    if conds:
        sql += " WHERE " + " AND ".join(conds)

    return sql, params


# ── Queries ───────────────────────────────────────────────────

def obtener_filtros():
    """Valores únicos para los selectores del dashboard."""
    sql = f"""
        SELECT
            ARRAY_AGG(DISTINCT year      ORDER BY year)      AS years,
            ARRAY_AGG(DISTINCT genre     ORDER BY genre)     AS genres,
            ARRAY_AGG(DISTINCT platform  ORDER BY platform)  AS platforms,
            ARRAY_AGG(DISTINCT publisher ORDER BY publisher) AS publishers
        FROM {VISTA};
    """
    row = db.session.execute(text(sql)).mappings().first()
    return {
        "years":      row["years"]      or [],
        "genres":     row["genres"]     or [],
        "platforms":  row["platforms"]  or [],
        "publishers": row["publishers"] or [],
    }


def obtener_kpis(filtros):
    """KPIs principales del dashboard."""
    # Totales
    sql_g, p_g = _aplicar_filtros(
        f"SELECT ROUND(SUM(global_sales)::numeric,2) AS total_ventas, COUNT(*) AS total_videojuegos FROM {VISTA}", filtros)
    general = db.session.execute(text(sql_g), p_g).mappings().first()

    # Año líder
    sql_a, p_a = _aplicar_filtros(
        f"SELECT year, ROUND(SUM(global_sales)::numeric,2) AS ventas FROM {VISTA}", filtros)
    sql_a += " GROUP BY year ORDER BY ventas DESC LIMIT 1"
    anio = db.session.execute(text(sql_a), p_a).mappings().first()

    # Género líder
    sql_ge, p_ge = _aplicar_filtros(
        f"SELECT genre, ROUND(SUM(global_sales)::numeric,2) AS ventas FROM {VISTA}", filtros)
    sql_ge += " GROUP BY genre ORDER BY ventas DESC LIMIT 1"
    genero = db.session.execute(text(sql_ge), p_ge).mappings().first()

    # Plataforma líder
    sql_pl, p_pl = _aplicar_filtros(
        f"SELECT platform, ROUND(SUM(global_sales)::numeric,2) AS ventas FROM {VISTA}", filtros)
    sql_pl += " GROUP BY platform ORDER BY ventas DESC LIMIT 1"
    plataforma = db.session.execute(text(sql_pl), p_pl).mappings().first()

    # Publisher líder
    sql_pu, p_pu = _aplicar_filtros(
        f"SELECT publisher, ROUND(SUM(global_sales)::numeric,2) AS ventas FROM {VISTA}", filtros)
    sql_pu += " GROUP BY publisher ORDER BY ventas DESC LIMIT 1"
    publisher = db.session.execute(text(sql_pu), p_pu).mappings().first()

    return {
        "total_ventas":            float(general["total_ventas"]   or 0),
        "total_videojuegos":       int(general["total_videojuegos"] or 0),
        "anio_mayor_venta":        anio["year"]       if anio       else "Sin datos",
        "genero_mas_vendido":      genero["genre"]    if genero     else "Sin datos",
        "plataforma_mas_vendida":  plataforma["platform"] if plataforma else "Sin datos",
        "publisher_mas_relevante": publisher["publisher"] if publisher  else "Sin datos",
    }


def ventas_por_anio(filtros):
    sql, p = _aplicar_filtros(
        f"SELECT year, ROUND(SUM(global_sales)::numeric,2) AS ventas FROM {VISTA}", filtros)
    sql += " GROUP BY year ORDER BY year"
    return [dict(r) for r in db.session.execute(text(sql), p).mappings()]


def ventas_por_genero(filtros):
    sql, p = _aplicar_filtros(
        f"SELECT genre, ROUND(SUM(global_sales)::numeric,2) AS ventas FROM {VISTA}", filtros)
    sql += " GROUP BY genre ORDER BY ventas DESC"
    return [dict(r) for r in db.session.execute(text(sql), p).mappings()]


def ventas_por_plataforma(filtros):
    sql, p = _aplicar_filtros(
        f"SELECT platform, ROUND(SUM(global_sales)::numeric,2) AS ventas FROM {VISTA}", filtros)
    sql += " GROUP BY platform ORDER BY ventas DESC LIMIT 10"
    return [dict(r) for r in db.session.execute(text(sql), p).mappings()]


def ventas_por_region(filtros):
    sql, p = _aplicar_filtros(
        f"""SELECT
            ROUND(SUM(na_sales)::numeric,2)    AS na_sales,
            ROUND(SUM(eu_sales)::numeric,2)    AS eu_sales,
            ROUND(SUM(jp_sales)::numeric,2)    AS jp_sales,
            ROUND(SUM(other_sales)::numeric,2) AS other_sales
        FROM {VISTA}""", filtros)
    row = db.session.execute(text(sql), p).mappings().first()
    return {
        "na_sales":    float(row["na_sales"]    or 0),
        "eu_sales":    float(row["eu_sales"]    or 0),
        "jp_sales":    float(row["jp_sales"]    or 0),
        "other_sales": float(row["other_sales"] or 0),
    }


def top_videojuegos(filtros):
    sql, p = _aplicar_filtros(
        f"SELECT name, ROUND(SUM(global_sales)::numeric,2) AS ventas FROM {VISTA}", filtros)
    sql += " GROUP BY name ORDER BY ventas DESC LIMIT 10"
    return [dict(r) for r in db.session.execute(text(sql), p).mappings()]


def obtener_tabla(filtros):
    sql, p = _aplicar_filtros(
        f"SELECT name, platform, year, genre, publisher, global_sales FROM {VISTA}", filtros)
    sql += " ORDER BY global_sales DESC LIMIT 1000"
    return [dict(r) for r in db.session.execute(text(sql), p).mappings()]
