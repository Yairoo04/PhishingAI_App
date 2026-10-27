import os
import logging
import pandas as pd
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

bp = Blueprint("darkweb", __name__)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "breaches.csv")

_breach_df: pd.DataFrame = pd.DataFrame()
_breach_index: dict = {}   


def _load_dataset():
    global _breach_df, _breach_index

    if not os.path.exists(DATA_PATH):
        logger.warning(f"[DarkWeb] Dataset not found at: {DATA_PATH}")
        return

    try:
        df = pd.read_csv(DATA_PATH, dtype=str).fillna("")
        df["email"] = df["email"].str.strip().str.lower()
        _breach_df = df

        grouped = df.groupby("email", sort=False)
        _breach_index = {
            email: rows[["source", "year"]].to_dict("records")
            for email, rows in grouped
        }

        logger.info(f"[DarkWeb] Loaded {len(df):,} breach records, {len(_breach_index):,} unique emails.")
    except Exception as exc:
        logger.error(f"[DarkWeb] Failed to load dataset: {exc}")


_load_dataset()


@bp.route("/check", methods=["POST"])
def check_email():
    """
    POST /api/darkweb/check
    Body: { "email": "user@example.com" }

    Response (found):
        { "found": true, "breaches": 3, "sources": ["LinkedIn","Dropbox"], "years": [2021, 2020] }
    Response (not found):
        { "found": false, "breaches": 0 }
    """
    data = request.get_json(silent=True)
    if not data or not data.get("email"):
        return jsonify({"error": "Email is required."}), 400

    email_query = data["email"].strip().lower()

    if "@" not in email_query or "." not in email_query.split("@")[-1]:
        return jsonify({"error": "Invalid email format."}), 400

    records = _breach_index.get(email_query, [])

    if not records:
        return jsonify({"found": False, "breaches": 0})

    sources = list(dict.fromkeys(r["source"] for r in records if r.get("source")))
    years   = list(dict.fromkeys(int(r["year"]) for r in records if r.get("year").isdigit()))

    logger.info(f"[DarkWeb] Email '{email_query}' matched {len(records)} breach records.")

    return jsonify({
        "found":    True,
        "breaches": len(records),
        "sources":  sources,
        "years":    years,
    })


@bp.route("/reload", methods=["POST"])
def reload_dataset():
    _load_dataset()
    return jsonify({"status": "reloaded", "records": len(_breach_df)})
