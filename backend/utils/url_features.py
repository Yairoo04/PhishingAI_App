import re
import math
from urllib.parse import urlparse
from collections import Counter
import logging

try:
    from .adversarial_helpers import (
        check_unicode_spoofing,
        detect_brand_impersonation,
        extract_domain_parts,
    )
except ImportError:
    from adversarial_helpers import (
        check_unicode_spoofing,
        detect_brand_impersonation,
        extract_domain_parts,
    )

logger = logging.getLogger(__name__)


# Danh sách 40 features chính thức (35 features cũ + 5 features đối kháng mới)
URL_FEATURES = [
    "url_length", "domain_length", "path_length", "query_length",
    "count_dots", "count_hyphens", "count_at", "count_question",
    "count_equal", "count_slash",
    "count_digits", "count_special",
    "subdomain_count", "tld_length",
    "https", "www_count", "has_ip", "is_shortened", "abnormal_domain",
    "kw_login", "kw_secure", "kw_account", "kw_bank", "kw_verify",
    "kw_update", "kw_signin", "kw_confirm", "kw_password",
    "kw_bonus", "kw_free", "kw_reward",
    "url_entropy", "domain_entropy",
    "digit_ratio", "special_ratio",
    # 5 Adversarial-Hardening Features
    "is_homoglyph_or_punycode",
    "is_leetspeak_detected",
    "brand_similarity_score",
    "has_digit_in_sld",
    "consecutive_consonants_ratio"
]

PHISHING_KEYWORDS = [
    "login", "secure", "account", "bank", "verify",
    "update", "signin", "confirm", "password",
    "bonus", "free", "reward"
]

CONSONANTS_PATTERN = re.compile(r"[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]+")


def shannon_entropy(text: str) -> float:
    if not text:
        return 0.0
    counts = Counter(text)
    probs = [count / len(text) for count in counts.values()]
    return -sum(p * math.log2(p) for p in probs if p > 0)


def has_ip_address(domain: str) -> int:
    return 1 if re.match(r"^(?:\d{1,3}\.){3}\d{1,3}$", domain) else 0


def is_shortened_url(url: str) -> int:
    shorteners = [
        "bit.ly", "goo.gl", "tinyurl", "ow.ly", "t.co",
        "is.gd", "buff.ly", "adf.ly", "rebrand.ly", "shorturl.at",
        "shorte.st", "tiny.cc", "tr.im"
    ]
    return 1 if any(shortener in url.lower() for shortener in shorteners) else 0


def calc_consecutive_consonants_ratio(text: str) -> float:
    """Find longest consecutive consonants streak divided by length."""
    if not text:
        return 0.0
    matches = CONSONANTS_PATTERN.findall(text)
    max_len = max((len(m) for m in matches), default=0)
    return round(max_len / max(len(text), 1), 4)


def extract_features(url: str) -> dict:
    """
    Extract 40 lexical & adversarial URL features for base & stacking models.
    """
    try:
        if not url.lower().startswith(('http://', 'https://')):
            url = 'http://' + url

        parsed = urlparse(url)
        if not parsed.hostname:
            raise ValueError("Invalid URL - no hostname found")

        domain = parsed.hostname.lower()
        path = parsed.path or "/"
        query = parsed.query or ""
        url_lower = url.lower()

        url_len = len(url_lower)
        digit_count = sum(c.isdigit() for c in url_lower)
        special_count = sum(not c.isalnum() for c in url_lower)

        authority_part = url_lower.replace("https://", "").replace("http://", "").split('/')[0]
        abnormal_domain = 1 if domain not in authority_part else 0

        url_entropy_val = shannon_entropy(url_lower)
        domain_entropy_val = shannon_entropy(domain)

        # Domain parts for adversarial feature extraction
        reg_domain, sld, tokens = extract_domain_parts(domain)

        # Adversarial checks
        is_homoglyph = int(check_unicode_spoofing(url))
        is_leetspeak = 1 if re.search(r'[a-zA-Z][0134578@$]|[0134578@$][a-zA-Z]', sld) else 0
        has_digit_sld = 1 if any(c.isdigit() for c in sld) else 0

        is_impersonated, min_dist, matched_brand = detect_brand_impersonation(domain)
        if is_impersonated and matched_brand:
            brand_sim = max(0.0, 1.0 - (min_dist / max(len(matched_brand), 1)))
        elif min_dist < 99 and matched_brand:
            brand_sim = max(0.0, 1.0 - (min_dist / max(len(matched_brand), 1)))
        else:
            brand_sim = 0.0

        consonants_ratio = calc_consecutive_consonants_ratio(sld)

        features = {
            "url_length": url_len,
            "domain_length": len(domain),
            "path_length": len(path),
            "query_length": len(query),

            "count_dots": url_lower.count("."),
            "count_hyphens": url_lower.count("-"),
            "count_at": url_lower.count("@"),
            "count_question": url_lower.count("?"),
            "count_equal": url_lower.count("="),
            "count_slash": url_lower.count("/"),

            "count_digits": digit_count,
            "count_special": special_count,

            "subdomain_count": max(domain.count(".") - 1, 0),
            "tld_length": len(domain.split(".")[-1]) if "." in domain else 0,

            "https": 1 if parsed.scheme == "https" else 0,
            "www_count": domain.count("www."),

            "has_ip": has_ip_address(domain),
            "is_shortened": is_shortened_url(url),

            "abnormal_domain": abnormal_domain,

            "url_entropy": url_entropy_val,
            "domain_entropy": domain_entropy_val,

            "digit_ratio": digit_count / max(url_len, 1),
            "special_ratio": special_count / max(url_len, 1),

            # 5 New Adversarial Features
            "is_homoglyph_or_punycode": is_homoglyph,
            "is_leetspeak_detected": is_leetspeak,
            "brand_similarity_score": round(brand_sim, 4),
            "has_digit_in_sld": has_digit_sld,
            "consecutive_consonants_ratio": consonants_ratio,
        }

        for kw in PHISHING_KEYWORDS:
            features[f"kw_{kw}"] = 1 if kw in url_lower else 0

        for feat in URL_FEATURES:
            if feat not in features:
                logger.warning(f"Feature '{feat}' is missing -> setting default value 0")
                features[feat] = 0

        return features

    except Exception as e:
        logger.warning(f"Error extracting features from URL '{url}': {str(e)}")
        return {feat: 0 for feat in URL_FEATURES}