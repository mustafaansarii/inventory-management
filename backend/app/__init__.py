"""Application factory for the Inventory & Order Management System."""
import os

from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .extensions import db, migrate
from .errors import register_error_handlers


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

    # Create tables automatically on startup (simple deployments without migrations)
    with app.app_context():
        db.create_all()

    return app
