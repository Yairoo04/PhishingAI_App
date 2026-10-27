"""
Image/QR Code Phishing Detection Route — Adversarial-Hardened Version
Uses models_advance URL ensemble + adversarial brand_impersonation/unicode flags for QR URLs.
CNN (EfficientNetV2-M) from models_advance or fallback to models.
"""
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import cv2
import numpy as np
import tensorflow as tf
from pyzbar.pyzbar import decode
from urllib.parse import urlparse
import logging
import os
import pandas as pd
import pickle
import shap
from pathlib import Path

from utils.common import temp_file
from utils.url_features import extract_features, URL_FEATURES
from utils.url_third_party import check_virustotal, check_google_safe_browsing, check_urlvoid
from utils.adversarial_helpers import adversarial_url_flags
from utils.visual_model import load_cnn_model

bp = Blueprint("image", __name__)
logger = logging.getLogger(__name__)


ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg"}

# ── Model directory: prefer models_advance, fallback to models ──────────────
_BASE        = Path(__file__).resolve().parents[2]
_ADVANCE_DIR = _BASE / "models_advance"
_LEGACY_DIR  = _BASE / "models"
MODEL_DIR    = str(_ADVANCE_DIR if _ADVANCE_DIR.exists() else _LEGACY_DIR)
logger.info(f"[Image route] Using model directory: {MODEL_DIR}")



# ── URL Stacking model loading ───────────────────────────────────────────────
STACKING_CONFIG = {
    "url": {
        "base": os.path.join(MODEL_DIR, "stacking_base_models_url.pkl"),
        "meta": os.path.join(MODEL_DIR, "stacking_meta_xgb_url.pkl"),
    }
}

stacking_cache: dict = {}


def load_stacking(model_type: str = "url") -> dict:
    if model_type not in stacking_cache:
        cfg = STACKING_CONFIG[model_type]
        if not os.path.exists(cfg["base"]) or not os.path.exists(cfg["meta"]):
            raise FileNotFoundError(f"Stacking model files not found for {model_type} in {MODEL_DIR}")
        with open(cfg["base"], "rb") as f:
            base_models = pickle.load(f)
        with open(cfg["meta"], "rb") as f:
            meta_model = pickle.load(f)
        stacking_cache[model_type] = {"base": base_models, "meta": meta_model}
        logger.info(f"URL stacking models loaded from {MODEL_DIR}")
    return stacking_cache[model_type]


def predict_url_stacking(url: str) -> tuple:
    """
    Adversarial-aware URL prediction for QR codes.
    Returns (pred_class: int, proba: float, adv_flags: dict, explanation: dict).
    """
    try:
        adv_flags = adversarial_url_flags(url)
        feat_dict = extract_features(url)
        df        = pd.DataFrame([feat_dict], columns=URL_FEATURES)

        models = load_stacking("url")
        base   = models["base"]
        meta   = models["meta"]

        X = df[URL_FEATURES]
        base_probs = np.column_stack([
            base["rf"].predict_proba(X)[:, 1],
            base["lgbm"].predict_proba(X)[:, 1],
            base["xgb"].predict_proba(X)[:, 1],
            base["cat"].predict_proba(X)[:, 1],
        ])

        # Inject brand_impersonation flag (models_advance requires 5 features exactly)
        brand_flag    = np.array([[adv_flags.get("brand_impersonation", 0)]], dtype=np.float32)
        meta_features = np.column_stack([base_probs, brand_flag])

        meta_proba = float(meta.predict_proba(meta_features)[0, 1])
        pred_class = int(meta.predict(meta_features)[0])

        # Hard-override for adversarial signals
        if adv_flags["unicode_spoofing"]:
            meta_proba = max(meta_proba, 0.95)
            pred_class = 1
        if adv_flags["brand_impersonation"]:
            meta_proba = max(meta_proba, 0.90)
            pred_class = 1

        # SHAP explanation
        explanation = {"top_features": []}
        try:
            feature_names = ["RF_prob", "LGBM_prob", "XGB_prob", "Cat_prob", "brand_impersonation"]
            base_df   = pd.DataFrame(meta_features, columns=feature_names)
            explainer = shap.TreeExplainer(meta)
            shap_vals = explainer.shap_values(base_df)

            if isinstance(shap_vals, list):
                shap_vals = shap_vals[1]
            sv        = np.array(shap_vals)[0] if len(np.array(shap_vals).shape) == 2 else np.array(shap_vals)
            sv_abs    = np.abs(sv)
            idxs      = np.argsort(sv_abs)[::-1][:5]

            explanation = {
                "top_features": [
                    {
                        "feature":    feature_names[i],
                        "shap_value": float(sv_abs[i]),
                        "direction":  "increases risk" if sv[i] > 0 else "decreases risk",
                    }
                    for i in idxs
                ],
                "base_value": float(
                    explainer.expected_value[1]
                    if isinstance(explainer.expected_value, (list, np.ndarray))
                    else explainer.expected_value
                ),
            }
        except Exception as shap_err:
            logger.warning(f"SHAP failed for QR URL '{url}': {shap_err}")
            explanation["error"] = str(shap_err)

        return pred_class, float(meta_proba), adv_flags, explanation

    except Exception as e:
        logger.error(f"Error predicting QR URL '{url}': {e}")
        return 0, 0.0, {}, {"error": str(e)}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


