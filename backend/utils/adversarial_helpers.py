"""
adversarial_helpers.py
Comprehensive adversarial-robustness utilities for PhishStack backend.
Detects:
  - Leetspeak & Typosquatting Brand Impersonation (e.g., y0utube, paypa1, m1crosoft)
  - Unicode Homoglyph & Punycode Spoofing (e.g., Cyrillic 'о', Greek 'ο', xn--)
  - Multi-script / Cross-script Domain Exploits
  - Token-level and Subdomain Brand Hijacking
  - iCalendar URL injection & PDF XFA exploit
"""
import re
import unicodedata
import logging
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)

# --- Levenshtein Distance with Pure-Python Fallback ---
try:
    from Levenshtein import distance as _c_levenshtein
    def levenshtein_distance(s1: str, s2: str) -> int:
        return _c_levenshtein(s1, s2)
except ImportError:
    logger.info("python-Levenshtein C-lib not found. Using high-performance Pure-Python Levenshtein.")
    def levenshtein_distance(s1: str, s2: str) -> int:
        """Pure-Python dynamic programming Levenshtein distance (O(min(m, n)) space)."""
        if s1 == s2:
            return 0
        if len(s1) < len(s2):
            s1, s2 = s2, s1
        if not s2:
            return len(s1)
        prev = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            curr = [i + 1] + [0] * len(s2)
            for j, c2 in enumerate(s2):
                cost = 0 if c1 == c2 else 1
                curr[j + 1] = min(prev[j + 1] + 1, curr[j] + 1, prev[j] + cost)
            prev = curr
        return prev[-1]


# --- TLD Extraction with Smart Fallback ---
try:
    import tldextract
    _HAS_TLDEXTRACT = True
except ImportError:
    _HAS_TLDEXTRACT = False

# Known multi-part TLD suffixes for accurate fallback
COMMON_TWO_PART_TLDS = {
    "com.vn", "edu.vn", "gov.vn", "net.vn", "org.vn", "co.uk", "org.uk",
    "gov.uk", "ac.uk", "co.jp", "ne.jp", "com.au", "net.au", "com.br",
    "co.in", "net.in", "gen.in", "co.nz", "com.sg", "com.tw", "com.hk"
}


# --- High-Value Brand Names and Official Domains ---
TOP_BRAND_MAP = {
    # Video, Streaming & Entertainment
    "youtube": "youtube.com",
    "netflix": "netflix.com",
    "spotify": "spotify.com",
    "tiktok": "tiktok.com",
    "twitch": "twitch.tv",
    "vimeo": "vimeo.com",
    
    # Big Tech & Search
    "google": "google.com",
    "microsoft": "microsoft.com",
    "facebook": "facebook.com",
    "instagram": "instagram.com",
    "apple": "apple.com",
    "amazon": "amazon.com",
    "twitter": "twitter.com",
    "linkedin": "linkedin.com",
    "yahoo": "yahoo.com",
    "bing": "bing.com",
    
    # Messaging & Social
    "telegram": "telegram.org",
    "whatsapp": "whatsapp.com",
    "discord": "discord.com",
    "signal": "signal.org",
    "skype": "skype.com",
    "zoom": "zoom.us",
    "slack": "slack.com",
    
    # Dev, Cloud & Productivity
    "github": "github.com",
    "gitlab": "gitlab.com",
    "dropbox": "dropbox.com",
    "onedrive": "onedrive.live.com",
    "icloud": "icloud.com",
    "cloudflare": "cloudflare.com",
    "openai": "openai.com",
    "chatgpt": "chatgpt.com",
    
    # Payment & Global Banking
    "paypal": "paypal.com",
    "bankofamerica": "bankofamerica.com",
    "chase": "chase.com",
    "wellsfargo": "wellsfargo.com",
    "citibank": "citibank.com",
    "capitalone": "capitalone.com",
    "stripe": "stripe.com",
    "revolut": "revolut.com",
    "wise": "wise.com",
    
    # Crypto
    "binance": "binance.com",
    "coinbase": "coinbase.com",
    "kraken": "kraken.com",
    "metamask": "metamask.io",
    "trustwallet": "trustwallet.com",
    
    # E-Commerce & Gaming
    "ebay": "ebay.com",
    "walmart": "walmart.com",
    "aliexpress": "aliexpress.com",
    "steam": "steampowered.com",
    "steamcommunity": "steamcommunity.com",
    "roblox": "roblox.com",
    
    # Vietnam Banks & Financial Services
    "vietcombank": "vietcombank.com.vn",
    "techcombank": "techcombank.com",
    "mbbank": "mbbank.com.vn",
    "vietinbank": "vietinbank.vn",
    "bidv": "bidv.com.vn",
    "tpbank": "tpb.vn",
    "vpbank": "vpbank.com.vn",
    "acb": "acb.com.vn",
    "sacombank": "sacombank.com.vn",
    "agribank": "agribank.com.vn",
    "hdbank": "hdbank.com.vn",
    "shb": "shb.com.vn",
    "ocb": "ocb.com.vn",
    "momo": "momo.vn",
    "zalopay": "zalopay.vn",
    "viettelmoney": "viettelmoney.vn",
    "vnpay": "vnpay.vn",
    
    # Vietnam E-Commerce & Gov Services
    "shopee": "shopee.vn",
    "lazada": "lazada.vn",
    "tiki": "tiki.vn",
    "sendo": "sendo.vn",
    "vneid": "vneid.gov.vn",
    "dichvucong": "dichvucong.gov.vn",
    "baohiemxahoi": "baohiemxahoi.gov.vn",
    "fpt": "fpt.vn",
    "fptplay": "fptplay.vn",
    "vnpt": "vnpt.com.vn",
    "viettel": "viettel.vn",
    "zing": "zing.vn",
}

