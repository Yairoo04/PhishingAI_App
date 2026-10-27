"""
Email Phishing Detection Route — Adversarial-Hardened Version
Uses models_advance ensemble with adversarial meta-feature:
  has_ical_url flag (iCalendar URL injection) injected into XGBoost meta-classifier.
"""
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import pandas as pd
import pickle
import numpy as np
from email import policy
from email.parser import BytesParser
from datetime import datetime
import re
import logging
import os
import shap
from pathlib import Path

from utils.common import temp_file
from utils.file_third_party import check_scanii_from_file
from utils.adversarial_helpers import check_email_ical_payload

bp = Blueprint("email", __name__)
logger = logging.getLogger(__name__)


# ── Model directory: prefer models_advance, fallback to models ──────────────
_BASE        = Path(__file__).resolve().parents[2]
_ADVANCE_DIR = _BASE / "models_advance"
_LEGACY_DIR  = _BASE / "models"
MODEL_DIR    = str(_ADVANCE_DIR if _ADVANCE_DIR.exists() else _LEGACY_DIR)
logger.info(f"[Email route] Using model directory: {MODEL_DIR}")

ALLOWED_EMAIL_EXTENSION = {"eml"}

# ── Feature schema (30 features, excluding 'label') ─────────────────────────
EMAIL_FEATURES = [
    "hops", "missing_subject", "missing_to", "missing_content-type",
    "missing_mime-version", "missing_x-mailer", "missing_delivered-to",
    "missing_list-unsubscribe", "missing_received-spf", "missing_reply-to",
    "str_from_chevron", "str_to_chevron", "str_message-ID_dollar",
    "str_return-path_bounce", "str_content-type_texthtml",
    "domain_match_from_return-path", "domain_match_to_from",
    "domain_match_to_message-id", "domain_match_from_reply-to",
    "domain_match_message-id_from", "length_from", "num_recipients_to",
    "num_recipients_cc", "time_zone", "day_of_week", "span_time",
    "date_comp_date_received", "content-encoding-val", "received_str_forged",
    "number_replies",
]


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EMAIL_EXTENSION


# ── Model loading ────────────────────────────────────────────────────────────
def load_stacking_models():
    base_path = os.path.join(MODEL_DIR, "email_stacking_base_models.pkl")
    meta_path = os.path.join(MODEL_DIR, "email_stacking_meta_xgb.pkl")

    if not os.path.exists(base_path) or not os.path.exists(meta_path):
        raise FileNotFoundError(f"Stacking model files not found in {MODEL_DIR}")

    with open(base_path, "rb") as f:
        base_models = pickle.load(f)
    with open(meta_path, "rb") as f:
        meta_model = pickle.load(f)

    return base_models, meta_model


try:
    BASE_MODELS, META_MODEL = load_stacking_models()
    logger.info("Email stacking models loaded (models_advance): RF, LGBM, XGB, CatBoost + Meta XGBoost")
except Exception as e:
    logger.error(f"Failed to load email stacking models: {str(e)}")
    BASE_MODELS = None
    META_MODEL  = None


# ── Inference ────────────────────────────────────────────────────────────────
def np_to_python(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, np.bool_): return bool(obj)
    if isinstance(obj, (list, tuple)): return [np_to_python(i) for i in obj]
    if isinstance(obj, dict): return {k: np_to_python(v) for k, v in obj.items()}
    return obj


def predict_stacking(df: pd.DataFrame, has_ical_url: int = 0) -> tuple:
    """
    Run stacking inference with iCal adversarial flag injected into meta-model.
    Returns (proba_phishing: float, pred_class: int).
    """
    if BASE_MODELS is None or META_MODEL is None:
        raise RuntimeError("Stacking models not loaded successfully")

    X = df[EMAIL_FEATURES].values.astype(np.float32)

    p_rf   = BASE_MODELS["rf"].predict_proba(X)[:, 1]
    p_lgbm = BASE_MODELS["lgbm"].predict_proba(X)[:, 1]
    p_xgb  = BASE_MODELS["xgb"].predict_proba(X)[:, 1]
    p_cat  = BASE_MODELS["cat"].predict_proba(X)[:, 1]

    base_probs    = np.column_stack([p_rf, p_lgbm, p_xgb, p_cat])

    # Inject iCal adversarial flag (models_advance requires 5 features: 4 probs + has_ical_url)
    ical_flag     = np.array([[has_ical_url]], dtype=np.float32)
    meta_features = np.column_stack([base_probs, ical_flag])

    proba_phishing = float(META_MODEL.predict_proba(meta_features)[:, 1][0])
    pred_class     = int(META_MODEL.predict(meta_features)[0])

    return proba_phishing, pred_class


