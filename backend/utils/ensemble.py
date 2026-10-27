"""
Multimodal Ensemble Fusion Engine (Paper Q2 - PhishStack Framework)
Combines probabilities from 3 modalities:
  1. Lexical & Stacking ML URL Model (P_url)
  2. Visual CNN EfficientNetV2-M Screenshot Model (P_visual)
  3. Web HTML & DOM Content Analysis Model (P_content)
Applies dynamic weight normalization and adversarial risk overrides.
"""
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)

# Base Modality Weights for Q2 Multimodal Ensemble
BASE_WEIGHT_URL = 0.45
BASE_WEIGHT_VISUAL = 0.35
BASE_WEIGHT_CONTENT = 0.20


def fuse_multimodal_predictions(
    url_proba: float,
    visual_result: Dict[str, Any],
    content_result: Dict[str, Any],
    adv_flags: Dict[str, Any]
) -> Tuple[str, float, Dict[str, Any]]:
    """
    Fuses predictions across all 3 available modalities.
    Returns:
      (prediction_label: str ("phishing"/"legitimate"),
       final_ensemble_proba: float (0.0 to 1.0),
       ensemble_breakdown: dict)
    """
    p_url = max(0.0, min(1.0, float(url_proba)))

    # Determine visual score & weight
    vis_status = visual_result.get("status", "unavailable")
    p_visual = float(visual_result.get("visual_phishing_probability", 0.0)) if vis_status == "analyzed" else 0.0
    w_visual = BASE_WEIGHT_VISUAL if vis_status == "analyzed" else 0.0

    # Determine content score & weight
    cnt_status = content_result.get("status", "no_content")
    p_content = float(content_result.get("content_phishing_probability", 0.0)) if cnt_status == "analyzed" else 0.0
    w_content = BASE_WEIGHT_CONTENT if cnt_status == "analyzed" else 0.0

    w_url = BASE_WEIGHT_URL

    # Normalize weights
    total_w = w_url + w_visual + w_content
    w_url_norm = w_url / total_w
    w_vis_norm = w_visual / total_w
    w_cnt_norm = w_content / total_w

    # Weighted Ensemble Fusion Score
    raw_ensemble_proba = (w_url_norm * p_url) + (w_vis_norm * p_visual) + (w_cnt_norm * p_content)

    # Adversarial & High-Risk Hard Overrides
    final_proba = raw_ensemble_proba
    override_reason = None

    if adv_flags.get("unicode_spoofing"):
        final_proba = max(final_proba, 0.98)
        override_reason = "Adversarial Homoglyph / Unicode Spoofing Detected"
    if adv_flags.get("brand_impersonation"):
        final_proba = max(final_proba, 0.96)
        matched_brand = adv_flags.get("matched_brand")
        if matched_brand:
            override_reason = f"Adversarial Brand Impersonation Flagged (Targeting {matched_brand.capitalize()})"
        else:
            override_reason = "Adversarial Brand Impersonation Flagged"
    
    cnt_features = content_result.get("features", {})
    if cnt_features.get("title_brand_mismatch"):
        final_proba = max(final_proba, 0.88)
        brand = cnt_features.get("detected_brand", "known brand")
        override_reason = f"Title-Domain Mismatch (Spoofing {brand.capitalize()})"

    final_proba = round(min(max(final_proba, 0.0), 1.0), 4)
    prediction = "phishing" if final_proba >= 0.50 else "legitimate"

    breakdown = {
        "ensemble_model": "PhishStack Q2 Multimodal Ensemble (URL Stacking + Visual EfficientNetV2-M + Web Content Analysis)",
        "final_ensemble_probability": round(final_proba * 100, 2),
        "raw_weighted_score": round(raw_ensemble_proba * 100, 2),
        "override_triggered": override_reason is not None,
        "override_reason": override_reason,
        "modalities": {
            "url_stacking": {
                "probability": round(p_url * 100, 2),
                "prediction": "phishing" if p_url >= 0.50 else "legitimate",
                "normalized_weight": round(w_url_norm, 3),
                "status": "analyzed"
            },
            "visual_cnn": {
                "probability": round(p_visual * 100, 2),
                "prediction": "phishing" if p_visual >= 0.50 else "legitimate",
                "normalized_weight": round(w_vis_norm, 3),
                "status": vis_status
            },
            "web_content": {
                "probability": round(p_content * 100, 2),
                "prediction": "phishing" if p_content >= 0.50 else "legitimate",
                "normalized_weight": round(w_cnt_norm, 3),
                "status": cnt_status,
                "features": cnt_features
            }
        }
    }

    logger.info(
        f"Multimodal Ensemble Fusion | P_final={final_proba:.4f} | "
        f"P_url={p_url:.4f} (w={w_url_norm:.2f}), P_vis={p_visual:.4f} (w={w_vis_norm:.2f}), "
        f"P_cnt={p_content:.4f} (w={w_cnt_norm:.2f}) | override={override_reason}"
    )

    return prediction, final_proba, breakdown
