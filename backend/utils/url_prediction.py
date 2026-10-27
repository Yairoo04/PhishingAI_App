import os
import pickle
import pandas as pd
import logging
from typing import Tuple, Dict, Any, Optional

from .url_features import extract_features, URL_FEATURES  

logger = logging.getLogger(__name__)


def load_model(model_path: str) -> Optional[Any]:
    
    if not os.path.exists(model_path):
        logger.error(f"Model file not found: {model_path}")
        return None

    try:
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        logger.info(f"Model loaded successfully from: {model_path}")
        return model
    except pickle.UnpicklingError as pe:
        logger.error(f"Pickle unpickling error while loading {model_path}: {pe}")
        return None
    except Exception as e:
        logger.exception(f"Unexpected error loading model from {model_path}: {e}")
        return None


def predict_url(model: Any, url: str) -> Dict[str, Any]:
    
    result = {
        "prediction": "Error",
        "phishing_probability": 0.0,
        "legitimate_probability": 0.0,
        "features": {},
        "error": None
    }

    try:
        if model is None:
            raise ValueError("Model is None - cannot predict")

        
        features = extract_features(url)
        if not features or all(v == 0 for v in features.values()):
            logger.warning(f"No meaningful features extracted from URL: {url}")
            result["error"] = "No valid features extracted"
            return result

        
        X_new = pd.DataFrame([features])

        
        if hasattr(model, "feature_names_in_"):
            expected_features = model.feature_names_in_
            
            X_new = X_new.reindex(columns=expected_features, fill_value=0)
        else:
            logger.warning("Model does not have 'feature_names_in_' attribute - using extracted order")
            
            X_new = X_new.reindex(columns=URL_FEATURES, fill_value=0)

        
        prob = model.predict_proba(X_new)[0]
        phishing_prob = float(prob[1])   
        legitimate_prob = float(prob[0]) 

        prediction = "Phishing" if phishing_prob > legitimate_prob else "Legitimate"

        result.update({
            "prediction": prediction,
            "phishing_probability": phishing_prob,
            "legitimate_probability": legitimate_prob,
            "features": features
        })

        logger.info(f"Prediction for URL '{url}': {prediction} (phishing prob: {phishing_prob:.4f})")

    except AttributeError as ae:
        logger.error(f"Model attribute error during prediction for '{url}': {ae}")
        result["error"] = "Model incompatible (missing required attributes)"
    except ValueError as ve:
        logger.error(f"Value error during prediction for '{url}': {ve}")
        result["error"] = str(ve)
    except Exception as e:
        logger.exception(f"Unexpected error predicting URL '{url}': {e}")
        result["error"] = f"Prediction failed: {str(e)}"

    return result