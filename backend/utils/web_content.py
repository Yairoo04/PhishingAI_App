"""
Web Content Phishing Analysis Module (Modality 3)
Extracts structural HTML indicators, DOM security features, identity mismatches,
and credential-harvesting text patterns to compute a Content Phishing Probability.
"""
import re
import urllib.parse
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# List of major brand keywords commonly impersonated in phishing page titles
TARGET_BRANDS: Dict[str, List[str]] = {
    "paypal": ["paypal.com", "paypal.me"],
    "google": ["google.com", "accounts.google.com"],
    "microsoft": ["microsoft.com", "office.com", "live.com", "outlook.com"],
    "facebook": ["facebook.com", "meta.com"],
    "meta": ["facebook.com", "meta.com", "instagram.com"],
    "apple": ["apple.com", "icloud.com"],
    "amazon": ["amazon.com", "aws.amazon.com"],
    "netflix": ["netflix.com"],
    "binance": ["binance.com"],
    "coinbase": ["coinbase.com"],
    "metamask": ["metamask.io"],
    "bank of america": ["bankofamerica.com"],
    "chase": ["chase.com"],
    "wellsfargo": ["wellsfargo.com"],
}

# High-risk urgency / credential harvesting keywords
PHISHING_KEYWORDS = [
    r"verify\s+(your\s+)?account",
    r"confirm\s+(your\s+)?password",
    r"account\s+suspended",
    r"unusual\s+(login\s+)?activity",
    r"security\s+alert",
    r"billing\s+update",
    r"update\s+billing",
    r"identity\s+verification",
    r"action\s+required",
    r"log\s*in\s+to\s+continue",
    r"session\s+expired",
    r"unlock\s+your\s+account",
    r"unauthorized\s+access",
]


def extract_domain(url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(url if "://" in url else f"http://{url}")
        host = (parsed.netloc or parsed.path).split(":")[0].lower()
        parts = host.split(".")
        return ".".join(parts[-2:]) if len(parts) >= 2 else host
    except Exception:
        return ""


def analyze_web_content(html_content: str, inner_text: str, url: str) -> Dict[str, Any]:
    """
    Analyzes raw HTML source content and visible page text to compute a content phishing probability.
    Returns:
      {
        "content_phishing_probability": float (0.0 to 1.0),
        "prediction": "phishing" | "legitimate",
        "features": dict of extracted content indicators
      }
    """
    if not html_content and not inner_text:
        return {
            "content_phishing_probability": 0.0,
            "prediction": "legitimate",
            "status": "no_content",
            "features": {}
        }

    html_lower = html_content.lower() if html_content else ""
    text_lower = inner_text.lower() if inner_text else ""
    current_domain = extract_domain(url)

    # 1. Form & Password Input Analysis
    form_matches = re.findall(r"<form[^>]*>", html_lower)
    form_count = len(form_matches)
    
    password_fields = len(re.findall(r'<input[^>]*type=["\']password["\']', html_lower))
    email_fields = len(re.findall(r'<input[^>]*type=["\']email["\']', html_lower)) + \
                   len(re.findall(r'<input[^>]*name=["\'][^"\']*(email|username|login)[^"\']*["\']', html_lower))

    # Check for external form submission action
    external_form_action = False
    for form_tag in form_matches:
        action_match = re.search(r'action=["\']([^"\']+)["\']', form_tag)
        if action_match:
            action_url = action_match.group(1).strip()
            if action_url.startswith("http://") or action_url.startswith("https://"):
                action_domain = extract_domain(action_url)
                if action_domain and current_domain and action_domain != current_domain:
                    external_form_action = True
                    break

    # 2. DOM Obfuscation & Security Risks
    iframe_count = len(re.findall(r"<iframe[^>]*>", html_lower))
    hidden_input_count = len(re.findall(r'<input[^>]*type=["\']hidden["\']', html_lower))
    
    # Check for script event listeners restricting user control (e.g. disable right click)
    disabled_right_click = bool(re.search(r"(oncontextmenu|onselectstart|event\.preventdefault)", html_lower))

    # 3. HTML Title & Brand Impersonation Check
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html_lower, re.IGNORECASE | re.DOTALL)
    title_text = title_match.group(1).strip() if title_match else ""
    
    title_brand_mismatch = False
    detected_brand = None
    if title_text:
        for brand, official_domains in TARGET_BRANDS.items():
            if brand in title_text.lower():
                is_official = any(d in current_domain for d in official_domains)
                if not is_official:
                    title_brand_mismatch = True
                    detected_brand = brand
                    break

    # 4. Phishing Keyword Density / Match Count
    matched_keywords = []
    for pattern in PHISHING_KEYWORDS:
        if re.search(pattern, text_lower) or re.search(pattern, html_lower):
            matched_keywords.append(pattern)

    keyword_count = len(matched_keywords)

    # ── Calculate Content Phishing Risk Score ────────────────────────────────
    risk_score = 0.0

    # Risk factor: Form containing password input on unverified page
    if password_fields > 0:
        risk_score += 0.35
    elif form_count > 0 and email_fields > 0:
        risk_score += 0.20

    # Risk factor: Form data submitted to external domain (exfiltration)
    if external_form_action:
        risk_score += 0.40

    # Risk factor: Page title impersonates known brand on unofficial domain
    if title_brand_mismatch:
        risk_score += 0.45

    # Risk factor: Phishing keyword matches
    if keyword_count >= 3:
        risk_score += 0.30
    elif keyword_count >= 1:
        risk_score += 0.15

    # Risk factor: Obfuscation indicators
    if disabled_right_click:
        risk_score += 0.10
    if iframe_count >= 2:
        risk_score += 0.10

    # Normalize score to range [0.0, 1.0]
    content_prob = min(max(risk_score, 0.0), 1.0)
    prediction = "phishing" if content_prob >= 0.50 else "legitimate"

    features = {
        "form_count": form_count,
        "password_fields": password_fields,
        "email_fields": email_fields,
        "external_form_action": external_form_action,
        "iframe_count": iframe_count,
        "hidden_input_count": hidden_input_count,
        "disabled_right_click": disabled_right_click,
        "title_text": title_text[:100] if title_text else "",
        "title_brand_mismatch": title_brand_mismatch,
        "detected_brand": detected_brand,
        "phishing_keyword_matches": keyword_count,
    }

    logger.info(f"Web Content Analysis for {url}: prob={content_prob:.4f}, brand_mismatch={title_brand_mismatch}, ext_form={external_form_action}")

    return {
        "content_phishing_probability": round(content_prob, 4),
        "prediction": prediction,
        "status": "analyzed",
        "features": features
    }
