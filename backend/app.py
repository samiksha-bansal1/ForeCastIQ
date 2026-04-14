"""
app.py
Flask application factory.
Registers all route blueprints and configures CORS.
Run with: flask run  (or python app.py for development)
"""

import re
import logging
from flask import Flask
from flask_cors import CORS

from config import config
from routes.forecast import forecast_bp
from routes.anomalies import anomalies_bp
from routes.scenario import scenario_bp

# Configure module-level logger — no print() statements anywhere
logging.basicConfig(
    level=logging.DEBUG if config.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["DEBUG"] = config.DEBUG

    # Allow requests from production URL, all Vercel preview URLs, and localhost
    allowed_origins = [
        config.FRONTEND_URL,
        re.compile(r"https://fore-cast-.*\.vercel\.app"),
        "http://localhost:3000",
    ]
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

    # Register route blueprints
    app.register_blueprint(forecast_bp,  url_prefix="/api")
    app.register_blueprint(anomalies_bp, url_prefix="/api")
    app.register_blueprint(scenario_bp,  url_prefix="/api")

    # Health check — useful for verifying the server is up
    @app.get("/health")
    def health():
        return {"status": "ok", "version": "1.0.0"}

    logger.info("ForecastIQ backend ready — CORS origin: %s", config.FRONTEND_URL)
    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=config.DEBUG, port=5000)