TOP_BRANDS = list(set(TOP_BRAND_MAP.values()))


# --- Leetspeak & Typo Substitution Dictionary ---
LEET_CHAR_MAP = {
    '0': 'o',
    '1': 'l',   # also could be 'i'
    '3': 'e',
    '4': 'a',
    '@': 'a',
    '5': 's',
    '$': 's',
    '7': 't',
    '8': 'b',
    '9': 'g',
}

# Unicode Confusables (Cyrillic, Greek, etc. lookalikes mapping to Latin)
CONFUSABLES_MAP = {
    # Cyrillic
    '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c',
    '\u0443': 'y', '\u0445': 'x', '\u0456': 'i', '\u0458': 'j', '\u04bb': 'h',
    '\u0455': 's', '\u0501': 'd', '\u0491': 'g', '\u0432': 'b', '\u043d': 'h',
    '\u043c': 'm', '\u0442': 't', '\u045e': 'u',
    # Greek
    '\u03b1': 'a', '\u03bf': 'o', '\u03bd': 'v', '\u03c1': 'p', '\u03c4': 't',
    '\u03b9': 'i', '\u03ba': 'k',
    # Other common visual lookalikes
    '\u0131': 'i', '\u0142': 'l', '\u00f8': 'o'
}


def canonicalize_leetspeak(text: str) -> str:
    """Normalize common leetspeak substitutions: y0utube -> youtube, paypa1 -> paypal."""
    res = []
    text_lower = text.lower()
    for char in text_lower:
        res.append(LEET_CHAR_MAP.get(char, char))
    s = "".join(res)
    # Common digraph substitutions
    s = s.replace("vv", "w").replace("rn", "m").replace("cl", "d")
    return s


def canonicalize_homoglyphs(text: str) -> Tuple[str, bool]:
    """
    Replace visual Unicode confusables with standard Latin characters.
    Returns: (canonical_text, has_confusables)
    """
    has_confusables = False
    res = []
    for char in text:
        if char in CONFUSABLES_MAP:
            res.append(CONFUSABLES_MAP[char])
            has_confusables = True
        else:
            res.append(char)
    canonical = "".join(res)
    # Also check NFKC normalization
    nfkc = unicodedata.normalize("NFKC", canonical)
    if nfkc != canonical:
        has_confusables = True
        canonical = nfkc
    return canonical, has_confusables