def get_shap_explanation(df: pd.DataFrame, has_ical_url: int = 0, top_n: int = 5) -> dict:
    try:
        if BASE_MODELS is None or META_MODEL is None:
            return {"error": "Models not loaded", "top_features": []}

        X = df[EMAIL_FEATURES].values.astype(np.float32)
        base_probs = np.column_stack([
            BASE_MODELS["rf"].predict_proba(X)[:, 1],
            BASE_MODELS["lgbm"].predict_proba(X)[:, 1],
            BASE_MODELS["xgb"].predict_proba(X)[:, 1],
            BASE_MODELS["cat"].predict_proba(X)[:, 1],
        ])

        # models_advance meta requires exactly 5 features: [RF, LGBM, XGB, Cat, has_ical_url]
        ical_flag     = np.array([[has_ical_url]], dtype=np.float32)
        meta_features = np.column_stack([base_probs, ical_flag])
        feature_names = ["RF_prob", "LGBM_prob", "XGB_prob", "Cat_prob", "has_ical_url"]
        base_df       = pd.DataFrame(meta_features, columns=feature_names)
        explainer     = shap.TreeExplainer(META_MODEL)

        shap_values = explainer.shap_values(base_df)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]

        shap_vals = np.array(shap_values)[0] if len(np.array(shap_values).shape) == 2 else np.array(shap_values)
        shap_abs  = np.abs(shap_vals)
        idxs      = np.argsort(shap_abs)[::-1][:top_n]

        return {
            "base_value": float(
                explainer.expected_value[1]
                if isinstance(explainer.expected_value, (list, np.ndarray))
                else explainer.expected_value
            ),
            "top_features": [
                {
                    "feature":    feature_names[i],
                    "shap_value": float(shap_abs[i]),
                    "direction":  "increases phishing risk" if shap_vals[i] > 0 else "decreases phishing risk",
                }
                for i in idxs
            ],
        }
    except Exception as e:
        logger.warning(f"SHAP explanation failed: {e}")
        return {"error": str(e), "top_features": []}


