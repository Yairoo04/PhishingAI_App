import json
import os
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_cors import CORS

bp = Blueprint("community", __name__)
CORS(bp)
logger = logging.getLogger(__name__)

# Data file to store reports
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
REPORTS_FILE = os.path.join(DATA_DIR, "community_reports.json")

# Ensure the data directory exists
os.makedirs(DATA_DIR, exist_ok=True)


def load_reports():
    """Load reports from the JSON file."""
    if not os.path.exists(REPORTS_FILE):
        return []
    try:
        with open(REPORTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading community reports: {e}")
        return []


def save_reports(reports):
    """Save reports to the JSON file."""
    try:
        with open(REPORTS_FILE, "w", encoding="utf-8") as f:
            json.dump(reports, f, ensure_ascii=False, indent=4)
        return True
    except Exception as e:
        logger.error(f"Error saving community reports: {e}")
        return False


def time_ago(timestamp):
    """Convert a timestamp to a relative time string (e.g., '2 minutes ago')."""
    try:
        dt = datetime.fromisoformat(timestamp)
        now = datetime.now()
        diff = now - dt

        if diff.total_seconds() < 60:
            return "Vừa xong"
        elif diff.total_seconds() < 3600:
            mins = int(diff.total_seconds() / 60)
            return f"{mins} phút trước"
        elif diff.total_seconds() < 86400:
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} giờ trước"
        else:
            days = diff.days
            return f"{days} ngày trước"
    except Exception:
        return "Gần đây"


@bp.route("/report", methods=["POST"])
def submit_report():
    """Handle a new community report submission."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Invalid JSON data"}), 400

        url = data.get("url", "").strip()
        report_type = data.get("type", "").strip()
        description = data.get("description", "").strip()

        if not url or not description:
            return jsonify({"error": "URL and description are required"}), 400

        new_report = {
            "url": url,
            "type": report_type,
            "description": description,
            "timestamp": datetime.now().isoformat()
        }

        # Load existing, prepend new, save the top 100 max
        reports = load_reports()
        reports.insert(0, new_report)
        reports = reports[:100]  # Keep only the latest 100 reports

        if save_reports(reports):
            logger.info(f"New community report saved for URL: {url}")
            return jsonify({"message": "Report submitted successfully", "report": new_report}), 201
        else:
            return jsonify({"error": "Failed to save report"}), 500

    except Exception as e:
        logger.exception("Error processing community report")
        return jsonify({"error": "Internal server error"}), 500


@bp.route("/recent", methods=["GET"])
def get_recent_reports():
    """Return the 20 most recent community reports."""
    try:
        raw_reports = load_reports()
        recent_20 = raw_reports[:20]

        # Format timestamps for display
        formatted_reports = []
        for r in recent_20:
            formatted_reports.append({
                "url": r.get("url", ""),
                "type": r.get("type", "Khác"),
                "description": r.get("description", ""),
                "time": time_ago(r.get("timestamp", ""))
            })

        return jsonify(formatted_reports), 200

    except Exception as e:
        logger.exception("Error retrieving recent reports")
        return jsonify({"error": "Internal server error"}), 500
