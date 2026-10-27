"""
API Key Management Route — PhishGuard
  POST /api/apikey/generate   → create & return a new API key
  POST /api/apikey/scan       → proxy phishing scan (rate-limited 10/day)
  GET  /api/apikey/usage      → return usage info for a key
"""
import json
import os
import uuid
import logging
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_cors import CORS

bp = Blueprint("apikey", __name__)
CORS(bp)
logger = logging.getLogger(__name__)

# ── Persistence ─────────────────────────────────────────────────────────────
DATA_DIR  = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
KEYS_FILE = os.path.join(DATA_DIR, "api_keys.json")
os.makedirs(DATA_DIR, exist_ok=True)

DAILY_LIMIT = 10  # max scans per key per day


# ── Helpers ──────────────────────────────────────────────────────────────────
def load_keys() -> dict:
    """Load {api_key: {created, usage: {YYYY-MM-DD: count}}}"""
    if not os.path.exists(KEYS_FILE):
        return {}
    try:
        with open(KEYS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading api_keys: {e}")
        return {}


def save_keys(data: dict) -> bool:
    try:
        with open(KEYS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving api_keys: {e}")
        return False


def today_str() -> str:
    return date.today().isoformat()


def get_key_info(key: str, keys: dict) -> dict | None:
    return keys.get(key)


def used_today(key_info: dict) -> int:
    return key_info.get("usage", {}).get(today_str(), 0)


def increment_usage(key: str, keys: dict) -> int:
    today = today_str()
    key_info = keys[key]
    key_info.setdefault("usage", {})
    key_info["usage"][today] = key_info["usage"].get(today, 0) + 1
    save_keys(keys)
    return key_info["usage"][today]


def require_api_key(keys: dict):
    """Read X-API-Key header and validate it. Returns (key, key_info, error_response)."""
    key = request.headers.get("X-API-Key", "").strip()
    if not key:
        return None, None, (jsonify({"error": "Missing X-API-Key header"}), 401)
    key_info = get_key_info(key, keys)
    if key_info is None:
        return None, None, (jsonify({"error": "Invalid API key"}), 403)
    return key, key_info, None


# ── Routes ───────────────────────────────────────────────────────────────────

@bp.route("/generate", methods=["POST"])
def generate_key():
    """Generate a new API key and persist it."""
    try:
        keys = load_keys()
        new_key = "pg_" + uuid.uuid4().hex
        keys[new_key] = {
            "created": datetime.now().isoformat(),
            "usage": {},
        }
        if not save_keys(keys):
            return jsonify({"error": "Failed to save key"}), 500
        logger.info(f"New API key generated: {new_key[:10]}…")
        return jsonify({
            "api_key": new_key,
            "daily_limit": DAILY_LIMIT,
            "message": "API key created successfully",
        }), 201
    except Exception as e:
        logger.exception("Error generating API key")
        return jsonify({"error": str(e)}), 500


@bp.route("/usage", methods=["GET"])
def get_usage():
    """Return usage stats for the provided API key."""
    try:
        keys = load_keys()
        key, key_info, err = require_api_key(keys)
        if err:
            return err
        today = today_str()
        used = used_today(key_info)
        return jsonify({
            "api_key_prefix": key[:10] + "…",
            "daily_limit": DAILY_LIMIT,
            "used_today": used,
            "remaining_today": max(0, DAILY_LIMIT - used),
            "date": today,
            "created": key_info.get("created"),
        }), 200
    except Exception as e:
        logger.exception("Error fetching usage")
        return jsonify({"error": str(e)}), 500


@bp.route("/scan", methods=["POST"])
def api_scan():
    """
    Proxy a phishing URL scan using the internal ML model.
    Rate-limited to DAILY_LIMIT scans per key per day.
    """
    try:
        keys = load_keys()
        key, key_info, err = require_api_key(keys)
        if err:
            return err

        # ── Rate limit check ─────────────────────────────────────────────
        used = used_today(key_info)
        if used >= DAILY_LIMIT:
            return jsonify({
                "error": f"Daily limit of {DAILY_LIMIT} scans reached. Quota resets at midnight.",
                "used_today": used,
                "daily_limit": DAILY_LIMIT,
            }), 429

        data = request.get_json(silent=True)
        if not data or "url" not in data:
            return jsonify({"error": "Missing 'url' field in request body"}), 400

        target_url = data["url"].strip()
        if not target_url:
            return jsonify({"error": "URL cannot be empty"}), 400

        # ── Delegate to the existing URL scan route ───────────────────────
        from routes.url import predict_url_endpoint
        from flask import current_app

        with current_app.test_request_context(
            "/api/url/scan",
            method="POST",
            json={"url": target_url},
            content_type="application/json",
        ):
            # Increment usage BEFORE calling the model (prevent free retries on error)
            count = increment_usage(key, keys)
            result = predict_url_endpoint()
            # predict_url_endpoint returns a Response or (Response, status)
            if isinstance(result, tuple):
                resp, status = result
            else:
                resp, status = result, 200

            # Enrich response with rate-limit metadata
            try:
                payload = json.loads(resp.get_data(as_text=True))
            except Exception:
                payload = {}

            payload["rate_limit"] = {
                "daily_limit": DAILY_LIMIT,
                "used_today": count,
                "remaining_today": max(0, DAILY_LIMIT - count),
            }

            logger.info(f"API scan | key={key[:10]}… | url={target_url} | used={count}/{DAILY_LIMIT}")
            return jsonify(payload), status

    except Exception as e:
        logger.exception("API scan failed")
        return jsonify({"error": str(e)}), 500