# ── Email feature extraction helpers ────────────────────────────────────────
def extract_email_details(msg):
    headers       = dict(msg.items())
    received_lines = msg.get_all("Received", [])
    x_headers     = {k: v for k, v in headers.items() if k.lower().startswith("x-")}

    urls = re.findall(
        r'https?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',
        str(msg)
    )
    url_domains = [
        re.search(r'https?://(.*?)(?:/|$)', u).group(1)
        for u in urls if re.search(r'https?://(.*?)(?:/|$)', u)
    ]

    headers_details = {
        "From":          headers.get("From", ""),
        "DisplayName":   re.search(r'"(.*?)"', headers.get("From", "") or "").group(1)
                         if re.search(r'"(.*?)"', headers.get("From", "")) else "",
        "Sender":        headers.get("Sender", ""),
        "To":            headers.get("To", ""),
        "CC":            headers.get("Cc", ""),
        "In-Reply-To":   headers.get("In-Reply-To", ""),
        "Timestamp":     headers.get("Date", ""),
        "Reply-To":      headers.get("Reply-To", ""),
        "Message-ID":    headers.get("Message-ID", ""),
        "Return-Path":   headers.get("Return-Path", ""),
        "OriginatingIP": "",
        "rDNS":          "",
    }

    if received_lines:
        ip_match = re.search(r'from\s+([\d\.]+)', received_lines[-1])
        headers_details["OriginatingIP"] = ip_match.group(1) if ip_match else ""
        rdns_match = re.search(r'from\s+[\w\.-]+\s+\(([\w\.-]+)\)', received_lines[-1])
        headers_details["rDNS"] = rdns_match.group(1) if rdns_match else ""

    received_details = []
    for i, received in enumerate(received_lines, 1):
        hop = {
            "Hop":          f"Hop {i}",
            "Timestamp":    re.search(r';(.*)', received).group(1).strip() if re.search(r';(.*)', received) else "",
            "ReceivedFrom": re.search(r'from\s+([\w\.-]+|\[[\d\.]+\])', received).group(1)
                            if re.search(r'from\s+([\w\.-]+|\[[\d\.]+\])', received) else "",
            "ReceivedBy":   re.search(r'by\s+([\w\.-]+)', received).group(1)
                            if re.search(r'by\s+([\w\.-]+)', received) else "",
        }
        received_details.append(hop)

    x_headers_details = {
        "x-priority":            x_headers.get("X-Priority", ""),
        "x-msmail-priority":     x_headers.get("X-MSMail-Priority", ""),
        "x-originalarrivaltime": x_headers.get("X-OriginalArrivalTime", ""),
    }

    security_details = {
        "SPF": {
            "Result":          "SOFTFAIL" if "softfail" in headers.get("Received-SPF", "").lower()
                               else headers.get("Received-SPF", "None").split()[0]
                               if headers.get("Received-SPF") else "None",
            "OriginatingIP":   headers_details["OriginatingIP"],
            "rDNS":            headers_details["rDNS"],
            "ReturnPathDomain": re.search(r'@([\w\.-]+)', headers.get("Return-Path", "")).group(1)
                                if headers.get("Return-Path") and re.search(r'@([\w\.-]+)', headers.get("Return-Path", "")) else "",
        },
        "DKIM": {
            "Result": "pass" if "dkim=pass" in headers.get("Authentication-Results", "").lower() else "None",
        },
        "DMARC": {
            "Result":     "pass" if "dmarc=pass" in headers.get("Authentication-Results", "").lower() else "None",
            "FromDomain": re.search(r'@([\w\.-]+)', headers.get("From", "")).group(1)
                          if headers.get("From") and re.search(r'@([\w\.-]+)', headers.get("From", "")) else "",
        },
    }

    url_details = [{"Domain": d, "Path": "/", "Scheme": "https"} for d in url_domains]
    return headers_details, received_details, x_headers_details, security_details, url_details


