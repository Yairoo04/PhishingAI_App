"""
PDF/File Phishing Detection Route — Adversarial-Hardened Version
Uses models_advance ensemble with adversarial meta-feature:
  has_xfa flag (XFA form exploit) injected into XGBoost meta-classifier.
"""
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import pandas as pd
from PyPDF2 import PdfReader
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
import re
import os
import pickle
import numpy as np
import logging
import shap
from pathlib import Path

from utils.common import temp_file
from utils.file_third_party import check_scanii_from_file
from utils.adversarial_helpers import check_pdf_xfa

bp = Blueprint("file", __name__)
logger = logging.getLogger(__name__)


# ── Model directory: prefer models_advance, fallback to models ──────────────
_BASE        = Path(__file__).resolve().parents[2]
_ADVANCE_DIR = _BASE / "models_advance"
_LEGACY_DIR  = _BASE / "models"
MODEL_DIR    = str(_ADVANCE_DIR if _ADVANCE_DIR.exists() else _LEGACY_DIR)
logger.info(f"[File route] Using model directory: {MODEL_DIR}")

ALLOWED_PDF_EXTENSION = {"pdf"}

# ── Feature schema (31 base features; has_xfa is adversarial meta-feature) ──
EXPECTED_FEATURES = [
    "PdfSize", "MetadataSize", "Pages", "XrefLength", "TitleCharacters",
    "isEncrypted", "EmbeddedFiles", "Images", "Text", "Header", "Obj",
    "Endobj", "Stream", "Endstream", "Xref", "Trailer", "StartXref",
    "PageNo", "Encrypt", "ObjStm", "JS", "Javascript", "AA", "OpenAction",
    "Acroform", "JBIG2Decode", "RichMedia", "Launch", "EmbeddedFile",
    "XFA", "Colors",
]


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_PDF_EXTENSION


# ── Model loading ────────────────────────────────────────────────────────────
def load_stacking_models():
    base_path = os.path.join(MODEL_DIR, "stacking_base_models_final.pkl")
    meta_path = os.path.join(MODEL_DIR, "stacking_meta_xgb_final.pkl")

    if not os.path.exists(base_path) or not os.path.exists(meta_path):
        raise FileNotFoundError(f"Stacking model files not found in {MODEL_DIR}")

    with open(base_path, "rb") as f:
        base_models = pickle.load(f)
    with open(meta_path, "rb") as f:
        meta_model = pickle.load(f)

    return base_models, meta_model


try:
    BASE_MODELS, META_MODEL = load_stacking_models()
    logger.info("PDF stacking models loaded (models_advance): RF, LGBM, XGB, CatBoost + Meta XGBoost")
except Exception as e:
    logger.error(f"Failed to load PDF stacking models: {e}")
    BASE_MODELS = None
    META_MODEL  = None


# ── Inference ────────────────────────────────────────────────────────────────
def predict_stacking(df: pd.DataFrame, has_xfa: int = 0) -> tuple:
    """
    Run stacking inference with XFA adversarial flag injected into meta-model.
    Returns (proba: float, pred_class: int).
    """
    if BASE_MODELS is None or META_MODEL is None:
        raise RuntimeError("Stacking models not loaded")

    X = df[EXPECTED_FEATURES].values.astype(np.float32)

    p_rf   = BASE_MODELS["rf"].predict_proba(X)[:, 1]
    p_lgbm = BASE_MODELS["lgbm"].predict_proba(X)[:, 1]
    p_xgb  = BASE_MODELS["xgb"].predict_proba(X)[:, 1]
    p_cat  = BASE_MODELS["cat"].predict_proba(X)[:, 1]

    base_probs    = np.column_stack([p_rf, p_lgbm, p_xgb, p_cat])

    # Inject XFA adversarial flag as 5th meta-feature (models_advance requires exactly 5)
    xfa_flag      = np.array([[has_xfa]], dtype=np.float32)
    meta_features = np.column_stack([base_probs, xfa_flag])

    proba = float(META_MODEL.predict_proba(meta_features)[:, 1][0])
    pred  = int(META_MODEL.predict(meta_features)[0])

    return proba, pred


def get_shap_explanation(df: pd.DataFrame, has_xfa: int = 0, top_n: int = 5) -> dict:
    try:
        if BASE_MODELS is None or META_MODEL is None:
            return {"error": "Models not loaded", "top_features": []}

        X = df[EXPECTED_FEATURES].values.astype(np.float32)
        base_probs = np.column_stack([
            BASE_MODELS["rf"].predict_proba(X)[:, 1],
            BASE_MODELS["lgbm"].predict_proba(X)[:, 1],
            BASE_MODELS["xgb"].predict_proba(X)[:, 1],
            BASE_MODELS["cat"].predict_proba(X)[:, 1],
        ])

        # models_advance meta requires exactly 5 features: [RF, LGBM, XGB, Cat, has_xfa]
        xfa_flag      = np.array([[has_xfa]], dtype=np.float32)
        meta_features = np.column_stack([base_probs, xfa_flag])
        feature_names = ["RF_prob", "LGBM_prob", "XGB_prob", "Cat_prob", "has_xfa"]
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
                    "direction":  "increases malicious risk" if shap_vals[i] > 0 else "decreases malicious risk",
                }
                for i in idxs
            ],
        }
    except Exception as e:
        logger.warning(f"SHAP explanation failed: {e}")
        return {"error": str(e), "top_features": []}


