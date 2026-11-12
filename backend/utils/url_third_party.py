import os
import base64
import requests
from requests.exceptions import RequestException, Timeout
import logging
from typing import Dict
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")
load_dotenv()

logger = logging.getLogger(__name__)


VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
GOOGLE_SAFE_BROWSING_API_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")
URLSCAN_API_KEY = os.getenv("URLSCAN_API_KEY")
OTX_API_KEY = os.getenv("OTX_API_KEY")
APIVOID_API_KEY = os.getenv("APIVOID_API_KEY")


if not VIRUSTOTAL_API_KEY:
    logger.warning("VIRUSTOTAL_API_KEY is not set in environment variables!")
if not GOOGLE_SAFE_BROWSING_API_KEY:
    logger.warning("GOOGLE_SAFE_BROWSING_API_KEY is not set in environment variables!")
if not URLSCAN_API_KEY:
    logger.warning("URLSCAN_API_KEY is not set in environment variables!")
if not OTX_API_KEY:
    logger.warning("OTX_API_KEY is not set in environment variables!")


def check_virustotal(url: str) -> Dict[str, str]:
    
    if not VIRUSTOTAL_API_KEY:
        logger.error("Missing VirusTotal API key → cannot check URL")
        return {"status": "Error", "details": "VirusTotal API key not configured.", "color": "gray"}

    try:
        
        url_id = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")
        endpoint = f"https://www.virustotal.com/api/v3/urls/{url_id}"
        headers = {"x-apikey": VIRUSTOTAL_API_KEY}

        response = requests.get(endpoint, headers=headers, timeout=15)
        response.raise_for_status()

        data = response.json()
        stats = data["data"]["attributes"]["last_analysis_stats"]
        malicious = stats.get("malicious", 0)

        if malicious > 0:
            return {
                "status": "Dangerous",
                "details": f"{malicious} engines flagged this URL as malicious.",
                "color": "red"
            }
        else:
            return {
                "status": "Safe",
                "details": "No malicious detections.",
                "color": "green"
            }

    except requests.exceptions.HTTPError as http_err:
        if response.status_code == 404:
            
            logger.info(f"URL '{url}' not found in VirusTotal → submitting for scan")
            try:
                submit_endpoint = "https://www.virustotal.com/api/v3/urls"
                submit_data = {"url": url}
                submit_response = requests.post(
                    submit_endpoint,
                    headers=headers,
                    data=submit_data,
                    timeout=15
                )
                submit_response.raise_for_status()
                return {
                    "status": "Processing",
                    "details": "URL submitted for analysis. Results may take a few minutes.",
                    "color": "yellow"
                }
            except Exception as submit_err:
                logger.error(f"Failed to submit URL '{url}' to VirusTotal: {submit_err}")
                return {"status": "Error", "details": "Unable to submit URL for scanning.", "color": "gray"}
        else:
            logger.error(f"HTTP error checking VirusTotal for '{url}': {http_err} (code: {response.status_code})")
            return {"status": "Error", "details": f"VirusTotal error: {response.status_code}", "color": "gray"}

    except Timeout:
        logger.error(f"Timeout checking VirusTotal for '{url}'")
        return {"status": "Error", "details": "Timeout connecting to VirusTotal.", "color": "orange"}

    except Exception as e:
        logger.exception(f"Unexpected error checking VirusTotal for '{url}': {e}")
        return {"status": "Error", "details": "Unable to check VirusTotal.", "color": "gray"}


def check_urlscan(domain: str) -> Dict[str, str]:
    """
    Check domain or URL reputation using urlscan.io Community API.
    Returns: {"status": "Safe" | "Dangerous" | "Error", "details": str, "color": str}
    """
    if not URLSCAN_API_KEY:
        logger.error("Missing urlscan.io API key → cannot check domain")
        return {"status": "Error", "details": "urlscan.io API key not configured.", "color": "gray"}

    clean_domain = domain.split(":")[0].strip().lower()
    try:
        clean_domain = clean_domain.encode("idna").decode("ascii")
    except Exception:
        pass

    try:
        endpoint = f'https://urlscan.io/api/v1/search/?q=page.domain:"{clean_domain}"&size=1'
        headers = {
            "API-Key": URLSCAN_API_KEY,
            "Content-Type": "application/json"
        }

        response = requests.get(endpoint, headers=headers, timeout=8)

        if response.status_code in (401, 403):
            logger.warning(f"urlscan.io authorization error ({response.status_code}): {response.text}")
            return {"status": "Error", "details": "urlscan.io API key invalid or expired.", "color": "gray"}

        response.raise_for_status()
        data = response.json()
        results = data.get("results", [])

        if results:
            result_api = results[0].get("result")
            if result_api:
                # Fetch detailed verdict for this domain scan
                r_detail = requests.get(result_api, headers=headers, timeout=8)
                if r_detail.status_code == 200:
                    verdicts = r_detail.json().get("verdicts", {}).get("overall", {})
                    is_malicious = verdicts.get("malicious", False)
                    score = verdicts.get("score", 0)
                    categories = verdicts.get("categories", [])

                    if is_malicious or score > 50:
                        return {
                            "status": "Dangerous",
                            "details": f"Flagged on urlscan.io (Score: {score}, Categories: {categories}).",
                            "color": "red"
                        }
                    else:
                        return {
                            "status": "Safe",
                            "details": f"Clean reputation on urlscan.io (Score: {score}).",
                            "color": "green"
                        }

        # No negative history found in urlscan.io
        return {
            "status": "Safe",
            "details": "No threats reported on urlscan.io.",
            "color": "green"
        }

    except Timeout:
        logger.warning(f"Timeout checking urlscan.io for domain '{domain}'")
        return {"status": "Error", "details": "Timeout connecting to urlscan.io.", "color": "orange"}

    except Exception as e:
        logger.warning(f"Error checking urlscan.io for domain '{domain}': {e}")
        return {"status": "Error", "details": "Unable to check urlscan.io.", "color": "gray"}