def extract_domain_parts(host: str) -> Tuple[str, str, List[str]]:
    """
    Extract registrable domain (eTLD+1), SLD (second-level domain), and all sub-tokens.
    Example: 'sub.y0utube.com' -> ('y0utube.com', 'y0utube', ['sub', 'y0utube'])
    """
    host = (host or "").lower().strip().strip(".")
    if not host:
        return "", "", []

    if _HAS_TLDEXTRACT:
        ext = tldextract.extract(host)
        if ext.domain and ext.suffix:
            reg_domain = f"{ext.domain}.{ext.suffix}"
            sld = ext.domain
            tokens = [t for t in (ext.subdomain.split(".") + [ext.domain]) if t]
            return reg_domain, sld, tokens

    # Intelligent Fallback without tldextract
    parts = host.split(".")
    if len(parts) >= 3:
        two_part = f"{parts[-2]}.{parts[-1]}"
        if two_part in COMMON_TWO_PART_TLDS and len(parts) >= 3:
            reg_domain = f"{parts[-3]}.{two_part}"
            sld = parts[-3]
            tokens = parts[:-2]
            return reg_domain, sld, tokens

    if len(parts) >= 2:
        reg_domain = f"{parts[-2]}.{parts[-1]}"
        sld = parts[-2]
        tokens = parts[:-1]
        return reg_domain, sld, tokens

    return host, host, [host]


def get_registrable_domain(host: str) -> str:
    """Extract registrable domain (e.g., example.com) from a hostname."""
    reg_domain, _, _ = extract_domain_parts(host)
    return reg_domain


def check_unicode_spoofing(url: str) -> bool:
    """
    Detect Unicode homoglyphs, Punycode spoofing, and mixed-script attacks.
    """
    try:
        url_lower = url.lower()
        if "xn--" in url_lower:
            return True
        _, has_confusables = canonicalize_homoglyphs(url)
        if has_confusables:
            return True
        if unicodedata.normalize("NFKC", url) != url:
            return True
        # Check for mixed script characters in domain
        from urllib.parse import urlparse
        parsed = urlparse(url if "://" in url else f"http://{url}")
        host = parsed.hostname or ""
        for char in host:
            code = ord(char)
            # Cyrillic range: U+0400 to U+04FF, Greek: U+0370 to U+03FF
            if (0x0400 <= code <= 0x04FF) or (0x0370 <= code <= 0x03FF):
                return True
        return False
    except Exception as e:
        logger.debug(f"check_unicode_spoofing error: {e}")
        return False


def detect_brand_impersonation(host: str) -> Tuple[bool, int, Optional[str]]:
    """
    Robust Brand Impersonation & Typosquatting Detection:
      - Direct Levenshtein comparison on SLD (eTLD+1 name)
      - Leetspeak canonicalization (e.g., y0utube -> youtube)
      - Homoglyph normalization
      - Token-level checking (e.g., youtube-verify.com, login.youtube.com.attacker.com)
    Returns: (is_impersonated: bool, min_distance: int, matched_brand: Optional[str])
    """
    reg_domain, sld, tokens = extract_domain_parts(host)
    if not sld:
        return False, 99, None

    # Step 1: Normalize homoglyphs and leetspeak
    clean_host, _ = canonicalize_homoglyphs(host)
    _, clean_sld, clean_tokens = extract_domain_parts(clean_host)
    leet_sld = canonicalize_leetspeak(clean_sld)

    best_distance = 99
    detected_brand = None

    for brand_key, official_domain in TOP_BRAND_MAP.items():
        # If this domain IS the official domain or subdomain of the official domain, it's legit
        if reg_domain == official_domain or host.endswith("." + official_domain):
            continue

        brand_len = len(brand_key)

        # Check A: Exact match via Leetspeak (e.g. y0utube -> youtube)
        if leet_sld == brand_key:
            return True, 1, brand_key

        # Check B: Leetspeak embedded in sub-tokens (e.g., login-y0utube-security)
        sub_tokens = []
        for t in clean_tokens:
            sub_tokens.extend(re.split(r"[-_]", t))
        for token in sub_tokens:
            token_leet = canonicalize_leetspeak(token)
            if token_leet == brand_key and reg_domain != official_domain:
                return True, 1, brand_key
            # Close Levenshtein distance on token
            dist_token = levenshtein_distance(token_leet, brand_key)
            if dist_token == 1 and brand_len >= 4:
                return True, 1, brand_key

        # Check C: Levenshtein distance on raw SLD vs brand name
        dist_raw = levenshtein_distance(clean_sld, brand_key)
        dist_leet = levenshtein_distance(leet_sld, brand_key)
        min_dist_brand = min(dist_raw, dist_leet)

        if min_dist_brand < best_distance:
            best_distance = min_dist_brand
            detected_brand = brand_key

        # Impersonation thresholds based on brand name length
        if brand_len <= 4:
            is_close = (min_dist_brand == 1)
        elif brand_len <= 7:
            is_close = (0 < min_dist_brand <= 2)
        else:
            is_close = (0 < min_dist_brand <= 3)

        if is_close and reg_domain != official_domain:
            return True, min_dist_brand, brand_key

    return False, best_distance, detected_brand


