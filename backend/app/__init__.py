"""Application factory for the Inventory & Order Management System."""
import os

from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text

from .config import Config
from .extensions import db, migrate
from .errors import register_error_handlers

_DDL_LOCK_KEY = 91_234_567


def _create_tables(app: Flask) -> None:
    with app.app_context():
        engine = db.engine
        if engine.dialect.name == "postgresql":
            with engine.connect() as conn:
                conn.execute(text("SELECT pg_advisory_lock(:k)"), {"k": _DDL_LOCK_KEY})
                try:
                    db.create_all()
                finally:
                    conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": _DDL_LOCK_KEY})
        else:
            db.create_all()


def create_app(config_class: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})

    # Blueprints
    from .routes.products import products_bp
    from .routes.customers import customers_bp
    from .routes.orders import orders_bp
    from .routes.dashboard import dashboard_bp

    app.register_blueprint(products_bp)
    app.register_blueprint(customers_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(dashboard_bp)

    register_error_handlers(app)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    @app.get("/health/db")
    def health_db():
        try:
            db.session.execute(text("SELECT 1"))
            return jsonify({"status": "ok", "database": "connected"}), 200
        except Exception as exc:
            app.logger.warning("DB health check failed: %s", exc)
            return jsonify({"status": "error", "database": "unreachable"}), 503

    _create_tables(app)

    return app
