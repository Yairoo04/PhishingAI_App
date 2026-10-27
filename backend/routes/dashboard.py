from flask import Blueprint, jsonify, request
import logging
from utils.database import get_all_scans, get_dashboard_stats, insert_scan

bp = Blueprint("dashboard", __name__)
logger = logging.getLogger(__name__)

@bp.route("/stats", methods=["GET"])
def get_stats():
    """
    Returns dashboard statistics combined with recent scan history.
    """
    try:
        # Load calculated dashboard statistics
        stats = get_dashboard_stats()
        
        # Load up to 100 recent scans for the history panel
        history = get_all_scans(limit=100)
        
        return jsonify({
            **stats,
            "recent_scans": history
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        return jsonify({"error": "Failed to fetch dashboard stats"}), 500

@bp.route("/history", methods=["GET"])
def get_history():
    """
    Returns the full scan history.
    """
    try:
        history = get_all_scans(limit=1000)
        return jsonify(history), 200
    except Exception as e:
        logger.error(f"Error fetching scan history: {e}")
        return jsonify({"error": "Failed to fetch scan history"}), 500

@bp.route("/record", methods=["POST"])
def record_scan():
    """
    Internal/frontend route to record a scan into the database.
    Replaces the localstorage `saveScan` logic.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing payload"}), 400
            
        scan_type = data.get("type", "unknown")
        target = data.get("target", "unknown")
        result = data.get("result", "unknown")
        confidence = float(data.get("confidence", 0.0))
        icon = data.get("icon", "bx-search")
        
        insert_scan(scan_type, target, result, confidence, icon)
        
        return jsonify({"message": "Scan recorded successfully"}), 201
        
    except Exception as e:
        logger.error(f"Error recording scan: {e}")
        return jsonify({"error": "Failed to record scan"}), 500
