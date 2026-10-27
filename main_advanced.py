import os
import re
import math
import unicodedata
import cv2
import numpy as np
import pickle
import pandas as pd
import logging
import tensorflow as tf
from datetime import datetime
from email import policy
from email.parser import BytesParser
from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename
from flask_cors import CORS
from pyzbar.pyzbar import decode
from PyPDF2 import PdfReader
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
from contextlib import contextmanager
from typing import Dict, Optional, List, Union
import shap

# --- External dependencies with fallback ---
try:
    import tldextract
    HAS_TLDEXTRACT = True
except ImportError:
    HAS_TLDEXTRACT = False
try:
    import icalendar
    HAS_ICALENDAR = True
except ImportError:
    HAS_ICALENDAR = False
try:
    from Levenshtein import distance as levenshtein_distance
    HAS_LEVENSHTEIN = True
except ImportError:
    HAS_LEVENSHTEIN = False

# --- Top brand domains for adversarial check ---
TOP_BRANDS = [
    "google.com", "microsoft.com", "facebook.com", "paypal.com",
    "apple.com", "amazon.com", "netflix.com", "instagram.com",
    "twitter.com", "linkedin.com", "yahoo.com", "dropbox.com"
]

from Phishing_URL_Models_LightGBM.feature_extraction import extract_features, URL_FEATURES

app = Flask(__name__)
CORS(app)

# --- Server Configuration ---
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./Uploads")
ALLOWED_IMAGE_EXT = {"png", "jpg", "jpeg"}
ALLOWED_PDF_EXT   = {"pdf"}
ALLOWED_EMAIL_EXT = {"eml"}
MAX_FILE_SIZE_MB  = 10

# SỬA ĐỔI: Sử dụng thư mục models_advance làm mặc định
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "models_advance"))

CNN_MODEL_NAME = "efficientnetv2m_phishing"

STACKING_CONFIG = {
    "url": {
        "base": os.path.join(MODEL_DIR, "stacking_base_models_url.pkl"),
        "meta": os.path.join(MODEL_DIR, "stacking_meta_xgb_url.pkl"),
    },
    "file": {
        "base": os.path.join(MODEL_DIR, "stacking_base_models_final.pkl"),
        "meta": os.path.join(MODEL_DIR, "stacking_meta_xgb_final.pkl"),
    },
    "email": {
        "base": os.path.join(MODEL_DIR, "email_stacking_base_models.pkl"),
        "meta": os.path.join(MODEL_DIR, "email_stacking_meta_xgb.pkl"),
    }
}

