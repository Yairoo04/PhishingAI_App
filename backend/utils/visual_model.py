"""
Visual CNN Phishing Detection Module (Modality 2)
Centralizes loading and inference for EfficientNetV2-M (models_advance/efficientnetv2m_phishing.keras).
"""
import base64
import os
import cv2
import numpy as np
import tensorflow as tf
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Model path resolution: prefer models_advance, fallback to models
BASE_DIR = Path(__file__).resolve().parents[2]
ADVANCE_DIR = BASE_DIR / "models_advance"
LEGACY_DIR = BASE_DIR / "models"
MODEL_DIR = ADVANCE_DIR if ADVANCE_DIR.exists() else LEGACY_DIR

CNN_MODEL_PATH = MODEL_DIR / "efficientnetv2m_phishing.keras"
if not CNN_MODEL_PATH.exists():
    CNN_MODEL_PATH = LEGACY_DIR / "efficientnetv2m_phishing.keras"


class SafeDense(tf.keras.layers.Dense):
    """Compatibility shim to ignore unknown quantization_config kwarg."""
    def __init__(self, *args, **kwargs):
        kwargs.pop("quantization_config", None)
        super().__init__(*args, **kwargs)


_cnn_model_cache: Optional[tf.keras.Model] = None


def load_cnn_model() -> tf.keras.Model:
    """Loads and caches the EfficientNetV2-M Keras model."""
    global _cnn_model_cache
    if _cnn_model_cache is None:
        if not CNN_MODEL_PATH.exists():
            logger.error(f"CNN model file not found at: {CNN_MODEL_PATH}")
            raise FileNotFoundError(f"CNN model file not found: {CNN_MODEL_PATH}")

        try:
            logger.info(f"Loading EfficientNetV2-M CNN model from: {CNN_MODEL_PATH}")
            _cnn_model_cache = tf.keras.models.load_model(
                str(CNN_MODEL_PATH),
                custom_objects={"Dense": SafeDense},
                compile=False
            )
            logger.info("EfficientNetV2-M model loaded successfully.")
        except Exception as e:
            logger.exception(f"Failed to load CNN model from {CNN_MODEL_PATH}: {e}")
            raise RuntimeError(f"Failed to load CNN model: {e}")

    return _cnn_model_cache


def predict_visual_screenshot(screenshot_b64: Optional[str]) -> Dict[str, Any]:
    """
    Decodes base64 screenshot image, preprocesses tensor for EfficientNetV2-M (480x480 RGB),
    and runs visual CNN inference.
    """
    if not screenshot_b64:
        return {
            "visual_phishing_probability": 0.0,
            "prediction": "legitimate",
            "status": "unavailable",
            "error": "No screenshot provided"
        }

    try:
        # 1. Decode Base64 to image array
        img_bytes = base64.b64decode(screenshot_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            logger.warning("cv2.imdecode failed to decode image buffer")
            return {
                "visual_phishing_probability": 0.0,
                "prediction": "legitimate",
                "status": "error",
                "error": "Failed to decode screenshot image"
            }

        # 2. Preprocess: BGR -> RGB -> Resize 480x480 -> EfficientNetV2 preprocess
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img_rgb, (480, 480))
        img_array = np.expand_dims(img_resized.astype(np.float32), axis=0)
        img_preprocessed = tf.keras.applications.efficientnet_v2.preprocess_input(img_array)

        # 3. Model Inference
        cnn_model = load_cnn_model()
        raw_pred = cnn_model.predict(img_preprocessed, verbose=0)
        proba = float(raw_pred[0][0])

        if np.isnan(proba):
            proba = 0.0

        prediction = "phishing" if proba >= 0.50 else "legitimate"

        logger.info(f"Visual CNN Inference: prob={proba:.4f}, prediction={prediction}")

        return {
            "visual_phishing_probability": round(proba, 4),
            "prediction": prediction,
            "status": "analyzed",
            "error": None
        }

    except Exception as e:
        logger.exception("Error during visual CNN screenshot prediction")
        return {
            "visual_phishing_probability": 0.0,
            "prediction": "legitimate",
            "status": "error",
            "error": str(e)
        }