def check_alienvault_otx(domain: str) -> Dict[str, str]:
    """
    Check domain threat intelligence using AlienVault OTX (Open Threat Exchange).
    Returns: {"status": "Safe" | "Dangerous" | "Error", "details": str, "color": str}
    """
    if not OTX_API_KEY:
        logger.error("Missing AlienVault OTX API key → cannot check domain")
        return {"status": "Error", "details": "AlienVault OTX API key not configured.", "color": "gray"}

    clean_domain = domain.split(":")[0].strip().lower()
    try:
        clean_domain = clean_domain.encode("idna").decode("ascii")
    except Exception:
        pass

    try:
        endpoint = f"https://otx.alienvault.com/api/v1/indicators/domain/{clean_domain}/general"
        headers = {"X-OTX-API-KEY": OTX_API_KEY}

        response = requests.get(endpoint, headers=headers, timeout=8)

        if response.status_code in (401, 403):
            logger.warning(f"AlienVault OTX auth error ({response.status_code}): {response.text}")
            return {"status": "Error", "details": "AlienVault OTX API key invalid or expired.", "color": "gray"}

        if response.status_code == 404:
            return {
                "status": "Safe",
                "details": "Clean reputation on AlienVault OTX (No threat record).",
                "color": "green"
            }

        response.raise_for_status()
        data = response.json()

        # Check Whitelist in Validation
        validation = data.get("validation", [])
        is_whitelisted = any("whitelist" in str(v).lower() or "alexa" in str(v).lower() for v in validation)

        pulse_info = data.get("pulse_info", {})
        count = pulse_info.get("count", 0)

        # Check for specific malicious pulses (phishing, malware, etc.)
        malicious_pulses = []
        threat_tags = {"phishing", "malware", "ransomware", "c2", "trojan", "exploit", "credential"}
        for p in pulse_info.get("pulses", []):
            tags = {t.lower() for t in p.get("tags", [])}
            name = p.get("name", "").lower()
            if tags.intersection(threat_tags) or any(t in name for t in threat_tags):
                malicious_pulses.append(p.get("name"))

        if malicious_pulses and not is_whitelisted:
            return {
                "status": "Dangerous",
                "details": f"Flagged in {len(malicious_pulses)} threat pulse(s) on AlienVault OTX.",
                "color": "red"
            }
        elif count > 3 and not is_whitelisted:
            return {
                "status": "Dangerous",
                "details": f"Reported in {count} threat pulse(s) on AlienVault OTX.",
                "color": "red"
            }
        else:
            return {
                "status": "Safe",
                "details": "Clean reputation on AlienVault OTX (No threat pulses).",
                "color": "green"
            }

    except Timeout:
        logger.warning(f"Timeout checking AlienVault OTX for domain '{domain}'")
        return {"status": "Error", "details": "Timeout connecting to AlienVault OTX.", "color": "orange"}

    except Exception as e:
        logger.warning(f"Error checking AlienVault OTX for domain '{domain}': {e}")
        return {"status": "Error", "details": "Unable to check AlienVault OTX.", "color": "gray"}


# Alias for backward compatibility
check_urlvoid = check_urlscan


def check_google_safe_browsing(url: str) -> Dict[str, str]:
    
    if not GOOGLE_SAFE_BROWSING_API_KEY:
        logger.error("Missing Google Safe Browsing API key → cannot check URL")
        return {"status": "Error", "details": "Google Safe Browsing API key not configured.", "color": "gray"}

    try:
        endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GOOGLE_SAFE_BROWSING_API_KEY}"
        payload = {
            "client": {
                "clientId": "URLPhishingChecker",
                "clientVersion": "1.0.0"
            },
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}]
            }
        }

        response = requests.post(endpoint, json=payload, timeout=10)
        response.raise_for_status()

        data = response.json()
        if "matches" in data and data["matches"]:
            threat_types = ", ".join(match["threatType"] for match in data["matches"])
            return {
                "status": "Dangerous",
                "details": f"Detected threats: {threat_types}",
                "color": "red"
            }
        else:
            return {
                "status": "Safe",
                "details": "No threats detected by Google Safe Browsing.",
                "color": "green"
            }

    except Timeout:
        logger.error(f"Timeout checking Google Safe Browsing for '{url}'")
        return {"status": "Error", "details": "Timeout connecting to Google Safe Browsing.", "color": "orange"}

    except Exception as e:
        logger.exception(f"Error checking Google Safe Browsing for '{url}': {e}")
        return {"status": "Error", "details": "Unable to check Google Safe Browsing.", "color": "gray"}