app.config["UPLOAD_FOLDER"]      = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE_MB * 1024 * 1024
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("server_advanced.log", encoding="utf-8"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

model_cache    = {}
stacking_cache = {}

class ModelRegistry:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir

    def load_cnn(self, name: str):
        key = f"{name}_keras"
        if key not in model_cache:
            path = os.path.join(self.model_dir, f"{name}.keras")
            # Fallback to root models folder if not in advance
            if not os.path.exists(path):
                alt_path = os.path.join(os.path.dirname(self.model_dir), "models", f"{name}.keras")
                path = alt_path if os.path.exists(alt_path) else path
            
            if not os.path.exists(path):
                raise FileNotFoundError(f"Không tìm thấy mô hình CNN: {path}")
            model = tf.keras.models.load_model(path)
            model_cache[key] = model
            logger.info(f"Loaded CNN: {key}")
        return model_cache[key]

model_registry = ModelRegistry(MODEL_DIR)

def load_stacking(model_type: str):
    if model_type not in stacking_cache:
        cfg = STACKING_CONFIG[model_type]
        if not (os.path.exists(cfg["base"]) and os.path.exists(cfg["meta"])):
            raise FileNotFoundError(f"Thiếu file stacking {model_type} tại {MODEL_DIR}")
        with open(cfg["base"], "rb") as f:
            base_models = pickle.load(f)
        with open(cfg["meta"], "rb") as f:
            meta_model = pickle.load(f)
        stacking_cache[model_type] = {"base": base_models, "meta": meta_model}
        logger.info(f"Loaded stacking models for {model_type} from {MODEL_DIR}")
    return stacking_cache[model_type]

def predict_stacking(X: pd.DataFrame, model_type: str) -> tuple:
    logger.info(f"[predict_stacking_advanced] model_type={model_type}, X shape={X.shape}")
    if X.shape[0] != 1:
        X = X.iloc[[0]]

    models = load_stacking(model_type)
    base = models["base"]
    meta = models["meta"]

    # --- ADVANCED: Tách cờ đối kháng riêng cho meta-classifier ---
    X_base = X.copy()
    flags = ["has_ical_url", "has_xfa", "brand_impersonation"]
    for f in flags:
        if f in X_base.columns:
            X_base = X_base.drop(columns=[f])

    # Lấy xác suất từ các base models (RF, LGBM, XGB, CAT)
    probs = np.column_stack([
        base['rf'].predict_proba(X_base)[:, 1],
        base['lgbm'].predict_proba(X_base)[:, 1],
        base['xgb'].predict_proba(X_base)[:, 1],
        base['cat'].predict_proba(X_base)[:, 1],
    ])

    # --- Gộp cờ đối kháng vào đầu vào của Meta-model ---
    meta_features = probs
    if model_type == "email" and "has_ical_url" in X.columns:
        meta_features = np.column_stack([probs, X["has_ical_url"]])
    elif model_type == "file" and "has_xfa" in X.columns:
        meta_features = np.column_stack([probs, X["has_xfa"]])
    elif model_type == "url" and "brand_impersonation" in X.columns:
        meta_features = np.column_stack([probs, X["brand_impersonation"]])

    try:
        final_proba_array = meta.predict_proba(meta_features)
        final_proba = float(final_proba_array[0, 1])
    except Exception as e:
        logger.warning(f"Meta-model inference failed, falling back to mean: {e}")
        final_proba = float(np.mean(probs))
        
    if np.isnan(final_proba):
        final_proba = 0.0

    return int(final_proba > 0.5), final_proba

def get_shap_explanation(X: pd.DataFrame, model_type: str, top_n: int = 5) -> dict:
    try:
        if X.shape[0] != 1: X = X.iloc[[0]]
        models = load_stacking(model_type)
        base = models["base"]; meta = models["meta"]

        # Drop flags for base prediction
        X_base = X.copy()
        for f in ["has_ical_url", "has_xfa", "brand_impersonation"]:
            if f in X_base.columns: X_base = X_base.drop(columns=[f])

        base_probs = np.column_stack([
            base['rf'].predict_proba(X_base)[:, 1],
            base['lgbm'].predict_proba(X_base)[:, 1],
            base['xgb'].predict_proba(X_base)[:, 1],
            base['cat'].predict_proba(X_base)[:, 1],
        ])

        # Prepare meta features for SHAP
        feature_names = ["RF_prob", "LGBM_prob", "XGB_prob", "Cat_prob"]
        meta_features = base_probs

        if model_type == "email" and "has_ical_url" in X.columns:
            meta_features = np.column_stack([base_probs, X["has_ical_url"]])
            feature_names.append("has_ical_url")
        elif model_type == "file" and "has_xfa" in X.columns:
            meta_features = np.column_stack([base_probs, X["has_xfa"]])
            feature_names.append("has_xfa")
        elif model_type == "url" and "brand_impersonation" in X.columns:
            meta_features = np.column_stack([base_probs, X["brand_impersonation"]])
            feature_names.append("brand_impersonation")

        base_df = pd.DataFrame(meta_features, columns=feature_names)
        explainer = shap.TreeExplainer(meta)
        shap_values = explainer.shap_values(base_df)

        if isinstance(shap_values, list): shap_values = shap_values[1]
        shap_vals_for_class = np.array(shap_values)[0] if len(np.array(shap_values).shape) == 2 else np.array(shap_values)

        shap_abs = np.abs(shap_vals_for_class)
        directions = shap_vals_for_class
        sorted_idx = np.argsort(shap_abs)[::-1][:top_n]

        return {
            "top_features": [
                {
                    "feature": feature_names[i],
                    "shap_value": float(shap_abs[i]),
                    "direction": "tang nguy co" if directions[i] > 0 else "giam nguy co"
                }
                for i in sorted_idx
            ],
            "base_value": float(explainer.expected_value[1] if hasattr(explainer.expected_value, "__len__") else explainer.expected_value)
        }
    except Exception as e:
        logger.warning(f"SHAP failed: {str(e)}")
        return {"error": str(e), "top_features": []}

# --- Adversarial Helpers ---
def get_registrable_domain(host: str) -> str:
    if HAS_TLDEXTRACT:
        ext = tldextract.extract(host)
        if ext.domain and ext.suffix: return f"{ext.domain}.{ext.suffix}"
    parts = host.split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host

def check_unicode_spoofing(url: str) -> bool:
    return unicodedata.normalize("NFKC", url) != url

def min_brand_distance(domain: str) -> int:
    if not HAS_LEVENSHTEIN: return 99
    return min(levenshtein_distance(domain.lower(), b) for b in TOP_BRANDS)

def extract_ical_urls(body: str) -> List[str]:
    urls = []
    url_pattern = re.compile(r'https?://[^\s\"<>]+')
    if HAS_ICALENDAR:
        try:
            cal = icalendar.Calendar.from_ical(body.encode("utf-8", errors="replace"))
            for component in cal.walk():
                for field in ["DESCRIPTION", "URL", "LOCATION", "COMMENT"]:
                    val = str(component.get(field, ""))
                    urls.extend(url_pattern.findall(val))
        except: pass
    else: urls = url_pattern.findall(body)
    return list(set(urls))

def adversarial_url_flags(url: str) -> Dict:
    from urllib.parse import urlparse
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    reg_domain = get_registrable_domain(host)
    brand_dist = min_brand_distance(reg_domain)
    has_nested = bool(re.search(r'(https?%3A|%2F%2F)', url, re.IGNORECASE))
    return {
        "unicode_spoofing": int(check_unicode_spoofing(url)),
        "brand_impersonation": int(0 < brand_dist <= 2),
        "brand_min_distance": brand_dist,
        "has_nested_url": int(has_nested)
    }

@contextmanager
def temp_file(file, filename: str):
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    try:
        file.save(path)
        yield path
    finally:
        if os.path.exists(path): os.remove(path)

def preprocess_image_for_efficientnetv2(img_array: np.ndarray, target_size=(480, 480)) -> np.ndarray:
    img = cv2.resize(img_array, target_size)
    img = img.astype("float32")
    img = tf.keras.applications.efficientnet_v2.preprocess_input(img)
    return np.expand_dims(img, axis=0)

# --- Feature Schemas ---
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
    "number_replies", "label", "has_ical_url"
]

