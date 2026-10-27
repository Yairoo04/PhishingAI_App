from flask import Flask, send_from_directory
from flask_cors import CORS
import os
import logging
import webbrowser
from threading import Timer
from dotenv import load_dotenv

# Load .env configuration
load_dotenv()

from routes import url, image, file, email, android, domain, dashboard, darkweb, community, apikey

BUILD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "build"))
app = Flask(__name__, static_folder=BUILD_DIR, static_url_path="/")
CORS(app)


UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./Uploads")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("server.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)


class UnicodeSafeFormatter(logging.Formatter):
    def format(self, record):
        
        record.msg = record.msg.encode('ascii', errors='replace').decode('ascii')
        return super().format(record)


for handler in logging.getLogger().handlers:
    if isinstance(handler, logging.StreamHandler) and not isinstance(handler, logging.FileHandler):
        handler.setFormatter(UnicodeSafeFormatter("%(asctime)s - %(levelname)s - %(message)s"))


logger = logging.getLogger(__name__)


app.register_blueprint(url.bp, url_prefix="/api/url")
app.register_blueprint(image.bp, url_prefix="/api/image")
app.register_blueprint(file.bp, url_prefix="/api/file")
app.register_blueprint(email.bp, url_prefix="/api/email")
app.register_blueprint(android.bp, url_prefix="/api/android")
app.register_blueprint(domain.bp, url_prefix="/api/domain")
app.register_blueprint(dashboard.bp, url_prefix="/api/dashboard")
app.register_blueprint(darkweb.bp, url_prefix="/api/darkweb")
app.register_blueprint(community.bp, url_prefix="/api/community")
app.register_blueprint(apikey.bp, url_prefix="/api/apikey")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    index_path = os.path.join(app.static_folder, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(app.static_folder, "index.html")
    
    return "Frontend build not found. Please run 'npm run build' in frontend directory.", 404


@app.errorhandler(404)
def not_found(e):
    index_path = os.path.join(app.static_folder, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(app.static_folder, "index.html")
    return "Not found", 404


if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", 5000)))
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1", "t")
    
    logger.info(f"Starting Flask server on {host}:{port} (debug={debug_mode})")
    
    app.run(
        debug=debug_mode,
        host=host,
        port=port,
        threaded=True
    )