# ── Route ────────────────────────────────────────────────────────────────────
@bp.route("/predict", methods=["POST"])
def predict_image():
    threshold = 0.50

    try:
        if "file" not in request.files or not request.files["file"].filename:
            return jsonify({"error": "No file selected"}), 400

        file     = request.files["file"]
        filename = secure_filename(file.filename)

        if not allowed_file(filename):
            return jsonify({"error": "Invalid file type. Only .png, .jpg, .jpeg accepted"}), 400

        with temp_file(file, filename) as file_path:
            image = cv2.imread(file_path)
            if image is None:
                logger.error(f"Failed to read image: {file_path}")
                return jsonify({"error": "Invalid or corrupted image file"}), 400

            # ── QR Code branch ────────────────────────────────────────────
            qr_codes = decode(image)
            if qr_codes:
                qr_results = []
                for qr in qr_codes:
                    text_data = qr.data.decode("utf-8").strip()
                    logger.info(f"QR code detected: {text_data}")

                    try:
                        parsed = urlparse(text_data)
                        is_url = all([parsed.scheme, parsed.netloc])
                    except Exception:
                        is_url = False

                    if not is_url:
                        return jsonify({
                            "type":           "qr_codes",
                            "error":          "No URL found in QR code",
                            "extracted_text": text_data,
                        }), 400

                    class_pred, proba_phishing, adv_flags, explanation = predict_url_stacking(text_data)
                    result_label = "phishing" if proba_phishing >= threshold else "legitimate"

                    qr_results.append({
                        "qr_url":               text_data,
                        "type":                 "url_from_qr",
                        "model":                "stacking_adversarial_ensemble",
                        "prediction":           result_label,
                        "phishing_probability": round(proba_phishing * 100, 2),
                        "legitimate_probability": round((1 - proba_phishing) * 100, 2),
                        "prediction_class":     class_pred,
                        "adversarial_flags":    adv_flags,
                        "explanation":          explanation,
                        "features":             extract_features(text_data),
                    })

                return jsonify({"type": "qr_codes", "results": qr_results}), 200

            # ── CNN screenshot branch ─────────────────────────────────────
            image_rgb    = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            img_resized  = cv2.resize(image_rgb, (480, 480))
            img_array    = np.expand_dims(img_resized, axis=0).astype(np.float32)
            img_preprocessed = tf.keras.applications.efficientnet_v2.preprocess_input(img_array)

            cnn_model  = load_cnn_model()
            cnn_proba  = float(cnn_model.predict(img_preprocessed, verbose=0)[0][0])
            result_label = "phishing" if cnn_proba >= threshold else "legitimate"

            logger.info(f"Image {filename} | CNN phishing prob: {cnn_proba:.4f} | Result: {result_label}")

            return jsonify({
                "type":                  "image",
                "model":                 "efficientnetv2m_phishing (models_advance)",
                "prediction":            result_label,
                "phishing_probability":  round(cnn_proba * 100, 2),
                "legitimate_probability": round((1 - cnn_proba) * 100, 2),
                "filename":              filename,
            }), 200

    except Exception as e:
        logger.exception(f"Unexpected error processing image")
        return jsonify({"error": f"Unexpected error processing image: {str(e)}"}), 500