# ── PDF feature extraction ────────────────────────────────────────────────────
def extract_urls_from_pdf(pdf_path: str):
    try:
        text = extract_text(pdf_path, laparams=LAParams())
        urls = re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', text)
        return [{"Domain": u} for u in urls]
    except Exception:
        return []


def extract_pdf_features(pdf_path: str) -> dict:
    """
    Extract 31 structural features + adversarial has_xfa flag from a PDF.
    Returns dict with keys: 'features' (dict), 'has_xfa' (int), 'file_details' (dict).
    """
    pdf      = PdfReader(pdf_path)
    features = {f: 0 for f in EXPECTED_FEATURES}

    features["PdfSize"]        = os.path.getsize(pdf_path) / 1024.0
    features["MetadataSize"]   = len(str(pdf.metadata)) if pdf.metadata else 0
    features["Pages"]          = len(pdf.pages)
    features["PageNo"]         = len(pdf.pages)
    features["TitleCharacters"] = len(pdf.metadata.get("/Title", "")) if pdf.metadata else 0
    features["isEncrypted"]    = 1 if pdf.is_encrypted else 0

    with open(pdf_path, "rb") as f:
        content = f.read()

    features["Header"]     = content.count(b"%PDF")
    features["Obj"]        = content.count(b" obj")
    features["Endobj"]     = content.count(b"endobj")
    features["Stream"]     = content.count(b"stream")
    features["Endstream"]  = content.count(b"endstream")
    features["Xref"]       = content.count(b"xref")
    features["Trailer"]    = content.count(b"trailer")
    features["StartXref"]  = content.count(b"startxref")
    features["Encrypt"]    = content.count(b"/Encrypt")
    features["ObjStm"]     = content.count(b"/ObjStm")
    features["AA"]         = content.count(b"/AA")
    features["OpenAction"] = content.count(b"/OpenAction")
    features["Acroform"]   = content.count(b"/AcroForm")
    features["JBIG2Decode"] = content.count(b"JBIG2Decode")
    features["RichMedia"]  = content.count(b"/RichMedia")
    features["Launch"]     = content.count(b"/Launch")
    features["EmbeddedFile"]  = content.count(b"/EmbeddedFile")
    features["EmbeddedFiles"] = content.count(b"/EmbeddedFiles")
    features["XFA"]        = content.count(b"/XFA")
    features["Colors"]     = content.count(b"/Color")

    # ── Adversarial: XFA detection ───────────────────────────────────────
    has_xfa = check_pdf_xfa(content)
    if has_xfa:
        logger.warning(f"[ADVERSARIAL] XFA form exploit detected in {pdf_path}")

    text = ""
    try:
        text               = extract_text(pdf_path, laparams=LAParams())
        features["Text"]   = len(text)
        features["JS"]     = int("javascript" in text.lower())
        features["Javascript"] = features["JS"]
    except Exception:
        features["Text"] = features["JS"] = features["Javascript"] = 0

    features["Images"] = int(features["Pages"] > 0 and features["PdfSize"] / features["Pages"] > 50)

    file_details = {
        "metadata": dict(pdf.metadata) if pdf.metadata else {},
        "content": {
            "phishing_keywords": re.findall(r"login|password|bank|account|secure", text.lower()),
            "has_javascript":    bool(features["JS"]),
            "has_forms":         bool(features["Acroform"]),
            "has_xfa_exploit":   bool(has_xfa),
        },
        "urls": extract_urls_from_pdf(pdf_path),
    }

    return {"features": features, "has_xfa": has_xfa, "file_details": file_details}


# ── Route ────────────────────────────────────────────────────────────────────
@bp.route("/predict", methods=["POST"])
def predict_file():
    threshold = 0.5

    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file     = request.files["file"]
        filename = secure_filename(file.filename)

        if not filename or not allowed_file(filename):
            return jsonify({"error": "Only PDF files are allowed"}), 400

        file_bytes    = file.read()
        try:
            scanii_result = check_scanii_from_file(file_bytes, filename)
        except Exception as e:
            logger.warning(f"Scanii failed: {e}")
            scanii_result = {"error": "Scanii scan failed"}

        file.stream.seek(0)

        with temp_file(file, filename) as path:
            data    = extract_pdf_features(path)
            has_xfa = data["has_xfa"]
            df      = pd.DataFrame([data["features"]], columns=EXPECTED_FEATURES)
            proba, pred = predict_stacking(df, has_xfa)

        # Hard-override: XFA exploit always triggers malicious label
        if has_xfa:
            proba = max(proba, 0.90)
            pred  = 1

        result = "Malicious" if proba >= threshold else "Legitimate"

        explanation = get_shap_explanation(df, has_xfa)

        logger.info(f"PDF {filename}: malicious_prob={proba:.4f} | result={result} | has_xfa={has_xfa}")

        return jsonify({
            "filename":              filename,
            "prediction":            result,
            "phishing_probability":  round(proba * 100, 2),
            "legitimate_probability": round((1 - proba) * 100, 2),
            "prediction_class":      pred,
            "adversarial_flags": {
                "has_xfa": has_xfa,
                "warning": "XFA form exploit detected in PDF!" if has_xfa else "No adversarial signals",
            },
            "features":      data["features"],
            "file_details":  data["file_details"],
            "explanation":   explanation,
            "third_party_eval": {"scanii": scanii_result},
        }), 200

    except Exception as e:
        logger.exception("PDF prediction failed")
        return jsonify({"error": str(e)}), 500
