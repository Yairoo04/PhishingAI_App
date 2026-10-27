import os
import base64
import requests
from requests.exceptions import RequestException, Timeout
import logging
from typing import Dict
from dotenv import load_dotenv


load_dotenv()

logger = logging.getLogger(__name__)


VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
GOOGLE_SAFE_BROWSING_API_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")
APIVOID_API_KEY = os.getenv("APIVOID_API_KEY")


if not VIRUSTOTAL_API_KEY:
    logger.warning("VIRUSTOTAL_API_KEY is not set in environment variables!")
if not GOOGLE_SAFE_BROWSING_API_KEY:
    logger.warning("GOOGLE_SAFE_BROWSING_API_KEY is not set in environment variables!")
if not APIVOID_API_KEY:
    logger.warning("APIVOID_API_KEY is not set in environment variables!")


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


def check_urlvoid(domain: str) -> Dict[str, str]:
    
    if not APIVOID_API_KEY:
        logger.error("Missing APIVoid API key → cannot check domain")
        return {"status": "Error", "details": "APIVoid API key not configured.", "color": "gray"}

    try:
        endpoint = f"https://endpoint.apivoid.com/urlrep/v1/pay-as-you-go/?key={APIVOID_API_KEY}&host={domain}"
        response = requests.get(endpoint, timeout=15)
        response.raise_for_status()

        data = response.json()
        detections = data.get("data", {}).get("report", {}).get("blacklists", {}).get("detections", 0)

        if detections > 0:
            return {
                "status": "Dangerous",
                "details": f"Detected on {detections} blacklists.",
                "color": "red"
            }
        else:
            return {
                "status": "Safe",
                "details": "No blacklists found.",
                "color": "green"
            }

    except Timeout:
        logger.error(f"Timeout checking URLVoid for domain '{domain}'")
        return {"status": "Error", "details": "Timeout connecting to URLVoid.", "color": "orange"}

    except Exception as e:
        logger.exception(f"Error checking URLVoid for domain '{domain}': {e}")
        return {"status": "Error", "details": "Unable to check URLVoid.", "color": "gray"}


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