def extract_email_features(file_path: str):
    """
    Parse .eml file, extract 30 features + iCal adversarial flag.
    Returns (df, has_ical_url, headers_details, received_details, x_headers, security, urls, analysis).
    """
    try:
        with open(file_path, "rb") as f:
            msg = BytesParser(policy=policy.default).parse(f)
        headers_dict = dict(msg.items())

        sanitized = {k: str(v).encode("ascii", errors="replace").decode("ascii") for k, v in headers_dict.items()}
        logger.info(f"Extracted headers: {sanitized}")

        received_headers     = msg.get_all("Received", []) or []
        hops                 = len(received_headers)
        most_recent_received = received_headers[0] if received_headers else ""

        is_missing   = lambda h: int(h not in headers_dict or not str(headers_dict[h]).strip())
        domain_match = lambda h1, h2_val: int(
            bool(re.search(r'@([\w\.-]+)', str(headers_dict.get(h1, "")))) and
            bool(re.search(r'@([\w\.-]+)', str(h2_val))) and
            re.search(r'@([\w\.-]+)', str(headers_dict.get(h1, ""))).group(1) ==
            re.search(r'@([\w\.-]+)', str(h2_val)).group(1)
        ) if h2_val else 0

        span_time = 0
        if "Date" in headers_dict and most_recent_received:
            try:
                dt_str = headers_dict["Date"][:31]
                dt     = datetime.strptime(dt_str, "%a, %d %b %Y %H:%M:%S %z")
                rec    = most_recent_received.split(";")[-1].strip()[:31]
                if rec:
                    rec_dt    = datetime.strptime(rec, "%a, %d %b %Y %H:%M:%S %z")
                    span_time = abs((dt - rec_dt).total_seconds())
            except Exception:
                pass

        time_zone    = int(bool(re.search(r'([+-]\d{4})', str(headers_dict.get("Date", "")))))
        day_of_week  = 0
        if "Date" in headers_dict:
            try:
                dt          = datetime.strptime(headers_dict["Date"][:31], "%a, %d %b %Y %H:%M:%S %z")
                day_of_week = dt.weekday()
            except Exception:
                pass

        date_comp_date_received = int("Date" in headers_dict and "Received" in headers_dict)
        content_encoding_val    = str(headers_dict.get("Content-Transfer-Encoding", "")).lower()
        content_encoding_val    = (
            1 if "quoted-printable" in content_encoding_val else
            2 if "base64"          in content_encoding_val else
            3 if content_encoding_val in ["7bit", "8bit"] else 0
        )
        received_str_forged = any(
            "forged" in rec.lower() or not re.search(r'from [\w\.-]+', rec)
            for rec in received_headers
        )

        feats = {
            "hops":                         hops,
            "missing_subject":              is_missing("Subject"),
            "missing_to":                   is_missing("To"),
            "missing_content-type":         is_missing("Content-Type"),
            "missing_mime-version":         is_missing("MIME-Version"),
            "missing_x-mailer":             is_missing("X-Mailer"),
            "missing_delivered-to":         is_missing("Delivered-To"),
            "missing_list-unsubscribe":     is_missing("List-Unsubscribe"),
            "missing_received-spf":         is_missing("Received-SPF"),
            "missing_reply-to":             is_missing("Reply-To"),
            "str_from_chevron":             int(bool(re.search(r'<[\w\.-]+@[\w\.-]+>', str(headers_dict.get("From", ""))))),
            "str_to_chevron":               int(bool(re.search(r'<[\w\.-]+@[\w\.-]+>', str(headers_dict.get("To", ""))))),
            "str_message-ID_dollar":        int(bool(re.search(r'\$', str(headers_dict.get("Message-ID", ""))))),
            "str_return-path_bounce":       int(bool(re.search(r'bounce', str(headers_dict.get("Return-Path", "")), re.IGNORECASE))),
            "str_content-type_texthtml":    int(bool(re.search(r'text/html', str(headers_dict.get("Content-Type", "")), re.IGNORECASE))),
            "domain_match_from_return-path": domain_match("From", headers_dict.get("Return-Path", "")),
            "domain_match_to_from":          domain_match("To",   headers_dict.get("From", "")),
            "domain_match_to_message-id":    domain_match("To",   headers_dict.get("Message-ID", "")),
            "domain_match_from_reply-to":    domain_match("From", headers_dict.get("Reply-To", "")),
            "domain_match_message-id_from":  domain_match("Message-ID", headers_dict.get("From", "")),
            "length_from":                  len(str(headers_dict.get("From", ""))),
            "num_recipients_to":            len([x for x in str(headers_dict.get("To", "")).split(",") if x.strip()]),
            "num_recipients_cc":            len([x for x in str(headers_dict.get("Cc", "")).split(",") if x.strip()]),
            "time_zone":                    time_zone,
            "day_of_week":                  day_of_week,
            "span_time":                    span_time,
            "date_comp_date_received":      date_comp_date_received,
            "content-encoding-val":         content_encoding_val,
            "received_str_forged":          1 if received_str_forged else 0,
            "number_replies":               len([h for h in str(headers_dict.get("References", "")).split() if h.strip()])
                                            if "References" in headers_dict else 0,
        }

        for feat in EMAIL_FEATURES:
            if feat not in feats:
                feats[feat] = 0

        df = pd.DataFrame([feats], columns=EMAIL_FEATURES)

        # ── Adversarial: check iCal URL injection ──────────────────────
        has_ical_url = check_email_ical_payload(msg)
        if has_ical_url:
            logger.warning(f"[ADVERSARIAL] iCal URL payload detected in {file_path}")

        logger.info(f"Email features extracted. has_ical_url={has_ical_url}")

        headers_details, received_details, x_headers_details, security_details, url_details = extract_email_details(msg)

        analysis = {
            "explanation":        "Phân tích dựa trên header, received chain, domain matching, và thời gian.",
            "adversarial_check":  f"iCal URL injection: {'DETECTED ⚠️' if has_ical_url else 'Clear ✓'}",
            "headers_analysis":   "Header From/Return-Path/Reply-To khớp"
                                  if feats["domain_match_from_return-path"] and feats["domain_match_from_reply-to"]
                                  else "Có dấu hiệu không khớp domain",
            "received_analysis":  f"Span time: {span_time}s → {'nghi ngờ giả mạo ⚠️' if span_time > 3600 else 'bình thường ✓'}",
            "security_analysis":  f"SPF: {security_details['SPF']['Result']}, DKIM: {security_details['DKIM']['Result']}",
            "url_analysis":       f"Tìm thấy {len(url_details)} link HTTPS" if url_details else "Không tìm thấy link HTTPS",
        }

        return df, has_ical_url, headers_details, received_details, x_headers_details, security_details, url_details, analysis

    except Exception as e:
        logger.error(f"Error extracting features from {file_path}: {str(e)}", exc_info=True)
        raise ValueError(f"Không thể trích xuất đặc trưng từ file email: {str(e)}")


