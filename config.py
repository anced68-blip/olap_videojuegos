import os


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:123456@localhost:5432/videojuegos_olap"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False