EXPECTED_FEATURES = [
    "PdfSize", "MetadataSize", "Pages", "XrefLength", "TitleCharacters",
    "isEncrypted", "EmbeddedFiles", "Images", "Text", "Header", "Obj",
    "Endobj", "Stream", "Endstream", "Xref", "Trailer", "StartXref",
    "PageNo", "Encrypt", "ObjStm", "JS", "Javascript", "AA", "OpenAction",
    "Acroform", "JBIG2Decode", "RichMedia", "Launch", "EmbeddedFile",
    "XFA", "Colors", "has_xfa"
]

def extract_email_features(headers: Union[str, Dict]) -> pd.DataFrame:
    has_ical_url = 0
    if isinstance(headers, str):
        try:
            with open(headers, 'rb') as f:
                msg = BytesParser(policy=policy.default).parse(f)
            headers_dict = dict(msg.items()); full_msg = msg
            for part in msg.walk():
                if part.get_content_type() == "text/calendar":
                    ical_content = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    if len(extract_ical_urls(ical_content)) > 0: has_ical_url = 1
        except Exception as e: raise ValueError(f"Invalid .eml file: {e}")
    else: headers_dict = headers; full_msg = None

    received_headers = full_msg.get_all("Received", []) if full_msg else []
    hops = len(received_headers); most_recent = received_headers[0] if received_headers else ""
    is_missing = lambda h: int(h not in headers_dict or not headers_dict[h].strip())
    
    domain_match = lambda h1, h2_val: int(
        bool(re.search(r'@([\w\.-]+)', headers_dict.get(h1, ''))) and
        bool(re.search(r'@([\w\.-]+)', h2_val)) and
        re.search(r'@([\w\.-]+)', headers_dict.get(h1, '')).group(1) ==
        re.search(r'@([\w\.-]+)', h2_val).group(1)
    )

    # Simplified extraction for space
    feats = {
        "hops": hops, "missing_subject": is_missing("Subject"), "missing_to": is_missing("To"),
        "missing_content-type": is_missing("Content-Type"), "missing_mime-version": is_missing("MIME-Version"),
        "missing_x-mailer": is_missing("X-Mailer"), "missing_delivered-to": is_missing("Delivered-To"),
        "missing_list-unsubscribe": is_missing("List-Unsubscribe"), "missing_received-spf": is_missing("Received-SPF"),
        "missing_reply-to": is_missing("Reply-To"),
        "str_from_chevron": int(bool(re.search(r'<[\w\.-]+@[\w\.-]+>', headers_dict.get("From", "")))),
        "str_to_chevron": int(bool(re.search(r'<[\w\.-]+@[\w\.-]+>', headers_dict.get("To", "")))),
        "str_message-ID_dollar": int(bool(re.search(r'\$', headers_dict.get("Message-ID", "")))),
        "str_return-path_bounce": int(bool(re.search(r'bounce', headers_dict.get("Return-Path", ""), re.IGNORECASE))),
        "str_content-type_texthtml": int(bool(re.search(r'text/html', headers_dict.get("Content-Type", ""), re.IGNORECASE))),
        "domain_match_from_return-path": domain_match("From", headers_dict.get("Return-Path", "")),
        "domain_match_to_from": domain_match("To", headers_dict.get("From", "")),
        "domain_match_to_message-id": domain_match("To", headers_dict.get("Message-ID", "")),
        "domain_match_from_reply-to": domain_match("From", headers_dict.get("Reply-To", "")),
        "domain_match_message-id_from": domain_match("Message-ID", headers_dict.get("From", "")),
        "length_from": len(headers_dict.get("From", "")),
        "num_recipients_to": len([x for x in headers_dict.get("To", "").split(",") if x.strip()]),
        "num_recipients_cc": len([x for x in headers_dict.get("Cc", "").split(",") if x.strip()]),
        "time_zone": int(bool(re.search(r'([+-]\d{4})', headers_dict.get("Date", "")))),
        "day_of_week": 0, "span_time": 0, "date_comp_date_received": int("Date" in headers_dict and "Received" in headers_dict),
        "content-encoding-val": 0, "received_str_forged": 0, "number_replies": 0, "label": 0, "has_ical_url": has_ical_url
    }
    return pd.DataFrame([[feats[f] for f in EMAIL_FEATURES if f != "label"]], columns=[f for f in EMAIL_FEATURES if f != "label"])

