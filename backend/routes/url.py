"""
URL Phishing Detection Route — Adversarial-Hardened Version
Uses models_advance ensemble with adversarial meta-features:
  brand_impersonation flag injected into XGBoost meta-classifier.
"""
from flask import Blueprint, request, jsonify
import pandas as pd
import unicodedata
import urllib.parse
import logging
import pickle
import numpy as np
import shap
import os

from pathlib import Path

from utils.url_features import extract_features, URL_FEATURES
from utils.url_screenshot import capture_webpage_data, get_screenshot_base64
from utils.web_content import analyze_web_content
from utils.visual_model import predict_visual_screenshot
from utils.ensemble import fuse_multimodal_predictions
from utils.url_third_party import (
    check_virustotal,
    check_google_safe_browsing,
    check_urlvoid,
)
from utils.adversarial_helpers import adversarial_url_flags

bp = Blueprint("url", __name__)
logger = logging.getLogger(__name__)


BASE_DIR = Path(__file__).resolve().parents[2]

# ── Model directory: prefer models_advance, fallback to models ──────────────
_ADVANCE_DIR = BASE_DIR / "models_advance"
_LEGACY_DIR  = BASE_DIR / "models"
MODEL_DIR    = _ADVANCE_DIR if _ADVANCE_DIR.exists() else _LEGACY_DIR
logger.info(f"[URL route] Using model directory: {MODEL_DIR}")

STACKING_CONFIG = {
    "url": {
        "base": MODEL_DIR / "stacking_base_models_url.pkl",
        "meta": MODEL_DIR / "stacking_meta_xgb_url.pkl",
    }
}

stacking_cache: dict = {}


def load_stacking(model_type: str = "url") -> dict:
    if model_type in stacking_cache:
        return stacking_cache[model_type]

    cfg = STACKING_CONFIG[model_type]
    logger.info(f"Loading stacking models from: {MODEL_DIR}")

    if not cfg["base"].exists():
        raise FileNotFoundError(f"Base model not found: {cfg['base']}")
    if not cfg["meta"].exists():
        raise FileNotFoundError(f"Meta model not found: {cfg['meta']}")

    with open(cfg["base"], "rb") as f:
        base_models = pickle.load(f)
    with open(cfg["meta"], "rb") as f:
        meta_model = pickle.load(f)

    stacking_cache[model_type] = {"base": base_models, "meta": meta_model}
    logger.info(f"Successfully loaded stacking models for [{model_type}]")
    return stacking_cache[model_type]


def predict_stacking(df: pd.DataFrame, adv_flags: dict, model_type: str = "url") -> tuple:
    """
    Run stacking inference with adversarial meta-feature injection.
    adv_flags must contain 'brand_impersonation' (int 0/1).
    Returns (pred_class: int, proba: float).
    """
    models = load_stacking(model_type)
    base   = models["base"]
    meta   = models["meta"]

    # Base models use only URL_FEATURES (no adversarial flags)
    X = df[URL_FEATURES]

    p_rf   = base["rf"].predict_proba(X)[:, 1]
    p_lgbm = base["lgbm"].predict_proba(X)[:, 1]
    p_xgb  = base["xgb"].predict_proba(X)[:, 1]
    p_cat  = base["cat"].predict_proba(X)[:, 1]

    base_probs    = np.column_stack([p_rf, p_lgbm, p_xgb, p_cat])

    # Inject adversarial brand_impersonation flag (models_advance requires 5 features)
    brand_flag    = np.array([[adv_flags.get("brand_impersonation", 0)]], dtype=np.float32)
    meta_features = np.column_stack([base_probs, brand_flag])

    proba     = float(meta.predict_proba(meta_features)[0, 1])
    pred      = int(meta.predict(meta_features)[0])

    if np.isnan(proba):
        logger.warning("NaN probability detected → fallback to 0.0")
        proba = 0.0

    return pred, proba


def get_shap_explanation(df: pd.DataFrame, adv_flags: dict, model_type: str = "url", top_n: int = 5) -> dict:
    try:
        models = load_stacking(model_type)
        base   = models["base"]
        meta   = models["meta"]

        X = df[URL_FEATURES]
        base_probs = np.column_stack([
            base["rf"].predict_proba(X)[:, 1],
            base["lgbm"].predict_proba(X)[:, 1],
            base["xgb"].predict_proba(X)[:, 1],
            base["cat"].predict_proba(X)[:, 1],
        ])

        # models_advance meta requires exactly 5 features: [RF, LGBM, XGB, Cat, brand_impersonation]
        brand_flag    = np.array([[adv_flags.get("brand_impersonation", 0)]], dtype=np.float32)
        meta_features = np.column_stack([base_probs, brand_flag])
        feature_names = ["RF_prob", "LGBM_prob", "XGB_prob", "Cat_prob", "brand_impersonation"]
        base_df       = pd.DataFrame(meta_features, columns=feature_names)
        explainer     = shap.TreeExplainer(meta)

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