def min_brand_distance(domain: str) -> int:
    """Return minimum Levenshtein distance from `domain` to any TOP_BRAND."""
    _, dist, _ = detect_brand_impersonation(domain)
    return dist if dist != 99 else -1


def adversarial_url_flags(url: str) -> Dict[str, any]:
    """
    Compute comprehensive adversarial feature flags for a URL:
      - unicode_spoofing:     1 if URL contains homoglyph/punycode characters
      - brand_impersonation:  1 if domain mimics a top brand (typosquatting/leetspeak)
      - brand_min_distance:   raw distance score to nearest brand
      - matched_brand:        name of the targeted brand (e.g., 'youtube')
      - has_nested_url:       1 if URL-encoded redirect is present
    """
    from urllib.parse import urlparse
    try:
        url_normalized = unicodedata.normalize("NFKC", url.strip())
        parsed = urlparse(url_normalized if "://" in url_normalized else f"http://{url_normalized}")
        host = (parsed.hostname or "").lower()

        is_spoofed = check_unicode_spoofing(url)
        is_impersonated, brand_dist, matched_brand = detect_brand_impersonation(host)
        has_nested = bool(re.search(r'(https?%3A|%2F%2F)', url, re.IGNORECASE))

        return {
            "unicode_spoofing":    int(is_spoofed),
            "brand_impersonation": int(is_impersonated),
            "brand_min_distance":  brand_dist if brand_dist != 99 else -1,
            "matched_brand":       matched_brand if is_impersonated else None,
            "has_nested_url":      int(has_nested),
        }
    except Exception as e:
        logger.warning(f"adversarial_url_flags error for '{url}': {e}")
        return {
            "unicode_spoofing": 0,
            "brand_impersonation": 0,
            "brand_min_distance": -1,
            "matched_brand": None,
            "has_nested_url": 0,
        }


def extract_ical_urls(body: str) -> List[str]:
    """Extract all URLs from an iCalendar payload."""
    url_pattern = re.compile(r'https?://[^\s"<>]+')
    urls: List[str] = []
    try:
        import icalendar
        cal = icalendar.Calendar.from_ical(body.encode("utf-8", errors="replace"))
        for component in cal.walk():
            for field in ["DESCRIPTION", "URL", "LOCATION", "COMMENT", "SUMMARY"]:
                val = str(component.get(field, ""))
                urls.extend(url_pattern.findall(val))
    except Exception:
        urls = url_pattern.findall(body)
    return list(set(urls))


def check_email_ical_payload(msg) -> int:
    """Inspect email for suspicious iCalendar parts containing URLs."""
    try:
        for part in msg.walk():
            if part.get_content_type() == "text/calendar":
                ical_content = part.get_payload(decode=True)
                if ical_content:
                    decoded = ical_content.decode("utf-8", errors="ignore")
                    if extract_ical_urls(decoded):
                        return 1
    except Exception as e:
        logger.debug(f"iCal check failed: {e}")
    return 0


def check_pdf_xfa(content: bytes) -> int:
    """Return 1 if the raw PDF bytes contain an XFA form object."""
    return 1 if b"/XFA" in content else 0