def extract_pdf_features(pdf_path: str) -> Dict:
    try:
        pdf = PdfReader(pdf_path)
        features = {feat: 0 for feat in EXPECTED_FEATURES}
        features["PdfSize"] = os.path.getsize(pdf_path) / 1024.0
        features["MetadataSize"] = len(str(pdf.metadata)) if pdf.metadata else 0
        features["Pages"] = len(pdf.pages); features["PageNo"] = len(pdf.pages)
        with open(pdf_path, "rb") as f: content = f.read()
        for key in ["Header", "Obj", "Endobj", "Stream", "Endstream", "Xref", "Trailer", "StartXref"]:
            features[key] = content.count(key.lower().encode() if key != "Header" else b"%PDF")
        for key in ["Encrypt", "ObjStm", "AA", "OpenAction", "Acroform", "JBIG2Decode", "RichMedia", "Launch", "EmbeddedFile", "EmbeddedFiles", "XFA"]:
            features[key] = content.count(f"/{key}".encode() if key != "JBIG2Decode" else b"JBIG2Decode")
        try:
            text = extract_text(pdf_path, laparams=LAParams())
            features["Text"] = len(text) if text else 0
            features["JS"] = features["Javascript"] = 1 if "javascript" in (text or "").lower() else 0
        except: pass
        features["has_xfa"] = 1 if features["XFA"] > 0 else 0
        return features
    except Exception as e: raise ValueError(f"Failed to process PDF: {e}")