# ── Route ────────────────────────────────────────────────────────────────────
@bp.route("/predict", methods=["POST"])
def predict_email():
    threshold = 0.50

    try:
        if "file" not in request.files or not request.files["file"].filename:
            return jsonify({"error": "Không có file được chọn"}), 400

        file     = request.files["file"]
        filename = secure_filename(file.filename)

        file_bytes   = file.read()
        scanii_result = check_scanii_from_file(file_bytes, filename)
        file.stream.seek(0)

        if not allowed_file(filename):
            return jsonify({"error": "Chỉ chấp nhận file .eml"}), 400

        with temp_file(file, filename) as file_path:
            df, has_ical_url, headers_details, received_details, \
                x_headers_details, security_details, url_details, analysis = extract_email_features(file_path)

            proba_phishing, pred_class = predict_stacking(df, has_ical_url)

            # Hard-override: iCal injection always triggers phishing
            if has_ical_url:
                proba_phishing = max(proba_phishing, 0.90)
                pred_class     = 1

            result            = "Phishing" if proba_phishing >= threshold else "Legitimate"
            phishing_prob_pct = round(float(proba_phishing) * 100, 2)
            legit_prob_pct    = round(100 - phishing_prob_pct, 2)

            logger.info(f"Email {filename}: phishing_prob={phishing_prob_pct}% | result={result} | has_ical_url={has_ical_url}")

            explanation  = get_shap_explanation(df, has_ical_url)
            features_out = np_to_python(df.to_dict(orient="records")[0])

            return jsonify({
                "result":               result,
                "prediction":           result,
                "prediction_class":     int(pred_class),
                "phishing_probability": phishing_prob_pct,
                "legitimate_probability": legit_prob_pct,
                "adversarial_flags": {
                    "has_ical_url": has_ical_url,
                    "warning": "iCalendar URL injection detected!" if has_ical_url else "No adversarial signals",
                },
                "features":      features_out,
                "explanation":   explanation,
                "third_party_eval": {"scanii": scanii_result},
                "email_details": {
                    "headers":        np_to_python(headers_details),
                    "received_lines": np_to_python(received_details),
                    "x_headers":      np_to_python(x_headers_details),
                    "security":       np_to_python(security_details),
                    "urls":           np_to_python(url_details),
                },
                "analysis": np_to_python(analysis),
            }), 200

    except ValueError as ve:
        logger.error(f"ValueError: {str(ve)}")
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.exception(f"Unexpected error processing email")
        return jsonify({"error": f"Lỗi hệ thống: {str(e)}"}), 500