@bp.route("/predict", methods=["POST"])
@bp.route("/scan", methods=["POST"])
def predict_url_endpoint():
    try:
        data = request.get_json(silent=True)
        if not data or ("url" not in data and "text" not in data):
            return jsonify({"error": "Missing 'url' or 'text'"}), 400

        raw_input = data.get("url", data.get("text", "")).strip()
        if not raw_input:
            return jsonify({"error": "Input cannot be empty"}), 400

        # Normalize Unicode before processing (NFKC)
        input_normalized = unicodedata.normalize("NFKC", raw_input)

        # Ensure scheme is present for network/browser calls
        if not (input_normalized.startswith("http://") or input_normalized.startswith("https://")):
            full_url = "https://" + input_normalized
        else:
            full_url = input_normalized

        # ── 1. Adversarial URL analysis ─────────────────────────────────
        adv_flags = adversarial_url_flags(input_normalized)

        # ── 2. Modality 1: Lexical URL & Stacking ML Inference ─────────
        features = extract_features(input_normalized)
        df       = pd.DataFrame([features], columns=URL_FEATURES)
        url_pred_class, url_proba = predict_stacking(df, adv_flags, "url")
        explanation = get_shap_explanation(df, adv_flags, "url")

        # ── 3. Render webpage: Capture Screenshot + HTML + Inner Text ────
        web_data = capture_webpage_data(full_url, timeout=12000)
        screenshot_b64 = web_data.get("screenshot_b64")
        html_content   = web_data.get("html_content", "")
        inner_text     = web_data.get("inner_text", "")

        # ── 4. Modality 2: Visual Deep Learning Inference (EfficientNetV2-M)
        visual_result = predict_visual_screenshot(screenshot_b64)

        # ── 5. Modality 3: Web Content & DOM Analysis ───────────────────
        content_result = analyze_web_content(html_content, inner_text, full_url)

        # ── 6. Multimodal Ensemble Fusion Engine (Paper Q2) ─────────────
        final_result, final_proba, ensemble_breakdown = fuse_multimodal_predictions(
            url_proba=url_proba,
            visual_result=visual_result,
            content_result=content_result,
            adv_flags=adv_flags
        )

        screenshot_url = (
            f"data:image/png;base64,{screenshot_b64}"
            if screenshot_b64
            else "https://via.placeholder.com/400?text=No+Screenshot"
        )

        # ── 7. Domain for third-party APIs ──────────────────────────────
        parsed = urllib.parse.urlparse(full_url)
        domain_name = parsed.netloc or parsed.path

        third_party = {
            "virusTotal":         check_virustotal(full_url),
            "googleSafeBrowsing": check_google_safe_browsing(full_url),
            "urlVoid":            check_urlvoid(domain_name),
        }

        logger.info(
            f"Multimodal URL Scan={raw_input!r} | final_proba={final_proba:.4f} | result={final_result}"
        )

        return jsonify({
            "type":                  "url",
            "model":                 "PhishStack Q2 Multimodal Ensemble (URL Stacking + Visual EfficientNetV2-M + Web Content Analysis)",
            "prediction":            final_result,
            "prediction_class":      1 if final_result == "phishing" else 0,
            "phishing_probability":  round(final_proba * 100, 2),
            "legitimate_probability": round((1 - final_proba) * 100, 2),
            "ensemble_breakdown":    ensemble_breakdown,
            "url_modality_prob":     round(url_proba * 100, 2),
            "visual_modality_prob":  round(visual_result.get("visual_phishing_probability", 0.0) * 100, 2),
            "content_modality_prob": round(content_result.get("content_phishing_probability", 0.0) * 100, 2),
            "features":              features,
            "adversarial_flags":     adv_flags,
            "screenshot_url":        screenshot_url,
            "third_party_eval":      third_party,
            "explanation":           explanation,
        }), 200

    except Exception as e:
        logger.exception("URL prediction failed")
        return jsonify({"error": str(e)}), 500