# --- Routes ---
@app.route("/")
def home(): return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    try:
        if "file" in request.files and request.files["file"].filename:
            file = request.files["file"]; filename = secure_filename(file.filename)
            ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""

            with temp_file(file, filename) as file_path:
                if ext in ALLOWED_EMAIL_EXT:
                    df = extract_email_features(file_path)
                    _, proba = predict_stacking(df, "email")
                    return jsonify({"type": "email", "prediction": "Phishing" if proba > 0.5 else "Legitimate", "probability_phishing": round(float(proba), 4), "explanation": get_shap_explanation(df, "email"), "features": df.to_dict(orient="records")[0]})
                elif ext in ALLOWED_PDF_EXT:
                    feat = extract_pdf_features(file_path); df = pd.DataFrame([feat], columns=[f for f in EXPECTED_FEATURES if f != "label"])
                    _, proba = predict_stacking(df, "file")
                    return jsonify({"type": "pdf", "prediction": "Malicious" if proba > 0.5 else "Benign", "probability_malicious": round(float(proba), 4), "explanation": get_shap_explanation(df, "file"), "features": feat})
                elif ext in ALLOWED_IMAGE_EXT:
                    img = cv2.imread(file_path)
                    if img is None: return jsonify({"error": "Không đọc được ảnh"}), 400
                    qr_codes = decode(img)
                    if qr_codes:
                        results = []
                        for qr in qr_codes:
                            url = qr.data.decode("utf-8"); adv = adversarial_url_flags(url); f_url = extract_features(url); f_url.update(adv)
                            df_url = pd.DataFrame([f_url], columns=URL_FEATURES + ["brand_impersonation"])
                            _, prob = predict_stacking(df_url, "url")
                            results.append({"url": url, "prediction": "Phishing" if prob > 0.5 else "Legitimate", "probability_phishing": round(float(prob), 4)})
                        return jsonify({"type": "qr_codes", "results": results})
                    cnn_input = preprocess_image_for_efficientnetv2(img); cnn_model = model_registry.load_cnn(CNN_MODEL_NAME)
                    proba = float(cnn_model.predict(cnn_input, verbose=0)[0][0])
                    return jsonify({"type": "image", "prediction": "Phishing" if proba > 0.5 else "Legitimate", "probability_phishing": round(proba, 4)})
        
        data = request.get_json(silent=True)
        if data and ("url" in data or "text" in data):
            text = (data.get("url") or data.get("text", "")).strip()
            text_normalized = unicodedata.normalize("NFKC", text)
            adv = adversarial_url_flags(text_normalized)
            feat = extract_features(text_normalized); feat.update(adv)
            df = pd.DataFrame([feat], columns=URL_FEATURES + ["brand_impersonation"])
            _, prob = predict_stacking(df, "url")
            label = "Phishing" if prob > 0.5 else "Legitimate"
            if adv["unicode_spoofing"]: label = "Phishing"; prob = max(prob, 0.95)
            if adv["brand_impersonation"]: label = "Phishing"; prob = max(prob, 0.90)
            return jsonify({"type": "url", "prediction": label, "probability_phishing": round(float(prob), 4), "explanation": get_shap_explanation(df, "url"), "adversarial_flags": adv})

        return jsonify({"error": "Yêu cầu không hợp lệ"}), 400
    except Exception as e:
        logger.exception("Lỗi /predict"); return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5001)
