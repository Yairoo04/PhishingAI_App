import os
import pickle
import joblib
import numpy as np
import pandas as pd
import logging
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from utils.android_extractor import AndroidFeatureExtractor
from utils.common import temp_file

from pathlib import Path

bp = Blueprint("android", __name__)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[2]
_ADVANCE_DIR = BASE_DIR / "models_advance"
_LEGACY_DIR  = BASE_DIR / "models"
MODEL_DIR    = _ADVANCE_DIR if _ADVANCE_DIR.exists() else _LEGACY_DIR

ALLOWED_EXTENSIONS = {"apk"}

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


try:
    rf_model_path = os.path.join(MODEL_DIR, "android_rf_model.joblib")
    if os.path.exists(rf_model_path):
        ANDROID_MODEL = joblib.load(rf_model_path)
        logger.info(f"Random Forest model for Android loaded successfully from {rf_model_path}.")
    else:
        logger.warning(f"Android model not found at {rf_model_path}")
        ANDROID_MODEL = None
except Exception as e:
    logger.error(f"Failed to load Android model: {e}")
    ANDROID_MODEL = None

extractor = AndroidFeatureExtractor()

@bp.route("/predict", methods=["POST"])
def predict_android():
    if not ANDROID_MODEL:
        return jsonify({"error": "Model not loaded"}), 500

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename)

    if not filename or not allowed_file(filename):
        return jsonify({"error": "Only APK files are allowed"}), 400

    try:
        # Validate APK/ZIP magic number ("PK")
        magic_bytes = file.read(2)
        file.seek(0)  # Reset pointer so it can be saved properly later
        
        if magic_bytes != b"PK":
            logger.warning(f"Invalid APK signature for file: {filename}")
            return jsonify({
                "error": "Invalid APK file",
                "message": "Uploaded file is not a valid Android APK package"
            }), 400

        with temp_file(file, filename) as path:
            try:
                feature_vector = extractor.extract_features(path)
            except Exception as extract_err:
                logger.error(f"Androguard failed to process APK {filename}: {extract_err}")
                return jsonify({
                    "error": "Invalid APK file",
                    "message": "Uploaded file is not a valid Android APK package"
                }), 400
            
            if not feature_vector:
                return jsonify({"error": "Failed to extract features from APK"}), 500

            # Map to feature list
            features_list = [feature_vector[f] for f in extractor.original_features]
            X = np.array([features_list], dtype=np.float32)

            predictions = ANDROID_MODEL.predict(X)
            probabilities = ANDROID_MODEL.predict_proba(X) if hasattr(ANDROID_MODEL, 'predict_proba') else None
            
            label = "Malware" if predictions[0] == 1 else "Legitimate"
            prob = float(probabilities[0][1]) if probabilities is not None else (1.0 if label == "Malware" else 0.0)

            return jsonify({
                "filename": filename,
                "prediction": label,
                "malware_probability": round(prob * 100, 2),
                "legitimate_probability": round((1 - prob) * 100, 2)
            }), 200

    except Exception as e:
        logger.exception("Android APK prediction failed")
        return jsonify({"error": "An error occurred during scanning"}), 500
